import React, { useState } from 'react';
import { Search, Trash2, Download, X, Printer, Calendar, TrendingUp, DollarSign, ShoppingBag, Percent, Clock } from 'lucide-react';
import { Order, MenuItem, DailyTrend } from '../types';

interface ReportsProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  products: MenuItem[];
  trends: DailyTrend[];
}

type DatePreset = 'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom';

// Robust helper to parse different order date formats (ISO, relative, verbose dates)
function parseOrderDate(dateStr: string): Date {
  const now = new Date();
  if (!dateStr) return now;

  const str = dateStr.trim().toLowerCase();

  // Handle relative Today times
  if (str.includes('today')) {
    return now;
  }

  // Handle ISO or standard formats like "2026-07-14 13:12"
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const hour = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
    const minute = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
    return new Date(year, month, day, hour, minute);
  }

  // Handle formats like "Oct 12, 10:45 AM" or "Jul 9"
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  
  for (const [mName, mIdx] of Object.entries(months)) {
    if (str.includes(mName)) {
      const rest = str.substring(str.indexOf(mName) + mName.length);
      const dayMatch = rest.match(/\d+/);
      if (dayMatch) {
        const day = parseInt(dayMatch[0], 10);
        const yearMatch = str.match(/\b(20\d{2})\b/);
        const year = yearMatch ? parseInt(yearMatch[1], 10) : now.getFullYear();
        
        const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
        let hour = 0;
        let minute = 0;
        if (timeMatch) {
          hour = parseInt(timeMatch[1], 10);
          minute = parseInt(timeMatch[2], 10);
          if (str.includes('pm') && hour < 12) hour += 12;
          if (str.includes('am') && hour === 12) hour = 0;
        }
        return new Date(year, mIdx, day, hour, minute);
      }
    }
  }

  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? now : parsed;
}

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export default function Reports({ orders, setOrders, products, trends }: ReportsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  
  // Date range state
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Print invoice function
  const handlePrint = () => {
    if (!selectedOrder) return;

    // Create a dynamic print iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const itemsHtml = selectedOrder.items.map(item => `
      <tr style="border-bottom: 1px dashed #e2e8f0;">
        <td style="padding: 6px 0; text-align: left;">${item.name}</td>
        <td style="padding: 6px 0; text-align: right;">${item.quantity}</td>
        <td style="padding: 6px 0; text-align: right;">₹${item.price.toFixed(2)}</td>
        <td style="padding: 6px 0; text-align: right; font-weight: bold;">₹${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `).join('');

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Receipt - ${selectedOrder.id}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              color: #000;
              padding: 10px;
              max-width: 380px;
              margin: 0 auto;
              background-color: #fff;
              line-height: 1.4;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .border-dashed-bottom {
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .flex-between {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 13px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
              font-size: 13px;
            }
            th {
              border-bottom: 1px solid #000;
              padding-bottom: 4px;
              font-weight: bold;
            }
            .grand-total {
              display: flex;
              justify-content: space-between;
              font-size: 15px;
              font-weight: bold;
              border-top: 1px dashed #000;
              padding-top: 8px;
              margin-top: 10px;
            }
            .footer {
              margin-top: 24px;
              font-size: 11px;
              color: #444;
            }
          </style>
        </head>
        <body>
          <div class="text-center border-dashed-bottom">
            <h2 style="margin: 0 0 4px 0; font-size: 18px;">serveMe Restaurant</h2>
            <p style="margin: 0 0 2px 0; font-size: 11px;">123 Food Street, Culinary Capital</p>
            <p style="margin: 0; font-size: 11px;">Ph: +1 234-567-8900</p>
          </div>

          <div class="border-dashed-bottom">
            <div class="flex-between">
              <span>Date:</span>
              <span class="font-bold">${selectedOrder.date}</span>
            </div>
            <div class="flex-between">
              <span>Receipt ID:</span>
              <span class="font-bold">${selectedOrder.id}</span>
            </div>
            <div class="flex-between">
              <span>Customer:</span>
              <span class="font-bold">${selectedOrder.customerName}</span>
            </div>
            ${selectedOrder.mobileNumber ? `
              <div class="flex-between">
                <span>Contact:</span>
                <span class="font-bold">${selectedOrder.mobileNumber}</span>
              </div>
            ` : ''}
            <div class="flex-between">
              <span>Payment Mode:</span>
              <span class="font-bold uppercase">${selectedOrder.paymentMode || 'UPI'}</span>
            </div>
            <div class="flex-between">
              <span>Status:</span>
              <span class="font-bold">${selectedOrder.status}</span>
            </div>
          </div>

          <table class="border-dashed-bottom">
            <thead>
              <tr>
                <th style="text-align: left;">Item</th>
                <th style="text-align: right; width: 40px;">Qty</th>
                <th style="text-align: right; width: 70px;">Price</th>
                <th style="text-align: right; width: 80px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="grand-total">
            <span>GRAND TOTAL:</span>
            <span>₹${selectedOrder.total.toFixed(2)}</span>
          </div>

          <div class="text-center footer">
            <p class="font-bold" style="margin: 0 0 2px 0;">Thank you for dining with serveMe!</p>
            <p style="margin: 0 0 8px 0;">Please visit us again soon.</p>
            <p style="margin: 0; font-size: 9px; color: #666;">GST Compliant Invoice</p>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    doc.close();

    // Remove the iframe after the print dialog is handled
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1500);
  };

  const getPresetRange = (preset: DatePreset): { start: Date | null; end: Date | null } => {
    const now = new Date();
    switch (preset) {
      case 'today': {
        const today = startOfDay(now);
        const end = endOfDay(now);
        return { start: today, end };
      }
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      }
      case 'last7': {
        const last7 = new Date(now);
        last7.setDate(now.getDate() - 6);
        return { start: startOfDay(last7), end: endOfDay(now) };
      }
      case 'last30': {
        const last30 = new Date(now);
        last30.setDate(now.getDate() - 29);
        return { start: startOfDay(last30), end: endOfDay(now) };
      }
      case 'thisMonth': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: startOfDay(startOfMonth), end: endOfDay(now) };
      }
      case 'custom': {
        const start = customStartDate ? startOfDay(new Date(customStartDate)) : null;
        const end = customEndDate ? endOfDay(new Date(customEndDate)) : null;
        return { start, end };
      }
      case 'all':
      default:
        return { start: null, end: null };
    }
  };

  const { start: dateFilterStart, end: dateFilterEnd } = getPresetRange(datePreset);

  // Filter orders by date range first
  const dateFilteredOrders = orders.filter((order) => {
    if (datePreset === 'all') return true;
    const orderDate = parseOrderDate(order.date);
    if (dateFilterStart && orderDate < dateFilterStart) return false;
    if (dateFilterEnd && orderDate > dateFilterEnd) return false;
    return true;
  });

  // Filter by search term
  const filteredOrders = dateFilteredOrders.filter((order) => {
    const term = searchTerm.toLowerCase();
    const matchesId = order.id.toLowerCase().includes(term);
    const matchesName = order.customerName.toLowerCase().includes(term);
    const matchesMobile = order.mobileNumber ? order.mobileNumber.toLowerCase().includes(term) : false;
    return matchesId || matchesName || matchesMobile;
  });

  // Calculate timeframe-based performance metrics
  const totalRevenue = dateFilteredOrders.reduce((sum, order) => {
    if (order.status !== 'Cancelled') {
      return sum + order.total;
    }
    return sum;
  }, 0);

  const totalOrdersCount = dateFilteredOrders.length;
  const completedOrdersCount = dateFilteredOrders.filter(o => o.status === 'Completed').length;
  const preparingOrdersCount = dateFilteredOrders.filter(o => o.status === 'Preparing').length;
  const cancelledOrdersCount = dateFilteredOrders.filter(o => o.status === 'Cancelled').length;
  const pendingPaymentOrdersCount = dateFilteredOrders.filter(o => o.status === 'Pending Payment').length;

  const averageOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
  const cancellationRate = totalOrdersCount > 0 ? (cancelledOrdersCount / totalOrdersCount) * 100 : 0;

  // Dynamic calculation for Peak Hour
  const hourCounts: Record<number, number> = {};
  dateFilteredOrders.forEach(order => {
    const d = parseOrderDate(order.date);
    const hr = d.getHours();
    hourCounts[hr] = (hourCounts[hr] || 0) + 1;
  });

  let peakHour = 18; // Default to 6 PM (18:00) if no orders
  let maxCount = 0;
  Object.entries(hourCounts).forEach(([hr, count]) => {
    if (count > maxCount) {
      maxCount = count;
      peakHour = parseInt(hr, 10);
    }
  });

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12} ${ampm}`;
  };

  const peakHourStr = dateFilteredOrders.length === 0 
    ? "N/A" 
    : `${formatHour(peakHour)} - ${formatHour((peakHour + 1) % 24)}`;

  // Handle Export CSV
  const handleExportCSV = () => {
    if (orders.length === 0) return;

    const csvRows = [
      ['Date', 'Order ID', 'Customer Name', 'Mobile Number', 'Amount'].join(','),
      ...orders.map(order => [
        `"${order.date}"`,
        `"${order.id}"`,
        `"${order.customerName.replace(/"/g, '""')}"`,
        `"${(order.mobileNumber || '').replace(/"/g, '""')}"`,
        order.total.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sales_report.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete all orders
  const handleDeleteAll = () => {
    setOrders([]);
    setShowConfirmDeleteAll(false);
  };

  // Delete specific order
  const handleDeleteOrder = (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    setOrderToDelete(null);
  };

  return (
    <div className="pt-8 pb-24 md:pb-12 max-w-7xl mx-auto px-4 md:px-8 select-none">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Sales Report</h1>
          <p className="text-sm text-slate-500 mt-1">
            View and export your recent sales and order history.
          </p>
        </div>
        
        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfirmDeleteAll(true)}
            disabled={orders.length === 0}
            className={`flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer shadow-sm transition-colors`}
          >
            <Trash2 className="w-4 h-4" />
            Delete All
          </button>
          <button
            onClick={handleExportCSV}
            disabled={orders.length === 0}
            className={`flex items-center gap-1.5 bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer shadow-sm transition-colors`}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Date Range Picker Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 shadow-xs select-none no-print">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
            <Calendar className="w-4 h-4 text-[#f97316]" />
            <span>Timeframe:</span>
          </div>
          
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'today', 'yesterday', 'last7', 'last30', 'thisMonth', 'custom'] as const).map((preset) => {
              const label = preset === 'all' ? 'All Time' 
                          : preset === 'today' ? 'Today'
                          : preset === 'yesterday' ? 'Yesterday'
                          : preset === 'last7' ? '7 Days'
                          : preset === 'last30' ? '30 Days'
                          : preset === 'thisMonth' ? 'This Month'
                          : 'Custom';
              return (
                <button
                  key={preset}
                  onClick={() => setDatePreset(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    datePreset === preset 
                      ? 'bg-[#f97316] text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 animate-fade-in self-start md:self-auto">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#f97316] focus:border-[#f97316]"
            />
            <span className="text-xs text-slate-400 font-semibold">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#f97316] focus:border-[#f97316]"
            />
          </div>
        )}
      </div>

      {/* Performance metrics panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 no-print">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sales</span>
            <h3 className="text-2xl font-black text-slate-800">₹{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-slate-500">From {completedOrdersCount} completed orders</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Orders</span>
            <h3 className="text-2xl font-black text-slate-800">{totalOrdersCount}</h3>
            <p className="text-[10px] text-slate-500">
              {pendingPaymentOrdersCount > 0 ? `${pendingPaymentOrdersCount} pending • ` : ''}
              {preparingOrdersCount} preparing • {cancelledOrdersCount} cancelled
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg. Order Value</span>
            <h3 className="text-2xl font-black text-slate-800">₹{averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-slate-500">Average spend per ticket</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-[#f97316] shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Peak Hours */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Peak Hours</span>
            <h3 className="text-2xl font-black text-slate-800">{peakHourStr}</h3>
            <p className="text-[10px] text-slate-500">
              {totalOrdersCount > 0 ? `${maxCount} order(s) in this window` : 'No orders recorded'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Cancellation Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cancellation Rate</span>
            <h3 className="text-2xl font-black text-slate-800">{cancellationRate.toFixed(1)}%</h3>
            <p className="text-[10px] text-slate-500">{cancelledOrdersCount} order(s) cancelled</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shrink-0">
            <Percent className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs no-print">
        
        {/* Table Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-sm font-semibold text-slate-600">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer or ID."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 w-full sm:w-64 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#f97316] focus:border-[#f97316] transition-all"
            />
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/20 border-b border-slate-100">
                <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Name</th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Mobile Number</th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredOrders.map((order) => (
                <tr 
                  key={order.id} 
                  className="hover:bg-slate-50/40 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {order.date}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">
                    {order.id}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700">
                    {order.customerName}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {order.mobileNumber || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    ₹{order.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      order.status === 'Pending Payment'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : order.status === 'Preparing' 
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : order.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-[#f97316] hover:text-[#ea580c] cursor-pointer mr-4 transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => setOrderToDelete(order)}
                      className="text-red-500 hover:text-red-600 cursor-pointer transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-sm text-slate-400 italic">
                    {orders.length === 0 ? "No orders on record." : "No orders found matching your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Delete All Confirmation Modal */}
      {showConfirmDeleteAll && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 border border-slate-100 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete All Orders</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to delete all order records? This action is permanent and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDeleteAll(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Order Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 border border-slate-100 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Order</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to delete order <span className="font-semibold text-slate-800">{orderToDelete.id}</span> for <span className="font-semibold text-slate-800">{orderToDelete.customerName}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setOrderToDelete(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteOrder(orderToDelete.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in no-print">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden border border-slate-100 shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Order Details</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedOrder.id}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer</span>
                <span className="text-sm font-bold text-slate-800">{selectedOrder.customerName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mobile</span>
                <span className="text-sm text-slate-600">{selectedOrder.mobileNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</span>
                <span className="text-sm text-slate-600">{selectedOrder.date}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment Mode</span>
                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs uppercase">
                  {selectedOrder.paymentMode || 'UPI'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  selectedOrder.status === 'Pending Payment'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : selectedOrder.status === 'Preparing' 
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : selectedOrder.status === 'Completed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {selectedOrder.status}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Items Ordered
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500">Qty: {item.quantity} × ₹{item.price.toFixed(2)}</p>
                      </div>
                      <span className="font-bold text-slate-800">₹{(item.quantity * item.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-800">Total Paid Amount</span>
                <span className="text-xl font-extrabold text-[#f97316]">₹{selectedOrder.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
              <button 
                onClick={handlePrint}
                className="flex-1 bg-[#f97316] hover:bg-[#ea580c] text-white py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                Print Bill
              </button>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-950 text-white py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Section (Hidden on screen, optimized for printer) */}
      {selectedOrder && (
        <div id="print-receipt-section" className="hidden print:block font-mono text-black text-sm max-w-sm mx-auto p-4 bg-white">
          <div className="text-center space-y-1 pb-4 border-b border-dashed border-neutral-400">
            <h2 className="text-xl font-bold tracking-tight">serveMe Restaurant</h2>
            <p className="text-xs text-neutral-500">123 Food Street, Culinary Capital</p>
            <p className="text-xs text-neutral-500">Ph: +1 234-567-8900</p>
          </div>

          <div className="py-4 space-y-1.5 border-b border-dashed border-neutral-400 text-xs">
            <div className="flex justify-between">
              <span>Date:</span>
              <span className="font-medium">{selectedOrder.date}</span>
            </div>
            <div className="flex justify-between">
              <span>Receipt ID:</span>
              <span className="font-medium">{selectedOrder.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer Name:</span>
              <span className="font-semibold">{selectedOrder.customerName}</span>
            </div>
            {selectedOrder.mobileNumber && (
              <div className="flex justify-between">
                <span>Contact:</span>
                <span className="font-medium">{selectedOrder.mobileNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Payment Mode:</span>
              <span className="font-semibold uppercase">{selectedOrder.paymentMode || 'UPI'}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Status:</span>
              <span className="font-semibold">{selectedOrder.status}</span>
            </div>
          </div>

          <div className="py-4 border-b border-dashed border-neutral-400">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-300">
                  <th className="text-left pb-1">Item Description</th>
                  <th className="text-right pb-1">Qty</th>
                  <th className="text-right pb-1">Price</th>
                  <th className="text-right pb-1">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {selectedOrder.items.map((item, idx) => (
                  <tr key={idx} className="py-1">
                    <td className="py-1 font-medium">{item.name}</td>
                    <td className="text-right py-1">{item.quantity}</td>
                    <td className="text-right py-1">₹{item.price.toFixed(2)}</td>
                    <td className="text-right py-1 font-bold">₹{(item.quantity * item.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="py-4 space-y-1.5 text-sm">
            <div className="flex justify-between font-bold text-base border-t border-dashed border-neutral-400 pt-2">
              <span>GRAND TOTAL:</span>
              <span>₹{selectedOrder.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-center pt-8 pb-4 space-y-1 text-xs border-t border-dashed border-neutral-400 mt-6">
            <p className="font-semibold">Thank you for dining with serveMe!</p>
            <p className="text-neutral-500">Please visit us again soon.</p>
            <p className="text-[10px] text-neutral-400 mt-2">GST Compliant Invoice</p>
          </div>
        </div>
      )}

      {/* Global CSS Styles for Printing */}
      <style>{`
        @media print {
          /* Hide everything outside of print-receipt-section */
          body * {
            visibility: hidden !important;
          }
          #print-receipt-section, #print-receipt-section * {
            visibility: visible !important;
          }
          #print-receipt-section {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: white !important;
            color: black !important;
          }
          /* Remove header/footer margin defaults in printers if possible */
          @page {
            margin: 0.5cm;
          }
        }
      `}</style>

    </div>
  );
}
