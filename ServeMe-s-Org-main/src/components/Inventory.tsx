import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  History, 
  Sparkles, 
  TrendingDown, 
  Scale, 
  Layers, 
  ClipboardList, 
  ChevronRight,
  BookmarkCheck,
  Truck,
  Trash2,
  ShoppingCart,
  X,
  FileText,
  Check,
  ShoppingBag
} from 'lucide-react';
import { Ingredient, RecipeIngredient, WastageLog, MenuItem } from '../types';

export const getIngredientCapacity = (ing: Ingredient): number => {
  switch (ing.id) {
    case 'ing-1': return 50; // Pork Tonkotsu Broth Base (current 45, reorder 15)
    case 'ing-2': return 15000; // Ramen Wheat Noodles (current 12500, reorder 4000)
    case 'ing-3': return 200; // Chashu Pork Slices (current 180, reorder 50)
    case 'ing-4': return 100; // Ramen Soft Eggs (current 64, reorder 24)
    case 'ing-5': return 4000; // Japanese Curry Roux (current 3200, reorder 1000)
    case 'ing-6': return 50; // Chicken Cutlet Breast (current 35, reorder 12)
    case 'ing-7': return 500; // Gyoza Wrapper Sheets (current 320, reorder 100)
    case 'ing-8': return 6000; // Minced Pork Filling (current 4800, reorder 1500)
    case 'ing-9': return 1500; // Premium Matcha Powder (current 1200, reorder 400)
    case 'ing-10': return 2000; // Boba Tapioca Pearls (current 180, reorder 1500)
    case 'ing-11': return 40; // Organic Whole Milk (current 28, reorder 8)
    default: return ing.reorderLevel > 0 ? ing.reorderLevel * 3 : 100;
  }
};

interface InventoryProps {
  ingredients: Ingredient[];
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  recipes: RecipeIngredient[];
  wastageLogs: WastageLog[];
  setWastageLogs: React.Dispatch<React.SetStateAction<WastageLog[]>>;
  products: MenuItem[];
}

export default function Inventory({
  ingredients,
  setIngredients,
  recipes,
  wastageLogs,
  setWastageLogs,
  products
}: InventoryProps) {
  // Local UI State
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'recipes' | 'wastage' | 'pos'>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Simulated Purchase Orders State
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [notification, setNotification] = useState<{
    id: string;
    message: string;
    poId: string;
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    totalCost: number;
    timestamp: string;
    isBatch?: boolean;
    poIds?: string[];
  } | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [unselectedRestockIds, setUnselectedRestockIds] = useState<Record<string, boolean>>({});
  const [manuallyAddedRestockIds, setManuallyAddedRestockIds] = useState<string[]>([]);
  const [restockQuantities, setRestockQuantities] = useState<Record<string, number>>({});
  const [isBatchReordering, setIsBatchReordering] = useState(false);

  const handleQuickReorder = (ing: Ingredient) => {
    setReorderingId(ing.id);
    
    // Simulate a network delay (800ms) to make the simulation feel extremely realistic
    setTimeout(() => {
      const suggestedQty = ing.reorderLevel > 0 ? ing.reorderLevel * 2 : 100;
      const totalCost = suggestedQty * ing.costPerUnit;
      const poId = `PO-${Math.floor(100000 + Math.random() * 900000)}`;
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newPO = {
        id: poId,
        ingredientId: ing.id,
        ingredientName: ing.name,
        quantity: suggestedQty,
        unit: ing.unit,
        totalCost: totalCost,
        status: 'Pending Delivery', // 'Pending Delivery' | 'Received'
        timestamp: timestamp
      };

      setPurchaseOrders(prev => [newPO, ...prev]);
      setReorderingId(null);

      setNotification({
        id: `${Date.now()}`,
        message: `Simulated Purchase Order ${poId} generated and transmitted to supplier!`,
        poId,
        ingredientId: ing.id,
        ingredientName: ing.name,
        quantity: suggestedQty,
        unit: ing.unit,
        totalCost,
        timestamp
      });
    }, 850);
  };

  const handleReceivePO = (poId: string) => {
    if (poId === 'BATCH' && notification?.isBatch && notification.poIds) {
      const poIdsToReceive = notification.poIds;
      
      setIngredients(prev => {
        let updated = [...prev];
        poIdsToReceive.forEach(id => {
          const po = purchaseOrders.find(p => p.id === id);
          if (po && po.status !== 'Received') {
            updated = updated.map(ing => {
              if (ing.id === po.ingredientId) {
                return { ...ing, currentStock: ing.currentStock + po.quantity };
              }
              return ing;
            });
          }
        });
        return updated;
      });

      setPurchaseOrders(prev => prev.map(p => {
        if (poIdsToReceive.includes(p.id)) {
          return { ...p, status: 'Received' };
        }
        return p;
      }));

      setNotification(null);
      return;
    }

    const po = purchaseOrders.find(p => p.id === poId);
    if (!po || po.status === 'Received') return;

    // Add stock to the ingredient
    setIngredients(prev => prev.map(ing => {
      if (ing.id === po.ingredientId) {
        return { ...ing, currentStock: ing.currentStock + po.quantity };
      }
      return ing;
    }));

    // Update PO status to Received
    setPurchaseOrders(prev => prev.map(p => {
      if (p.id === poId) {
        return { ...p, status: 'Received' };
      }
      return p;
    }));

    // Show a follow-up notification or clear existing
    setNotification(prev => {
      if (prev?.poId === poId) {
        return null;
      }
      return prev;
    });
  };

  const handleBatchReorder = (itemsToReorder: Ingredient[]) => {
    if (itemsToReorder.length === 0) return;
    setIsBatchReordering(true);

    // Network delay simulation for batch reordering
    setTimeout(() => {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newPOs: any[] = [];
      let totalBatchCost = 0;
      let totalItemsCount = 0;

      itemsToReorder.forEach(ing => {
        const suggestedQty = restockQuantities[ing.id] !== undefined ? restockQuantities[ing.id] : (ing.reorderLevel > 0 ? ing.reorderLevel * 2 : 100);
        const totalCost = suggestedQty * ing.costPerUnit;
        const poId = `PO-${Math.floor(100000 + Math.random() * 900000)}`;

        newPOs.push({
          id: poId,
          ingredientId: ing.id,
          ingredientName: ing.name,
          quantity: suggestedQty,
          unit: ing.unit,
          totalCost: totalCost,
          status: 'Pending Delivery',
          timestamp: timestamp
        });

        totalBatchCost += totalCost;
        totalItemsCount += suggestedQty;
      });

      setPurchaseOrders(prev => [...newPOs, ...prev]);
      setIsBatchReordering(false);
      setUnselectedRestockIds({});
      setManuallyAddedRestockIds([]);
      setRestockQuantities({});

      setNotification({
        id: `${Date.now()}`,
        message: `Simulated Batch Purchase Orders generated for ${newPOs.length} ingredients and transmitted to suppliers!`,
        poId: 'BATCH',
        ingredientId: 'BATCH',
        ingredientName: `${newPOs.length} low-stock ingredients`,
        quantity: totalItemsCount,
        unit: 'units',
        totalCost: totalBatchCost,
        timestamp,
        isBatch: true,
        poIds: newPOs.map(p => p.id)
      });
    }, 1000);
  };

  // Recipe sub-tab local state
  const [selectedProductRecipe, setSelectedProductRecipe] = useState<string>(products[0]?.id || '');

  // Add/Adjust stock state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustIngredientId, setAdjustIngredientId] = useState('');
  const [adjustQuantity, setAdjustQuantity] = useState<number>(100);
  const [adjustType, setAdjustType] = useState<'Replenish' | 'Audit Correct'>('Replenish');

  // Quick Add Delivery state
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [quickAddIngredientId, setQuickAddIngredientId] = useState('');
  const [quickAddQuantity, setQuickAddQuantity] = useState<number>(100);
  const [quickAddSupplier, setQuickAddSupplier] = useState('Global Foods Ltd');
  const [quickAddInvoice, setQuickAddInvoice] = useState('');
  const [quickAddSuccessToast, setQuickAddSuccessToast] = useState<string | null>(null);

  // Log wastage state
  const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);
  const [wasteIngredientId, setWasteIngredientId] = useState('');
  const [wasteQuantity, setWasteQuantity] = useState<number>(10);
  const [wasteReason, setWasteReason] = useState<'Spillage' | 'Expired' | 'Burnt/Ruined' | 'Dropped'>('Expired');
  const [wasteLoggedBy, setWasteLoggedBy] = useState('');

  // Categories list
  const ingredientCategories = ['All', 'Dry Goods', 'Fresh Produce', 'Proteins', 'Dairy & Liquids', 'Packaging'];

  // Total inventory value calculation
  const totalValue = ingredients.reduce((sum, ing) => sum + (ing.currentStock * ing.costPerUnit), 0);
  const lowStockItems = ingredients.filter(ing => ing.currentStock <= ing.reorderLevel);
  const restockPlannerItems = [
    ...lowStockItems,
    ...ingredients.filter(ing => manuallyAddedRestockIds.includes(ing.id) && !lowStockItems.some(l => l.id === ing.id))
  ];

  // Filtered ingredients for view
  const filteredIngredients = ingredients.filter(ing => {
    const matchesCategory = categoryFilter === 'All' || ing.category === categoryFilter;
    const matchesSearch = ing.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ing.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle stock adjustments (manual restocking or audit corrections)
  const handleAdjustStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustIngredientId || adjustQuantity <= 0) return;

    setIngredients(prev => prev.map(ing => {
      if (ing.id === adjustIngredientId) {
        const nextStock = adjustType === 'Replenish' 
          ? ing.currentStock + adjustQuantity 
          : adjustQuantity; // Audit override
        return { ...ing, currentStock: nextStock };
      }
      return ing;
    }));

    setIsAdjustModalOpen(false);
    setAdjustIngredientId('');
  };

  // Handle logging a quick ingredient delivery and updating stock levels instantly
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddIngredientId || quickAddQuantity <= 0) return;

    const ing = ingredients.find(i => i.id === quickAddIngredientId);
    if (!ing) return;

    // 1. Update stock level instantly
    setIngredients(prev => prev.map(item => {
      if (item.id === quickAddIngredientId) {
        return { ...item, currentStock: item.currentStock + quickAddQuantity };
      }
      return item;
    }));

    // 2. Add to Simulated Purchase Orders as "Received"
    const poId = quickAddInvoice || `PO-DEL-${Math.floor(100000 + Math.random() * 900000)}`;
    const totalCost = quickAddQuantity * ing.costPerUnit;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newPO = {
      id: poId,
      ingredientId: ing.id,
      ingredientName: ing.name,
      quantity: quickAddQuantity,
      unit: ing.unit,
      totalCost: totalCost,
      status: 'Received',
      timestamp: timestamp,
      supplier: quickAddSupplier || 'Global Foods Ltd'
    };

    setPurchaseOrders(prev => [newPO, ...prev]);

    // 3. Show success toast
    setQuickAddSuccessToast(`Logged delivery of ${quickAddQuantity} ${ing.unit} of ${ing.name} successfully!`);
    setTimeout(() => {
      setQuickAddSuccessToast(null);
    }, 4000);

    // 4. Reset form & close modal
    setIsQuickAddModalOpen(false);
  };

  // Handle logging kitchen wastage manually
  const handleLogWastageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasteIngredientId || wasteQuantity <= 0) return;

    const ing = ingredients.find(i => i.id === wasteIngredientId);
    if (!ing) return;

    // 1. Deduct stock
    setIngredients(prev => prev.map(i => {
      if (i.id === wasteIngredientId) {
        const nextStock = Math.max(0, i.currentStock - wasteQuantity);
        return { ...i, currentStock: nextStock };
      }
      return i;
    }));

    // 2. Add log entry
    const newLog: WastageLog = {
      id: `wast-${Date.now()}`,
      ingredientId: wasteIngredientId,
      ingredientName: ing.name,
      quantity: wasteQuantity,
      unit: ing.unit,
      reason: wasteReason,
      timestamp: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      loggedBy: wasteLoggedBy || 'Kitchen Terminal'
    };

    setWastageLogs(prev => [newLog, ...prev]);
    setIsWastageModalOpen(false);
    setWasteIngredientId('');
    setWasteLoggedBy('');
  };

  // Recipe calculation per selected menu product
  const currentRecipeItems = recipes.filter(r => r.productId === selectedProductRecipe);
  const selectedProductObj = products.find(p => p.id === selectedProductRecipe);

  const pendingPOsCount = purchaseOrders.filter(p => p.status === 'Pending Delivery').length;

  return (
    <div className="pt-20 pb-24 md:pb-8 max-w-7xl mx-auto px-4 md:px-8 select-none">
      
      {/* Quick Add Success Toast */}
      {quickAddSuccessToast && (
        <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-900 p-4 rounded-r-lg shadow-md flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-1.5 rounded-full text-emerald-600">
              <CheckCircle2 className="w-5 h-5 animate-bounce" />
            </div>
            <p className="text-sm font-semibold">{quickAddSuccessToast}</p>
          </div>
          <button 
            type="button"
            onClick={() => setQuickAddSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 p-1 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Real-time Simulated PO Notification Toast */}
      {notification && (
        <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-900 p-4 rounded-r-lg shadow-md flex items-start justify-between gap-4 animate-fade-in relative">
          <div className="flex gap-3">
            <div className="bg-emerald-100 p-2 rounded-full text-emerald-600 mt-0.5">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                Simulated Purchase Order Generated!
                <span className="bg-emerald-200 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                  {notification.poId}
                </span>
              </h4>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                Reordered <span className="font-bold">{notification.quantity.toLocaleString()} {notification.unit}</span> of <span className="font-bold">{notification.ingredientName}</span> for <span className="font-bold">₹{notification.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>.
              </p>
              <div className="flex gap-2.5 mt-3">
                <button
                  type="button"
                  onClick={() => handleReceivePO(notification.poId)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Simulate Delivery & Receive Stock
                </button>
                <button
                  type="button"
                  onClick={() => setNotification(null)}
                  className="bg-transparent hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2.5 py-1.5 rounded transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setNotification(null)}
            className="text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 p-1.5 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-on-surface font-headline-md">Kitchen Inventory Management</h2>
          <p className="text-xs font-medium text-on-surface-variant font-label-sm">
            Track raw stock consumption, manage recipe relationships, and log wastage real-time
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              if (ingredients.length > 0) {
                setQuickAddIngredientId(ingredients[0].id);
                setQuickAddQuantity(100);
                setQuickAddSupplier('Global Foods Ltd');
                setQuickAddInvoice(`DEL-${Math.floor(100000 + Math.random() * 900000)}`);
                setIsQuickAddModalOpen(true);
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Quick Add Delivery
          </button>

          <button
            onClick={() => {
              if (ingredients.length > 0) {
                setAdjustIngredientId(ingredients[0].id);
                setAdjustQuantity(100);
                setAdjustType('Replenish');
                setIsAdjustModalOpen(true);
              }
            }}
            className="bg-primary/10 text-primary border border-primary/20 px-4 py-2.5 rounded font-bold hover:bg-primary/20 transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            Receive Stock
          </button>

          <button
            onClick={() => {
              if (ingredients.length > 0) {
                setWasteIngredientId(ingredients[0].id);
                setWasteQuantity(10);
                setIsWastageModalOpen(true);
              }
            }}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-2.5 rounded font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Log Wastage
          </button>
        </div>
      </div>

      {/* Quick Summary Cards (Bento style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Metric 1: Total Inventory Value */}
        <div className="bg-surface border border-outline-variant p-5 rounded-lg flex items-center gap-4 hover:bg-surface-container-lowest transition-colors">
          <div className="w-12 h-12 rounded-lg bg-primary-container/10 flex items-center justify-center text-primary-container">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider font-label-sm">Live Stock Value</p>
            <h3 className="text-2xl font-extrabold text-on-surface mt-0.5">
              ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] text-on-surface-variant font-medium font-label-sm">
              Across {ingredients.length} raw ingredients
            </span>
          </div>
        </div>

        {/* Metric 2: Low Stock Warnings */}
        <div className="bg-surface border border-outline-variant p-5 rounded-lg flex items-center gap-4 hover:bg-surface-container-lowest transition-colors">
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider font-label-sm">Low Stock Warnings</p>
            <h3 className={`text-2xl font-extrabold mt-0.5 ${lowStockItems.length > 0 ? 'text-amber-700' : 'text-on-surface'}`}>
              {lowStockItems.length} Items Alert
            </h3>
            <span className="text-[10px] text-amber-700 font-semibold font-label-sm block">
              {lowStockItems.length > 0 ? 'Requires immediate reorder' : 'All ingredient levels stable'}
            </span>
          </div>
        </div>

        {/* Metric 3: Real-Time Deduction Bridge */}
        <div className="bg-inverse-surface text-inverse-on-surface p-5 rounded-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center text-primary-container">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-white/80 font-bold uppercase tracking-wider font-label-sm">KDS Integration</p>
            <h3 className="text-base font-bold text-white mt-0.5">Recipe Deduction Active</h3>
            <span className="text-[10px] text-primary-container font-medium font-label-sm leading-relaxed block mt-0.5">
              Completing KDS order auto-deducts raw stock ingredients!
            </span>
          </div>
        </div>

      </div>

      {/* Sub navigation Tabs for Stock/Recipes/Wastage logs */}
      <div className="flex border-b border-outline-variant/60 mb-6 gap-2">
        <button
          onClick={() => setActiveSubTab('stock')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'stock'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Raw Ingredients Stock
        </button>
        <button
          onClick={() => setActiveSubTab('recipes')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'recipes'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Recipe-Ingredient Maps
        </button>
        <button
          onClick={() => setActiveSubTab('wastage')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'wastage'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Wastage & Loss Records
        </button>
        <button
          onClick={() => setActiveSubTab('pos')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'pos'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Purchase Orders
          {purchaseOrders.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              pendingPOsCount > 0 
                ? 'bg-amber-100 text-amber-800' 
                : 'bg-surface-container-high text-on-surface-variant'
            }`}>
              {purchaseOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Stock Grid view */}
      {activeSubTab === 'stock' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Stock Table */}
          <div className="lg:col-span-2 space-y-6 order-last lg:order-first">
          
            {/* Filtering row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface border border-outline-variant p-4 rounded-lg shadow-2xs">
            <div className="flex flex-wrap gap-1.5 overflow-x-auto">
              {ingredientCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                    categoryFilter === category
                      ? 'bg-primary text-white font-bold'
                      : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Search raw ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-outline-variant rounded bg-surface-container-lowest font-body-md focus:outline-none focus:ring-1 focus:ring-primary-container"
              />
            </div>
          </div>

          {/* Table list of raw ingredients */}
          <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Ingredient Name</th>
                  <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Category</th>
                  <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Current Level</th>
                  <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Reorder Min</th>
                  <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Stock Level Ratio</th>
                  <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Cost Value</th>
                  <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredIngredients.map((ing) => {
                  const isLow = ing.currentStock <= ing.reorderLevel;
                  const stockValue = ing.currentStock * ing.costPerUnit;
                  const capacity = getIngredientCapacity(ing);
                  const actualPercent = capacity > 0 ? Math.round((ing.currentStock / capacity) * 100) : 0;
                  
                  // Classification of stock level status as specified by user requirements
                  let statusLabel = "Moderate";
                  let statusBadgeColor = "bg-teal-50 text-teal-800 border-teal-200";
                  let statusIcon = <CheckCircle2 className="w-3 h-3 text-teal-600" />;
                  let textClass = "text-teal-600 font-semibold";
                  let progressBgClass = "bg-teal-500";
                  let rowHighlightClass = "";
                  let indicatorLabel = "Moderate";
                  let indicatorLabelClass = "text-teal-600 font-semibold uppercase tracking-wider text-[9px]";

                  if (ing.currentStock <= ing.reorderLevel * 0.5) {
                    // Critical Stock: drops to 50% or less of the minimum reorder level
                    statusLabel = "Critical";
                    statusBadgeColor = "bg-rose-100 text-rose-800 border-rose-300 animate-pulse font-extrabold";
                    statusIcon = <AlertTriangle className="w-3 h-3 text-rose-600 animate-bounce" />;
                    textClass = "text-rose-600 font-extrabold animate-pulse";
                    progressBgClass = "bg-rose-500 animate-pulse";
                    rowHighlightClass = "bg-rose-50/20";
                    indicatorLabel = "Critical Alert";
                    indicatorLabelClass = "text-rose-600 font-extrabold animate-pulse uppercase tracking-wider text-[9px] flex items-center gap-0.5";
                  } else if (isLow) {
                    // Low Stock: below the minimum reorder level
                    statusLabel = "Low Stock";
                    statusBadgeColor = "bg-amber-100 text-amber-800 border-amber-300 animate-pulse font-bold";
                    statusIcon = <AlertTriangle className="w-3 h-3 text-amber-600 animate-pulse" />;
                    textClass = "text-amber-600 font-bold animate-pulse";
                    progressBgClass = "bg-amber-500";
                    rowHighlightClass = "bg-amber-50/10";
                    indicatorLabel = "Need Refill";
                    indicatorLabelClass = "text-amber-600 font-bold animate-pulse uppercase tracking-wider text-[9px] flex items-center gap-0.5";
                  } else if (actualPercent >= 80) {
                    // Full Stock: at 80% or above of capacity
                    statusLabel = "Full Stock";
                    statusBadgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold";
                    statusIcon = <CheckCircle2 className="w-3 h-3 text-emerald-600" />;
                    textClass = "text-emerald-600 font-extrabold";
                    progressBgClass = "bg-emerald-500";
                    rowHighlightClass = "bg-emerald-50/5";
                    indicatorLabel = "Full";
                    indicatorLabelClass = "text-emerald-600 font-extrabold uppercase tracking-wider text-[9px]";
                  } else {
                    // Moderate Stock: safe (above reorder level) but below 80% capacity (calm green-teal)
                    statusLabel = "Moderate";
                    statusBadgeColor = "bg-teal-50 text-teal-800 border-teal-200 font-semibold";
                    statusIcon = <CheckCircle2 className="w-3 h-3 text-teal-600" />;
                    textClass = "text-teal-600 font-semibold";
                    progressBgClass = "bg-teal-500";
                    rowHighlightClass = "";
                    indicatorLabel = "Moderate";
                    indicatorLabelClass = "text-teal-600 font-semibold uppercase tracking-wider text-[9px]";
                  }

                  const percentDisplay = `${actualPercent}%`;
                  const progressWidth = Math.min(100, actualPercent);

                  return (
                    <tr key={ing.id} className={`hover:bg-primary-container/5 transition-colors ${rowHighlightClass}`}>
                      <td className="px-6 py-4">
                        <div className="font-bold text-on-surface text-sm font-label-md">{ing.name}</div>
                        <div className="text-[10px] text-on-surface-variant font-mono">ID: {ing.id}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant font-label-md">
                        {ing.category}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-on-surface font-label-md">
                        {ing.currentStock.toLocaleString()} {ing.unit}
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant font-label-md">
                        {ing.reorderLevel.toLocaleString()} {ing.unit}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 w-32 sm:w-40">
                          <div className="flex justify-between items-center text-[10px] font-medium">
                            <span className={`font-bold ${textClass}`}>
                              {percentDisplay}
                            </span>
                            <span className={indicatorLabelClass}>{indicatorLabel}</span>
                          </div>
                          <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden border border-outline-variant/30">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${progressBgClass}`}
                              style={{ width: `${progressWidth}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-primary font-label-md">
                        ₹{stockValue.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusBadgeColor}`}>
                          {statusIcon}
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustIngredientId(ing.id);
                              setAdjustQuantity(50);
                              setAdjustType('Replenish');
                              setIsAdjustModalOpen(true);
                            }}
                            className="bg-surface-container hover:bg-surface-container-high border border-outline-variant text-[11px] font-semibold text-on-surface-variant px-2.5 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Adjust
                          </button>
                          
                          <button
                            type="button"
                            disabled={reorderingId !== null}
                            onClick={() => handleQuickReorder(ing)}
                            className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded transition-all whitespace-nowrap cursor-pointer ${
                              reorderingId === ing.id
                                ? 'bg-primary/10 text-primary opacity-60'
                                : isLow
                                ? 'bg-primary text-white hover:bg-primary/90 shadow-xs'
                                : 'bg-primary/10 text-primary hover:bg-primary/20'
                            }`}
                          >
                            {reorderingId === ing.id ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                Reordering...
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="w-3.5 h-3.5" />
                                Reorder
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredIngredients.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-sm text-on-surface-variant italic">
                      No matching ingredients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>

          {/* Right Column / Restock List Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden shadow-xs">
              <div className="px-5 py-4 bg-surface-container border-b border-outline-variant flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-on-surface font-headline-sm flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-amber-500" />
                    Restock Assistant
                  </h3>
                  <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                    Plan custom or automatic supplier reorders
                  </p>
                </div>
                {lowStockItems.length > 0 && (
                  <span className="bg-rose-50 border border-rose-200 text-rose-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                    {lowStockItems.length} alert
                  </span>
                )}
              </div>

              <div className="p-4 space-y-4">
                {/* Search/Add selector for other ingredients */}
                <div className="pb-3.5 border-b border-outline-variant/60">
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    Add other ingredient to list
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (selectedId) {
                        setManuallyAddedRestockIds(prev => [...prev, selectedId]);
                        setUnselectedRestockIds(prev => {
                          const updated = { ...prev };
                          delete updated[selectedId];
                          return updated;
                        });
                      }
                    }}
                    className="w-full bg-surface border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="">-- Select ingredient --</option>
                    {ingredients
                      .filter(ing => !restockPlannerItems.some(item => item.id === ing.id))
                      .map(ing => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.currentStock} {ing.unit} in stock)
                        </option>
                      ))
                    }
                  </select>
                </div>

                {restockPlannerItems.length > 0 ? (
                  <>
                    {/* Toggle All checkbox */}
                    <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={restockPlannerItems.filter(ing => !unselectedRestockIds[ing.id]).length === restockPlannerItems.length}
                          onChange={() => {
                            const allSelected = restockPlannerItems.filter(ing => !unselectedRestockIds[ing.id]).length === restockPlannerItems.length;
                            if (allSelected) {
                              const newUnselected: Record<string, boolean> = {};
                              restockPlannerItems.forEach(ing => {
                                newUnselected[ing.id] = true;
                              });
                              setUnselectedRestockIds(newUnselected);
                            } else {
                              setUnselectedRestockIds({});
                            }
                          }}
                          className="rounded border-outline text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-on-surface">Select All Items</span>
                      </label>
                      <span className="text-[10px] font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                        {restockPlannerItems.filter(ing => !unselectedRestockIds[ing.id]).length} of {restockPlannerItems.length}
                      </span>
                    </div>

                    {/* Scrollable list */}
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {restockPlannerItems.map(ing => {
                        const isSelected = !unselectedRestockIds[ing.id];
                        const defaultQty = ing.reorderLevel > 0 ? ing.reorderLevel * 2 : 100;
                        const currentQty = restockQuantities[ing.id] ?? defaultQty;
                        const itemCost = currentQty * ing.costPerUnit;
                        const isLow = ing.currentStock <= ing.reorderLevel;
                        return (
                          <div 
                            key={ing.id} 
                            onClick={() => {
                              setUnselectedRestockIds(prev => ({
                                ...prev,
                                [ing.id]: !prev[ing.id]
                              }));
                            }}
                            className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-primary/5 border-primary/20 hover:bg-primary/10' 
                                : 'border-outline-variant/40 hover:bg-surface-container-low opacity-60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="rounded border-outline text-primary focus:ring-primary h-3.5 w-3.5 mt-0.5 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-on-surface truncate pr-1">
                                  {ing.name}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-xs font-bold text-primary font-mono">
                                    ₹{itemCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                  </span>
                                  {manuallyAddedRestockIds.includes(ing.id) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setManuallyAddedRestockIds(prev => prev.filter(id => id !== ing.id));
                                      }}
                                      className="p-0.5 hover:bg-rose-100 hover:text-rose-600 rounded text-on-surface-variant transition-colors"
                                      title="Remove from planner"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-medium mt-1">
                                <span>
                                  Stock: <span className={`font-bold ${isLow ? 'text-rose-600' : 'text-emerald-600'}`}>{ing.currentStock}</span> / Reorder: {ing.reorderLevel} {ing.unit}
                                </span>
                              </div>
                              
                              {/* Quantity Adjustment Selector */}
                              <div className="mt-2 flex items-center justify-between bg-surface-container-low border border-outline-variant/60 rounded-md p-1.5" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider pl-1">Order Qty:</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const step = ing.unit === 'kg' || ing.unit === 'g' || ing.unit === 'L' ? 5 : 1;
                                      const newQty = Math.max(1, currentQty - step);
                                      setRestockQuantities(prev => ({ ...prev, [ing.id]: newQty }));
                                    }}
                                    className="w-5 h-5 flex items-center justify-center bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded text-[10px] font-bold text-on-surface transition-colors cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={currentQty}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 1;
                                      setRestockQuantities(prev => ({ ...prev, [ing.id]: val }));
                                    }}
                                    className="w-14 bg-surface text-center font-bold font-mono text-xs text-on-surface border border-outline-variant rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const step = ing.unit === 'kg' || ing.unit === 'g' || ing.unit === 'L' ? 5 : 1;
                                      const newQty = currentQty + step;
                                      setRestockQuantities(prev => ({ ...prev, [ing.id]: newQty }));
                                    }}
                                    className="w-5 h-5 flex items-center justify-center bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded text-[10px] font-bold text-on-surface transition-colors cursor-pointer"
                                  >
                                    +
                                  </button>
                                  <span className="text-[10px] font-semibold text-on-surface-variant ml-1">{ing.unit}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary and Button */}
                    <div className="pt-4 border-t border-outline-variant/60 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-on-surface-variant">Selected Items:</span>
                        <span className="font-bold text-on-surface">
                          {restockPlannerItems.filter(ing => !unselectedRestockIds[ing.id]).length} items
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-on-surface-variant">Estimated Cost:</span>
                        <span className="font-extrabold text-sm text-primary">
                          ₹{restockPlannerItems
                            .filter(ing => !unselectedRestockIds[ing.id])
                            .reduce((sum, ing) => {
                              const qty = restockQuantities[ing.id] ?? (ing.reorderLevel > 0 ? ing.reorderLevel * 2 : 100);
                              return sum + (qty * ing.costPerUnit);
                            }, 0)
                            .toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={isBatchReordering || restockPlannerItems.filter(ing => !unselectedRestockIds[ing.id]).length === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          const selected = restockPlannerItems.filter(ing => !unselectedRestockIds[ing.id]);
                          handleBatchReorder(selected);
                        }}
                        className={`w-full py-2.5 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isBatchReordering
                            ? 'bg-primary/10 text-primary opacity-60'
                            : restockPlannerItems.filter(ing => !unselectedRestockIds[ing.id]).length === 0
                            ? 'bg-surface-container text-on-surface-variant/40 border border-outline-variant/30 cursor-not-allowed'
                            : 'bg-primary text-white hover:bg-primary/95 shadow-sm'
                        }`}
                      >
                        {isBatchReordering ? (
                          <>
                            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            Transmitting Orders...
                          </>
                        ) : (
                          <>
                            <Truck className="w-4 h-4" />
                            Generate Purchase Orders ({restockPlannerItems.filter(ing => !unselectedRestockIds[ing.id]).length})
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-8 px-4 text-center space-y-2.5">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">No Items to Restock</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">
                        Select an ingredient from the list above to add it to your restock plan.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Tab 2: Recipe-Ingredient Maps lookup */}
      {activeSubTab === 'recipes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Menu Selector Sidebar list */}
          <div className="lg:col-span-4 bg-surface border border-outline-variant p-4 rounded-lg space-y-2">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3 px-2 font-label-sm flex items-center gap-1.5">
              <BookmarkCheck className="w-4 h-4 text-primary" />
              Menu Recipes
            </h3>
            <div className="space-y-1">
              {products.map((p) => {
                const isActive = selectedProductRecipe === p.id;
                const recipeCount = recipes.filter(r => r.productId === p.id).length;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProductRecipe(p.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors cursor-pointer ${
                      isActive 
                        ? 'bg-primary/10 text-primary border border-primary/20 font-bold'
                        : 'hover:bg-surface-container border border-transparent'
                    }`}
                  >
                    {p.image ? (
                      <img src={p.image} className="w-10 h-10 object-cover rounded" alt={p.name} referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 bg-surface-container-high rounded flex items-center justify-center text-[9px] text-on-surface-variant font-bold text-center">
                        No image
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate text-on-surface">{p.name}</div>
                      <div className="text-[11px] text-on-surface-variant font-medium">
                        {recipeCount} raw material ingredients
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'rotate-90 text-primary' : 'text-on-surface-variant'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Product recipe layout details */}
          <div className="lg:col-span-8 bg-surface border border-outline-variant p-6 rounded-lg self-stretch flex flex-col justify-between">
            {selectedProductObj ? (
              <div>
                <div className="flex items-center gap-4 border-b border-outline-variant/60 pb-4 mb-6">
                  {selectedProductObj.image ? (
                    <img src={selectedProductObj.image} className="w-16 h-16 object-cover rounded-md border" alt={selectedProductObj.name} referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-16 h-16 bg-surface-container-high rounded-md border flex items-center justify-center text-[10px] text-on-surface-variant font-bold text-center">
                      No image
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] bg-primary-container/20 text-primary-container px-2 py-0.5 rounded font-bold uppercase tracking-wider font-label-sm">
                      {selectedProductObj.category} Recipe
                    </span>
                    <h3 className="text-lg font-bold text-on-surface font-headline-md mt-0.5">{selectedProductObj.name}</h3>
                    <p className="text-xs text-on-surface-variant font-label-sm">{selectedProductObj.description}</p>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3 font-label-sm">
                  Required Ingredients (Consumed per Portions Prepared)
                </h4>

                <div className="space-y-3">
                  {currentRecipeItems.map((rec, idx) => {
                    const ingObj = ingredients.find(i => i.id === rec.ingredientId);
                    if (!ingObj) return null;
                    return (
                      <div key={idx} className="bg-surface-container-low p-4 rounded border border-outline-variant/40 flex items-center justify-between hover:border-outline-variant transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-on-surface font-label-md">{ingObj.name}</div>
                            <div className="text-[10px] text-on-surface-variant font-label-sm">
                              Current Warehouse Level: <strong>{ingObj.currentStock.toLocaleString()} {ingObj.unit}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-extrabold text-primary block">
                            {rec.quantityRequired} {ingObj.unit}
                          </span>
                          <span className="text-[9px] text-on-surface-variant font-label-sm">
                            approx. ₹{(rec.quantityRequired * ingObj.costPerUnit).toFixed(2)} cost value
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {currentRecipeItems.length === 0 && (
                    <div className="text-center py-10 bg-surface-container border border-dashed border-outline-variant/60 rounded">
                      <p className="text-xs text-on-surface-variant italic">No recipe mapped for this menu item yet.</p>
                      <button className="text-xs font-bold text-primary mt-2 hover:underline">
                        Create Portion Recipe Mapping
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 italic text-on-surface-variant">
                Select a menu item to load its recipe-ingredient consumption maps.
              </div>
            )}

            {selectedProductObj && currentRecipeItems.length > 0 && (
              <div className="border-t border-outline-variant/60 pt-4 mt-6 flex justify-between items-center text-xs text-on-surface-variant">
                <span>Portion cost calculation</span>
                <span className="font-bold text-primary">
                  Total raw food cost: ₹
                  {currentRecipeItems.reduce((acc, rec) => {
                    const ingObj = ingredients.find(i => i.id === rec.ingredientId);
                    return acc + (rec.quantityRequired * (ingObj?.costPerUnit || 0));
                  }, 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Tab 3: Wastage & Loss records */}
      {activeSubTab === 'wastage' && (
        <div className="space-y-6">
          <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-surface-container border-b border-outline-variant flex justify-between items-center">
              <h3 className="text-base font-bold text-on-surface font-headline-md flex items-center gap-1.5">
                <History className="w-5 h-5 text-primary-container" />
                Historic Loss Log
              </h3>
              <button
                onClick={() => {
                  if (ingredients.length > 0) {
                    setWasteIngredientId(ingredients[0].id);
                    setWasteQuantity(5);
                    setIsWastageModalOpen(true);
                  }
                }}
                className="bg-primary text-white px-3 py-1.5 rounded font-bold hover:opacity-90 transition-opacity text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Entry
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Ingredient</th>
                    <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Quantity Lost</th>
                    <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Reason Code</th>
                    <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Timestamp</th>
                    <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {wastageLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-primary-container/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-on-surface text-sm font-label-md">{log.ingredientName}</div>
                        <div className="text-[10px] text-on-surface-variant font-mono">ID: {log.ingredientId}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-rose-700 font-label-md">
                        -{log.quantity} {log.unit}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          log.reason === 'Spillage' 
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : log.reason === 'Expired'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : log.reason === 'Dropped'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                          {log.reason}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant font-label-md">
                        {log.timestamp}
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface font-semibold font-label-md">
                        {log.loggedBy}
                      </td>
                    </tr>
                  ))}

                  {wastageLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-sm text-on-surface-variant italic">
                        No wastage recorded. Excellent food prep accuracy!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Simulated Purchase Orders */}
      {activeSubTab === 'pos' && (
        <div className="space-y-6">
          <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-surface-container border-b border-outline-variant flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-on-surface font-headline-md flex items-center gap-1.5">
                  <FileText className="w-5 h-5 text-primary" />
                  Simulated Purchase Orders
                </h3>
                <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                  Simulate and monitor automatic procurement cycles with key food suppliers
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">PO Number</th>
                    <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Ingredient</th>
                    <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Reorder Qty</th>
                    <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Simulated Cost</th>
                    <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Status</th>
                    <th className="px-6 py-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Timestamp</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-primary-container/5 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-sm text-primary">{po.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-on-surface text-sm font-label-md">{po.ingredientName}</div>
                        <div className="text-[10px] text-on-surface-variant font-mono">ID: {po.ingredientId}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-on-surface font-label-md">
                        {po.quantity.toLocaleString()} {po.unit}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-on-surface font-label-md">
                        ₹{po.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                      </td>
                      <td className="px-6 py-4">
                        {po.status === 'Pending Delivery' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase animate-pulse">
                            <Truck className="w-3 h-3 text-amber-600" />
                            Pending Delivery
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Received
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant font-label-md">
                        {po.timestamp}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {po.status === 'Pending Delivery' && (
                          <button
                            type="button"
                            onClick={() => handleReceivePO(po.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded transition-all cursor-pointer shadow-3xs flex items-center gap-1 ml-auto"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            Receive Delivery
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {purchaseOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-14 text-sm text-on-surface-variant italic">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <ShoppingCart className="w-8 h-8 text-outline-variant" />
                          <span>No simulated purchase orders generated yet.</span>
                          <button
                            type="button"
                            onClick={() => setActiveSubTab('stock')}
                            className="text-xs font-bold text-primary hover:underline mt-1"
                          >
                            Go to Raw Stock to Quick Reorder →
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Inventory Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <form 
            onSubmit={handleAdjustStockSubmit}
            className="bg-white rounded-lg max-w-md w-full overflow-hidden border border-outline-variant shadow-xl"
          >
            <div className="px-6 py-4 bg-surface-container border-b border-outline-variant flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-on-surface font-headline-md flex items-center gap-1.5">
                  <Truck className="w-5 h-5 text-primary-container" />
                  Update Stock Level
                </h3>
                <p className="text-xs text-on-surface-variant font-label-sm">Restock or perform audit correction for raw ingredients</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center cursor-pointer"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 font-label-sm">Select Raw Ingredient</label>
                <select 
                  value={adjustIngredientId}
                  onChange={(e) => setAdjustIngredientId(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant rounded text-sm bg-surface-container-low font-body-md"
                >
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.currentStock} {ing.unit} available)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 font-label-sm">Adjustment Mode</label>
                  <select 
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as any)}
                    className="w-full p-2.5 border border-outline-variant rounded text-sm bg-surface-container-low font-body-md"
                  >
                    <option value="Replenish">Add Incoming Stock (+)</option>
                    <option value="Audit Correct">Exact Level Audit (=)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 font-label-sm">
                    Quantity ({ingredients.find(i => i.id === adjustIngredientId)?.unit || ''})
                  </label>
                  <input 
                    type="number" 
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(Number(e.target.value))}
                    className="w-full p-2 border border-outline-variant rounded text-sm bg-surface-container-low font-body-md"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="bg-primary/5 p-3 rounded border border-outline-variant/30 text-xs text-primary leading-relaxed font-body-md">
                💡 <strong>Replenish Mode</strong> increases your active warehouse stock. <strong>Audit Correction</strong> will overwrite the current volume to match physical shelf count.
              </div>
            </div>

            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex gap-3">
              <button 
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="flex-1 py-2 rounded border border-outline-variant text-xs font-bold hover:bg-surface-container-high cursor-pointer text-on-surface-variant"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 bg-primary-container text-on-primary-container py-2 rounded font-bold hover:opacity-90 cursor-pointer text-xs"
              >
                Apply Adjustments
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Log Wastage Modal */}
      {isWastageModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <form 
            onSubmit={handleLogWastageSubmit}
            className="bg-white rounded-lg max-w-md w-full overflow-hidden border border-outline-variant shadow-xl"
          >
            <div className="px-6 py-4 bg-surface-container border-b border-outline-variant flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-on-surface font-headline-md flex items-center gap-1.5 text-rose-700">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                  Log Kitchen Loss / Waste
                </h3>
                <p className="text-xs text-on-surface-variant font-label-sm">Subtract dropped, spilled, or expired ingredients</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsWastageModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center cursor-pointer"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 font-label-sm">Raw Material Ingredient</label>
                <select 
                  value={wasteIngredientId}
                  onChange={(e) => setWasteIngredientId(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant rounded text-sm bg-surface-container-low font-body-md"
                >
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.currentStock} {ing.unit} in-stock)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 font-label-sm">Reason Code</label>
                  <select 
                    value={wasteReason}
                    onChange={(e) => setWasteReason(e.target.value as any)}
                    className="w-full p-2.5 border border-outline-variant rounded text-sm bg-surface-container-low font-body-md"
                  >
                    <option value="Expired">Expired Goods</option>
                    <option value="Spillage">Kitchen Spillage</option>
                    <option value="Burnt/Ruined">Burnt/Ruined Prep</option>
                    <option value="Dropped">Dropped Floor Loss</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 font-label-sm">
                    Quantity ({ingredients.find(i => i.id === wasteIngredientId)?.unit || ''})
                  </label>
                  <input 
                    type="number" 
                    value={wasteQuantity}
                    onChange={(e) => setWasteQuantity(Number(e.target.value))}
                    className="w-full p-2 border border-outline-variant rounded text-sm bg-surface-container-low font-body-md"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 font-label-sm">Authorized Staff Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Chef Akira"
                  value={wasteLoggedBy}
                  onChange={(e) => setWasteLoggedBy(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant rounded text-sm bg-surface-container-low font-body-md"
                  required
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex gap-3">
              <button 
                type="button"
                onClick={() => setIsWastageModalOpen(false)}
                className="flex-1 py-2 rounded border border-outline-variant text-xs font-bold hover:bg-surface-container-high cursor-pointer text-on-surface-variant"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 bg-rose-600 text-white py-2 rounded font-bold hover:bg-rose-700 transition-colors cursor-pointer text-xs"
              >
                Log Damage & Subtract
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Add Ingredient Delivery Modal */}
      {isQuickAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <form 
            onSubmit={handleQuickAddSubmit}
            className="bg-white rounded-lg max-w-md w-full overflow-hidden border border-outline-variant shadow-xl text-left"
          >
            <div className="px-6 py-4 bg-surface-container border-b border-outline-variant flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-on-surface font-headline-md flex items-center gap-1.5 text-emerald-700">
                  <Truck className="w-5 h-5 text-emerald-600 animate-bounce" />
                  Quick Add Delivery
                </h3>
                <p className="text-xs text-on-surface-variant font-label-sm">Log an incoming raw material shipment to update stock instantly</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsQuickAddModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center cursor-pointer text-slate-500 hover:text-slate-700 text-lg"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 font-label-sm">Delivered Ingredient</label>
                <select 
                  value={quickAddIngredientId}
                  onChange={(e) => setQuickAddIngredientId(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant rounded text-sm bg-surface-container-low font-body-md text-on-surface"
                >
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.currentStock.toLocaleString()} {ing.unit} currently in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 font-label-sm">
                    Quantity ({ingredients.find(i => i.id === quickAddIngredientId)?.unit || ''})
                  </label>
                  <input 
                    type="number" 
                    value={quickAddQuantity}
                    onChange={(e) => setQuickAddQuantity(Number(e.target.value))}
                    className="w-full p-2 border border-outline-variant rounded text-sm bg-surface-container-low font-body-md text-on-surface"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 font-label-sm">Delivery Note / Invoice</label>
                  <input 
                    type="text" 
                    placeholder="e.g. INV-48202"
                    value={quickAddInvoice}
                    onChange={(e) => setQuickAddInvoice(e.target.value)}
                    className="w-full p-2 border border-outline-variant rounded text-sm bg-surface-container-low font-body-md text-on-surface"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 font-label-sm">Supplier</label>
                <input 
                  type="text" 
                  placeholder="e.g. Global Foods Ltd"
                  value={quickAddSupplier}
                  onChange={(e) => setQuickAddSupplier(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant rounded text-sm bg-surface-container-low font-body-md text-on-surface"
                  required
                />
              </div>

              <div className="bg-emerald-50 p-3 rounded border border-emerald-200/40 text-xs text-emerald-800 leading-relaxed font-body-md">
                ⚡ <strong>Instant Update</strong>: Submitting this form will add the delivered quantity directly to active raw stock and create a logged delivery history entry.
              </div>
            </div>

            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex gap-3">
              <button 
                type="button"
                onClick={() => setIsQuickAddModalOpen(false)}
                className="flex-1 py-2 rounded border border-outline-variant text-xs font-bold hover:bg-surface-container-high cursor-pointer text-on-surface-variant"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 bg-emerald-600 text-white py-2 rounded font-bold hover:bg-emerald-700 transition-colors cursor-pointer text-xs"
              >
                Log Delivery
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
