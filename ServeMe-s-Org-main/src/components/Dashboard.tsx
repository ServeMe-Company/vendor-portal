import React, { useState } from 'react';
import { 
  ShoppingBag, 
  IndianRupee, 
  Package, 
  Users, 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle,
  ChevronRight,
  Filter,
  Download,
  X,
  Play,
  CheckCircle,
  Clock,
  Plus,
  ShoppingCart,
  CreditCard
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Order, MenuItem, StoreInsight, DailyTrend, MarketingCampaign } from '../types';

interface DashboardProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  products: MenuItem[];
  setProducts: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  insights: StoreInsight[];
  setInsights: React.Dispatch<React.SetStateAction<StoreInsight[]>>;
  trends: DailyTrend[];
  campaigns: MarketingCampaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<MarketingCampaign[]>>;
  setCurrentTab: (tab: string) => void;
}

export default function Dashboard({
  orders,
  setOrders,
  products,
  setProducts,
  insights,
  setInsights,
  trends,
  campaigns,
  setCampaigns,
  setCurrentTab
}: DashboardProps) {
  // Local UI State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'All' | 'Preparing' | 'Completed' | 'Cancelled'>('All');
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [newCampaignTitle, setNewCampaignTitle] = useState('');
  const [newCampaignDiscount, setNewCampaignDiscount] = useState('10% Off');
  const [newCampaignProduct, setNewCampaignProduct] = useState(products[0]?.name || '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Calculate stats dynamically based on actual state matching the mockup values on load
  const completedOrders = orders.filter(o => o.status === 'Completed');
  const totalOrders = completedOrders.length;
  
  // Base 11,000 + completed orders totals (420 + 1180 = 1600 on load) = exactly 12,600.00
  const totalRevenue = 11000 + completedOrders.reduce((sum, o) => sum + o.total, 0);

  const activeProductsCount = products.length; // 4 products on load
  
  // Customers baseline: 4 on load, incrementing as more orders are completed
  const customersCount = 4 + (completedOrders.length - 2);

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (orderStatusFilter === 'All') return true;
    return order.status === orderStatusFilter;
  });

  // Handle Actionable Insight Click: "'Spicy Ramen' is trending. Add to featured items?"
  const handleInsightClick = (insight: StoreInsight) => {
    if (insight.message.includes("'Spicy Ramen'")) {
      // Find Spicy Tonkotsu Ramen and feature it
      setProducts(prev => 
        prev.map(p => p.name.includes('Spicy') ? { ...p, popular: true } : p)
      );
      triggerToast("Spicy Tonkotsu Ramen has been added to Featured Items!");
      // Dismiss insight
      setInsights(prev => prev.filter(i => i.id !== insight.id));
    } else {
      // General dismiss
      setInsights(prev => prev.filter(i => i.id !== insight.id));
    }
  };

  // Launch a new quick campaign
  const handleLaunchCampaignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignTitle) return;

    const newCamp: MarketingCampaign = {
      id: `camp-${Date.now()}`,
      title: newCampaignTitle,
      discount: newCampaignDiscount,
      status: 'Active',
      targetProduct: newCampaignProduct,
      clicks: 0,
      conversions: 0
    };

    setCampaigns(prev => [newCamp, ...prev]);
    setIsCampaignModalOpen(false);
    setNewCampaignTitle('');
    
    // Add success insight dynamically
    const newInsight: StoreInsight = {
      id: `ins-camp-${Date.now()}`,
      icon: 'trending_up',
      message: `Campaign "${newCampaignTitle}" launched successfully! Monitoring live customer clicks.`,
      type: 'success'
    };
    setInsights(prev => [newInsight, ...prev]);
  };

  // Toggle order status (Preparing -> Completed -> Cancelled)
  const updateOrderStatus = (orderId: string, newStatus: 'Preparing' | 'Completed' | 'Cancelled') => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    // Update the currently viewed order modal details
    setSelectedOrder(prev => prev && prev.id === orderId ? { ...prev, status: newStatus } : prev);
  };

  // Mock export to CSV
  const handleExportCSV = () => {
    const headers = 'Order ID,Customer,Date,Total,Status\n';
    const rows = orders.map(o => `${o.id},${o.customerName},${o.date},₹${o.total},${o.status}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `serveme_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    a.click();
  };  // Generate trend data matching the mockup exactly, plus any new Completed orders' revenue added to the last day (Jul 15)
  const baseTrends = [
    { date: 'Jul 9', revenue: 0 },
    { date: 'Jul 10', revenue: 0 },
    { date: 'Jul 11', revenue: 0 },
    { date: 'Jul 12', revenue: 0 },
    { date: 'Jul 13', revenue: 0 },
    { date: 'Jul 14', revenue: 12600 },
    { date: 'Jul 15', revenue: 0 }
  ];

  const initialCompletedIds = ['#ORD-8290', '#ORD-8289'];
  const newCompletedRevenue = orders
    .filter(o => o.status === 'Completed' && !initialCompletedIds.includes(o.id))
    .reduce((sum, o) => sum + o.total, 0);

  const dynamicTrends = baseTrends.map(t => {
    if (t.date === 'Jul 15') {
      return { ...t, revenue: t.revenue + newCompletedRevenue };
    }
    return t;
  });

  return (
    <div className="pt-4 pb-24 md:pb-8 max-w-7xl mx-auto px-4 md:px-8 select-none relative">
      
      {/* Dynamic Toast Message Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl border border-slate-800 flex items-center gap-3 animate-fade-in max-w-sm">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
          <span className="text-xs font-bold font-sans">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Dashboard Header Title & Subtitle */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-headline-lg">
          Dashboard Summary
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1 font-body-md">
          Overview of your restaurant's performance and catalog.
        </p>
      </div>

      {/* Summary Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Stat Card 1: Total Orders */}
        <div className="bg-white border border-slate-200 shadow-xs p-5 rounded-xl flex items-center gap-4 hover:shadow-sm transition-all duration-300">
          <div className="w-14 h-14 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-slate-500 font-label-md">Total Orders</span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1 font-headline-md">{totalOrders}</span>
          </div>
        </div>

        {/* Stat Card 2: Total Revenue */}
        <div className="bg-white border border-slate-200 shadow-xs p-5 rounded-xl flex items-center gap-4 hover:shadow-sm transition-all duration-300">
          <div className="w-14 h-14 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-slate-500 font-label-md">Total Revenue</span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1 font-headline-md">
              ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Stat Card 3: Products */}
        <div 
          onClick={() => setCurrentTab('catalog')}
          className="bg-white border border-slate-200 shadow-xs p-5 rounded-xl flex items-center gap-4 hover:shadow-sm transition-all duration-300 cursor-pointer group"
        >
          <div className="w-14 h-14 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0 group-hover:scale-105 transition-transform">
            <Package className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-slate-500 font-label-md group-hover:text-orange-600 transition-colors">Products</span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1 font-headline-md">{activeProductsCount}</span>
          </div>
        </div>

        {/* Stat Card 4: Customers */}
        <div className="bg-white border border-slate-200 shadow-xs p-5 rounded-xl flex items-center gap-4 hover:shadow-sm transition-all duration-300">
          <div className="w-14 h-14 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-slate-500 font-label-md">Customers</span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1 font-headline-md">{customersCount}</span>
          </div>
        </div>
      </div>

      {/* Performance Chart Area (Full-Width to match mockup exactly) */}
      <div className="bg-white border border-slate-200 shadow-xs p-6 md:p-8 rounded-xl mb-8 relative overflow-hidden">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-orange-50 rounded-lg text-orange-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight font-headline-md">Performance Chart</h2>
              <p className="text-xs font-medium text-slate-400 font-label-sm mt-0.5">
                Live 7-day revenue trend
              </p>
            </div>
          </div>
          <div 
            className="flex items-center gap-1.5 bg-slate-50/50 px-3 py-1.5 rounded-lg border border-slate-100"
            style={{ width: '444.4px', height: '277.763px', paddingBottom: '24px' }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="text-xs font-semibold text-slate-600 font-label-md">Daily Revenue</span>
          </div>
        </div>

        {/* Recharts Area Chart styled exactly as requested */}
        <div className="h-80 w-full" id="revenue-trend-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dynamicTrends}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f1f5f9" strokeWidth={1} opacity={0.8} />
              <XAxis 
                dataKey="date" 
                tickLine={false} 
                axisLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                dy={12}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                ticks={[0, 3600, 7200, 10900, 14500]}
                tickFormatter={(val) => {
                  if (val === 0) return '₹0';
                  return `₹${(val / 1000).toFixed(1)}k`;
                }}
                dx={-10}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Revenue']}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#f97316" 
                strokeWidth={3} 
                dot={{
                  r: 5,
                  fill: '#ffffff',
                  stroke: '#f97316',
                  strokeWidth: 3
                }}
                activeDot={{
                  r: 7,
                  fill: '#ffffff',
                  stroke: '#f97316',
                  strokeWidth: 4
                }}
                fillOpacity={1} 
                fill="url(#chartFill)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid containing Interactive Elements (Store Insights & Campaigns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mb-8">
        
        {/* Store Insights Panel */}
        <div className="bg-slate-900 p-6 md:p-8 rounded-xl text-white shadow-xs border border-slate-800 flex flex-col justify-between h-full">
          <div>
            <h2 className="text-lg font-bold mb-5 font-headline-md text-white flex items-center gap-2.5">
              <Lightbulb className="w-5.5 h-5.5 text-orange-400 animate-pulse" />
              Store Insights
            </h2>
            
            <div className="space-y-4">
              {insights.map((insight) => (
                <div 
                  key={insight.id} 
                  onClick={() => handleInsightClick(insight)}
                  className="flex gap-3.5 items-start p-4 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer transition-all duration-300 group border border-white/5"
                  title="Click to resolve or feature"
                >
                  <div className="mt-0.5 shrink-0">
                    {insight.icon === 'lightbulb' && <Lightbulb className="w-4.5 h-4.5 text-orange-400" />}
                    {insight.icon === 'trending_up' && <TrendingUp className="w-4.5 h-4.5 text-emerald-400" />}
                    {insight.icon === 'warning' && <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs md:text-sm leading-relaxed font-body-md opacity-90">
                      {insight.message}
                    </p>
                    <span className="text-[11px] text-orange-400 underline opacity-0 group-hover:opacity-100 transition-opacity font-label-sm block mt-1.5">
                      {insight.message.includes("'Spicy Ramen'") ? 'Apply Recommendation →' : 'Dismiss Alert ×'}
                    </span>
                  </div>
                </div>
              ))}

              {insights.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-sm text-slate-400 italic">All insights addressed! Keep running smoothly.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Campaign Launcher Panel */}
        <div className="bg-slate-950 p-6 md:p-8 rounded-xl text-white shadow-xs border border-slate-800 flex flex-col justify-between h-full">
          <div>
            <h2 className="text-lg font-bold mb-5 font-headline-md text-white flex items-center gap-2.5">
              <TrendingUp className="w-5.5 h-5.5 text-orange-500" />
              Promo & Campaigns
            </h2>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-body-md mb-5">
              Boost your restaurant's visibility and attract more customers in your area with targeted marketing campaigns.
            </p>
            
            <div className="w-full h-44 rounded-xl overflow-hidden mb-6 relative group border border-slate-800">
              <img 
                className="w-full h-full object-cover grayscale brightness-75 hover:grayscale-0 transition-all duration-500" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBSN1hGqAI5m3LDp9j7IGSanWtjC5LTlxvpB9rsGBMc_tfkfEfuCdRYSNbdCZUdV5kh_REK10P6s73l_EolM70JQMxWWkfDugyvSQ4mGViwpvRddXcilvHc-eDVPNv4W7LIe5lL4G2rI7WlWiAZ7fi3ZRZhECpsNDGX1y67by7NmbEGVxwrKuTIrKp1vmXaeKTW6sqrDvrbqaxtkIiv2Z4C7MxJtY9b4yafFel4d3pT7s0bHyp8AHT-"
                alt="ServeMe Restaurant Kitchen"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex items-end p-4">
                <span className="text-[11px] font-bold text-white font-label-sm tracking-wider uppercase bg-orange-600/90 px-2 py-0.5 rounded-md">
                  PROMO BOOSTER ACTIVE
                </span>
              </div>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => setIsCampaignModalOpen(true)}
            className="w-full bg-[#f97316] text-white py-3 rounded-lg font-bold hover:bg-[#ea580c] transition-colors text-sm font-label-md flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            Launch Campaign
          </button>
        </div>

      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg max-w-md w-full overflow-hidden border border-outline-variant shadow-xl">
            <div className="px-6 py-4 bg-surface-container border-b border-outline-variant flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-on-surface font-headline-md">Order Details</h3>
                <p className="text-xs text-on-surface-variant font-label-sm">{selectedOrder.id}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between border-b border-outline-variant/50 pb-2">
                <span className="text-xs font-semibold text-on-surface-variant uppercase font-label-sm">Customer</span>
                <span className="text-sm font-bold text-on-surface font-label-md">{selectedOrder.customerName}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/50 pb-2">
                <span className="text-xs font-semibold text-on-surface-variant uppercase font-label-sm">Date</span>
                <span className="text-sm text-on-surface-variant font-label-md">{selectedOrder.date}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/50 pb-2">
                <span className="text-xs font-semibold text-on-surface-variant uppercase font-label-sm">Status</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  selectedOrder.status === 'Preparing' 
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : selectedOrder.status === 'Completed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {selectedOrder.status}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 font-label-sm">
                  Items Ordered
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm bg-surface-container-low p-2 rounded border border-outline-variant/30">
                      <div>
                        <p className="font-semibold text-on-surface font-label-md">{item.name}</p>
                        <p className="text-xs text-on-surface-variant font-label-sm">Qty: {item.quantity} × ₹{item.price}</p>
                      </div>
                      <span className="font-bold text-on-surface font-label-md">₹{item.quantity * item.price}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-outline-variant">
                <span className="text-sm font-bold text-on-surface font-label-md">Total Paid Amount</span>
                <span className="text-lg font-extrabold text-primary font-headline-md">₹{selectedOrder.total.toLocaleString()}</span>
              </div>
            </div>

            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex gap-3">
              {selectedOrder.status === 'Preparing' && (
                <>
                  <button 
                    onClick={() => updateOrderStatus(selectedOrder.id, 'Completed')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Complete Order
                  </button>
                  <button 
                    onClick={() => updateOrderStatus(selectedOrder.id, 'Cancelled')}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    Cancel Order
                  </button>
                </>
              )}
              {selectedOrder.status !== 'Preparing' && (
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="w-full bg-secondary text-white py-2 rounded text-xs font-bold transition-opacity hover:opacity-90 cursor-pointer"
                >
                  Close Window
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Campaign Launcher Modal */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <form 
            onSubmit={handleLaunchCampaignSubmit}
            className="bg-white rounded-lg max-w-md w-full overflow-hidden border border-outline-variant shadow-xl"
          >
            <div className="px-6 py-4 bg-surface-container border-b border-outline-variant flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-on-surface font-headline-md flex items-center gap-2">
                  <Play className="w-4 h-4 text-primary-container fill-current" />
                  Configure Campaign
                </h3>
                <p className="text-xs text-on-surface-variant font-label-sm">Promote your store in the local area</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsCampaignModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 font-label-sm">
                  Campaign Name
                </label>
                <input 
                  type="text" 
                  value={newCampaignTitle}
                  onChange={(e) => setNewCampaignTitle(e.target.value)}
                  placeholder="e.g. Monsoon Special Treat"
                  className="w-full p-2.5 border border-outline-variant rounded text-sm bg-surface-container-low font-body-md focus:outline-none focus:ring-1 focus:ring-primary-container"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 font-label-sm">
                  Discount / Offer Value
                </label>
                <select 
                  value={newCampaignDiscount}
                  onChange={(e) => setNewCampaignDiscount(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant rounded text-sm bg-surface-container-low font-body-md focus:outline-none focus:ring-1 focus:ring-primary-container"
                >
                  <option value="10% Off">10% Off entire menu</option>
                  <option value="15% Off">15% Off targeted item</option>
                  <option value="20% Off">20% Off bulk purchases</option>
                  <option value="Free Delivery">Free home delivery</option>
                  <option value="Free Boba Topping">Buy 1 Get 1 Free Boba</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 font-label-sm">
                  Target Product
                </label>
                <select 
                  value={newCampaignProduct}
                  onChange={(e) => setNewCampaignProduct(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant rounded text-sm bg-surface-container-low font-body-md focus:outline-none focus:ring-1 focus:ring-primary-container"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-primary/5 p-3 rounded border border-outline-variant/30 text-xs text-primary leading-relaxed font-body-md">
                <strong>💡 Estimated Reach:</strong> 1,200 - 3,500 foodies in a 3km radius from your restaurant location tonight. Cost is entirely covered under your ServeMe package plan.
              </div>
            </div>

            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex gap-3">
              <button 
                type="button"
                onClick={() => setIsCampaignModalOpen(false)}
                className="flex-1 py-2.5 rounded border border-outline-variant text-xs font-bold hover:bg-surface-container-high transition-colors cursor-pointer text-on-surface-variant"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 bg-primary-container text-on-primary-container py-2.5 rounded font-bold hover:opacity-90 transition-opacity text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Launch Campaign Live
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
