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

import { 
  INITIAL_PRODUCTS, 
  INITIAL_ORDERS, 
  INITIAL_INSIGHTS, 
  INITIAL_TRENDS, 
  INITIAL_CAMPAIGNS,
  INITIAL_INGREDIENTS,
  INITIAL_RECIPES,
  INITIAL_WASTAGE
} from './mockData';
import { MenuItem, Order, StoreInsight, DailyTrend, MarketingCampaign, Ingredient, RecipeIngredient, WastageLog } from './types';
import { AlertCircle } from 'lucide-react';

export default function App() {
  // Shared global state
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
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

  // Automated stock deduction on order status transition to Completed
  useEffect(() => {
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

  }, [orders, deductedOrderIds, recipes, ingredients]);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      
      {/* Header bar */}
      <Header 
        storeActive={storeActive} 
        setStoreActive={setStoreActive} 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
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

          {currentTab === 'reports' && (
            <div className="animate-fade-in">
              <Reports 
                orders={orders}
                setOrders={setOrders}
                products={products}
                trends={trends}
              />
            </div>
          )}


        </div>
      </main>

      {/* Bottom Navigation Bar for Mobile */}
      <BottomNavBar currentTab={currentTab} setCurrentTab={setCurrentTab} />

    </div>
  );
}
