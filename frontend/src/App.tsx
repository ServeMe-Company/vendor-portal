/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import BottomNavBar from './components/BottomNavBar';
import Dashboard from './components/Dashboard';
import Catalog from './components/Catalog';
import Reports from './components/Reports';
import Inventory from './components/Inventory';
import TableManagement from './components/TableManagement';
import ServiceRequests from './components/ServiceRequests';
import TaxSettingsModal from './components/TaxSettingsModal';

import { 
  INITIAL_PRODUCTS, 
  INITIAL_ORDERS, 
  INITIAL_INSIGHTS, 
  INITIAL_TRENDS, 
  INITIAL_CAMPAIGNS,
  INITIAL_INGREDIENTS,
  INITIAL_RECIPES,
  INITIAL_WASTAGE,
  INITIAL_PAYMENT_MODES
} from './mockData';
import { MenuItem, Order, StoreInsight, DailyTrend, MarketingCampaign, Ingredient, RecipeIngredient, WastageLog, PaymentMode } from './types';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function App() {
  // Shared global state
  const [currentTab, setCurrentTab] = useState<string>('reports');
  const [storeActive, setStoreActive] = useState<boolean>(true);
  
  const [products, setProducts] = useState<MenuItem[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [insights, setInsights] = useState<StoreInsight[]>(INITIAL_INSIGHTS);
  const [trends, setTrends] = useState<DailyTrend[]>(INITIAL_TRENDS);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(INITIAL_CAMPAIGNS);

  // Kitchen Inventory extensions states
  const [ingredients, setIngredients] = useState<Ingredient[]>(INITIAL_INGREDIENTS);
  const [recipes, setRecipes] = useState<RecipeIngredient[]>(INITIAL_RECIPES);
  const [wastageLogs, setWastageLogs] = useState<WastageLog[]>(INITIAL_WASTAGE);
  const [deductedOrderIds, setDeductedOrderIds] = useState<string[]>(['#ORD-8290', '#ORD-8289']); // Pre-completed seed orders already deducted

  // Payment modes & Tax Settings state
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>(INITIAL_PAYMENT_MODES);
  const [isTaxSettingsOpen, setIsTaxSettingsOpen] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load state from DB on mount with automatic retries
  const loadState = (retries = 3, delay = 800) => {
    setLoading(true);
    setLoadError(null);

    const attemptFetch = (attempt: number) => {
      fetch('/api/db')
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data && Object.keys(data).length > 0) {
            if (data.products) setProducts(data.products);
            if (data.orders) setOrders(data.orders);
            if (data.insights) setInsights(data.insights);
            if (data.trends) setTrends(data.trends);
            if (data.campaigns) setCampaigns(data.campaigns);
            if (data.ingredients) setIngredients(data.ingredients);
            if (data.recipes) setRecipes(data.recipes);
            if (data.wastageLogs) setWastageLogs(data.wastageLogs);
            if (typeof data.storeActive === 'boolean') setStoreActive(data.storeActive);
            if (data.deductedOrderIds) setDeductedOrderIds(data.deductedOrderIds);
            if (data.paymentModes) setPaymentModes(data.paymentModes);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.warn(`Database load attempt ${attempt} failed:`, err);
          if (attempt < retries) {
            setTimeout(() => attemptFetch(attempt + 1), delay);
          } else {
            console.error("All database load attempts failed. Ready for offline use.", err);
            setLoadError(err.message || "Failed to fetch database");
            setLoading(false);
          }
        });
    };

    attemptFetch(1);
  };

  useEffect(() => {
    loadState();
  }, []);

  // Real-time live synchronization for kitchen & order status updates
  useEffect(() => {
    let isMounted = true;

    const syncLiveDatabase = async () => {
      try {
        const res = await fetch('/api/db');
        if (!res.ok) return;
        const data = await res.json();

        if (isMounted && data && Array.isArray(data.orders)) {
          setOrders(prevOrders => {
            const currentStr = JSON.stringify(prevOrders);
            const nextStr = JSON.stringify(data.orders);
            if (currentStr !== nextStr) {
              return data.orders;
            }
            return prevOrders;
          });
        }
      } catch (err) {
        console.debug('Live sync check:', err);
      }
    };

    const intervalId = setInterval(syncLiveDatabase, 3000);
    window.addEventListener('focus', syncLiveDatabase);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', syncLiveDatabase);
    };
  }, []);

  // Save state to DB on modification
  useEffect(() => {
    if (loading || loadError) return;

    const stateToSave = {
      products,
      orders,
      insights,
      trends,
      campaigns,
      ingredients,
      recipes,
      wastageLogs,
      storeActive,
      deductedOrderIds,
      paymentModes
    };

    const handler = setTimeout(() => {
      fetch('/api/db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stateToSave)
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.success) {
            console.error("Failed to sync state to database file");
          }
        })
        .catch((err) => {
          console.error("Error syncing state to DB:", err);
        });
    }, 600);

    return () => clearTimeout(handler);
  }, [
    loading,
    products,
    orders,
    insights,
    trends,
    campaigns,
    ingredients,
    recipes,
    wastageLogs,
    storeActive,
    deductedOrderIds,
    paymentModes
  ]);

  // Automated stock deduction on order status transition to Completed
  useEffect(() => {
    if (loading) return; // Wait for initial load before running deduction triggers
    const pendingDeductions = orders.filter(
      (order) => order.status === 'Completed' && !deductedOrderIds.includes(order.id)
    );

    if (pendingDeductions.length === 0) return;

    // Deduct stock for these order items
    setIngredients((prevIngredients) => {
      let updatedIngredients = [...prevIngredients];

      pendingDeductions.forEach((order) => {
        order.items.forEach((item) => {
          const itemRecipes = recipes.filter((r) => r.productId === item.productId);
          itemRecipes.forEach((recipe) => {
            updatedIngredients = updatedIngredients.map((ing) => {
              if (ing.id === recipe.ingredientId) {
                const deduction = recipe.quantityRequired * item.quantity;
                const nextStock = Math.max(0, ing.currentStock - deduction);
                return { ...ing, currentStock: nextStock };
              }
              return ing;
            });
          });
        });
      });

      return updatedIngredients;
    });

    // Mark as deducted
    const newDeductedIds = pendingDeductions.map((o) => o.id);
    setDeductedOrderIds((prev) => [...prev, ...newDeductedIds]);

    // Create insights for newly low stock ingredients
    pendingDeductions.forEach((order) => {
      order.items.forEach((item) => {
        const itemRecipes = recipes.filter((r) => r.productId === item.productId);
        itemRecipes.forEach((recipe) => {
          setInsights((prevInsights) => {
            const ingObj = ingredients.find(i => i.id === recipe.ingredientId);
            if (!ingObj) return prevInsights;

            const deduction = recipe.quantityRequired * item.quantity;
            const finalStock = ingObj.currentStock - deduction;

            const alreadyWarned = prevInsights.some(ins => ins.message.includes(ingObj.name));
            if (finalStock <= ingObj.reorderLevel && !alreadyWarned) {
              const newInsight: StoreInsight = {
                id: `ins-low-${ingObj.id}-${Date.now()}`,
                icon: 'warning',
                message: `Inventory alert: Raw stock of '${ingObj.name}' is running low (${Math.max(0, finalStock)} ${ingObj.unit} left).`,
                type: 'warning'
              };
              return [newInsight, ...prevInsights];
            }
            return prevInsights;
          });
        });
      });
    });

  }, [orders, deductedOrderIds, recipes, ingredients, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-on-surface">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-sm font-medium tracking-wide text-muted-foreground animate-pulse">
          Connecting to shop database...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6 select-none">
        <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-3xl shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Database Connection Failed</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              We encountered an issue while connecting to the shop database. The local development server might still be booting or initializing.
            </p>
            <div className="bg-slate-50 text-slate-600 font-mono text-[11px] p-2 rounded-lg border border-slate-100 overflow-x-auto text-left max-h-24">
              {loadError}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => loadState(3, 800)}
              className="py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Retry Connection
            </button>
            <button
              onClick={() => setLoadError(null)}
              className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer"
            >
              Proceed Offline
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface">
      
      {/* Header bar */}
      <Header 
        storeActive={storeActive} 
        setStoreActive={setStoreActive} 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        onOpenTaxSettings={() => setIsTaxSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="min-h-screen transition-all pt-20 pb-24 max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Inactive store notification banner */}
        {!storeActive && (
          <div className="fixed top-16 left-0 w-full z-30 bg-amber-500 text-amber-950 px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 border-b border-amber-600 shadow-sm animate-fade-in">
            <AlertCircle className="w-4 h-4" />
            <span>Store status is INACTIVE. Table ordering & incoming customer checkouts are currently paused.</span>
          </div>
        )}

        {/* Tab view containers */}
        <div className={`transition-all ${!storeActive ? 'pt-10' : ''}`}>
          {currentTab === 'dashboard' && (
            <div className="animate-fade-in">
              <Dashboard 
                orders={orders}
                setOrders={setOrders}
                products={products}
                setProducts={setProducts}
                insights={insights}
                setInsights={setInsights}
                trends={trends}
                campaigns={campaigns}
                setCampaigns={setCampaigns}
                setCurrentTab={setCurrentTab}
              />
            </div>
          )}

          {currentTab === 'catalog' && (
            <div className="animate-fade-in">
              <Catalog 
                products={products}
                setProducts={setProducts}
              />
            </div>
          )}

          {currentTab === 'inventory' && (
            <div className="animate-fade-in">
              <Inventory 
                ingredients={ingredients}
                setIngredients={setIngredients}
                recipes={recipes}
                wastageLogs={wastageLogs}
                setWastageLogs={setWastageLogs}
                products={products}
              />
            </div>
          )}

          {currentTab === 'tables' && (
            <div className="animate-fade-in">
              <TableManagement />
            </div>
          )}

          {currentTab === 'requests' && (
            <div className="animate-fade-in">
              <ServiceRequests />
            </div>
          )}

          {currentTab === 'reports' && (
            <div className="animate-fade-in">
              <Reports 
                orders={orders}
                setOrders={setOrders}
                products={products}
                trends={trends}
                onOpenTaxSettings={() => setIsTaxSettingsOpen(true)}
              />
            </div>
          )}


        </div>
      </main>

      {/* Bottom Navigation Bar for Mobile */}
      <BottomNavBar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Tax & Charges Settings Edit Modal */}
      <TaxSettingsModal 
        isOpen={isTaxSettingsOpen} 
        onClose={() => setIsTaxSettingsOpen(false)} 
      />

    </div>
  );
}
