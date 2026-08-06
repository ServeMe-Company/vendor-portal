import React, { useState, useEffect } from 'react';
import { X, Printer, Edit3, Save, CheckCircle, AlertCircle, Building2, User, Phone, MapPin, FileText } from 'lucide-react';
import { Order } from '../types';

interface EditBillPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onOrderUpdated?: (updatedOrder: Order) => void;
}

export default function EditBillPrintModal({ isOpen, onClose, order, onOrderUpdated }: EditBillPrintModalProps) {
  const [customerName, setCustomerName] = useState<string>('');
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [restaurantName, setRestaurantName] = useState<string>('serveMe Restaurant');
  const [restaurantAddress, setRestaurantAddress] = useState<string>('123 Food Street, Culinary Capital');
  const [restaurantPhone, setRestaurantPhone] = useState<string>('+1 234-567-8900');
  const [footerNote, setFooterNote] = useState<string>('Thank you for dining with serveMe!\nPlease visit us again soon.');

  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Prefill order & restaurant details on open
  useEffect(() => {
    if (!isOpen || !order) return;

    setCustomerName(order.customerName || 'Guest');
    setMobileNumber(order.mobileNumber || '');
    setMessage(null);

    // Fetch restaurant print settings
    fetch('/api/vendor/settings/restaurant')
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.name) setRestaurantName(data.name);
          if (data.address) setRestaurantAddress(data.address);
          if (data.phone) setRestaurantPhone(data.phone);
          if (data.footerNote) setFooterNote(data.footerNote);
        }
      })
      .catch(err => console.debug('Failed to load restaurant settings:', err));
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  // Calculate items subtotal, GST, service charge, and total
  const itemsList = Array.isArray(order.items) ? order.items : [];
  const subtotal = order.subtotal ?? itemsList.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const gstAmount = order.gstAmount ?? Number(((subtotal * (order.gstPercentage ?? 18)) / 100).toFixed(2));
  const serviceChargeAmount = order.serviceChargeAmount ?? Number(((subtotal * (order.serviceChargePercentage ?? 5)) / 100).toFixed(2));
  const grandTotal = order.total ?? Number((subtotal + gstAmount + serviceChargeAmount).toFixed(2));

  // Save changes to order & restaurant settings
  const handleSaveChanges = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // 1. Update order customer details
      const orderRes = await fetch(`/api/vendor/orders/${order.id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          mobileNumber,
        }),
      });

      // 2. Update restaurant info
      await fetch('/api/vendor/settings/restaurant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: restaurantName,
          address: restaurantAddress,
          phone: restaurantPhone,
          footerNote,
        }),
      });

      if (orderRes.ok) {
        const updatedOrder: Order = await orderRes.json();
        setMessage({ type: 'success', text: 'Bill details updated and saved successfully!' });
        if (onOrderUpdated) {
          onOrderUpdated(updatedOrder);
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to update order details.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error saving changes.' });
    } finally {
      setSaving(false);
    }
  };

  // Print thermal receipt with edited details
  const handlePrintReceipt = () => {
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

    const itemsHtml = itemsList.map(item => `
      <tr style="border-bottom: 1px dashed #e2e8f0;">
        <td style="padding: 6px 0; text-align: left;">${item.name}</td>
        <td style="padding: 6px 0; text-align: right;">${item.quantity}</td>
        <td style="padding: 6px 0; text-align: right;">₹${Number(item.price).toFixed(2)}</td>
        <td style="padding: 6px 0; text-align: right; font-weight: bold;">₹${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `).join('');

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Receipt - ${order.id}</title>
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
              white-space: pre-line;
            }
          </style>
        </head>
        <body>
          <div class="text-center border-dashed-bottom">
            <h2 style="margin: 0 0 4px 0; font-size: 18px;">${restaurantName}</h2>
            ${restaurantAddress ? `<p style="margin: 0 0 2px 0; font-size: 11px;">${restaurantAddress}</p>` : ''}
            ${restaurantPhone ? `<p style="margin: 0; font-size: 11px;">Ph: ${restaurantPhone}</p>` : ''}
          </div>

          <div class="border-dashed-bottom">
            <div class="flex-between">
              <span>Date:</span>
              <span class="font-bold">${order.date || new Date().toISOString()}</span>
            </div>
            <div class="flex-between">
              <span>Receipt ID:</span>
              <span class="font-bold">${order.id}</span>
            </div>
            <div class="flex-between">
              <span>Customer:</span>
              <span class="font-bold">${customerName}</span>
            </div>
            ${mobileNumber ? `
              <div class="flex-between">
                <span>Contact:</span>
                <span class="font-bold">${mobileNumber}</span>
              </div>
            ` : ''}
            <div class="flex-between">
              <span>Payment Mode:</span>
              <span class="font-bold uppercase">${order.paymentMethod || order.paymentMode || 'UPI'}</span>
            </div>
            <div class="flex-between">
              <span>Status:</span>
              <span class="font-bold">${order.status}</span>
            </div>
          </div>

          <table class="border-dashed-bottom">
            <thead>
              <tr>
                <th style="text-align: left;">Item</th>
                <th style="text-align: right;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="border-dashed-bottom">
            <div class="flex-between">
              <span>Subtotal:</span>
              <span>₹${subtotal.toFixed(2)}</span>
            </div>
            ${gstAmount > 0 ? `
              <div class="flex-between">
                <span>GST Tax (${order.gstPercentage ?? 18}%):</span>
                <span>₹${gstAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            ${serviceChargeAmount > 0 ? `
              <div class="flex-between">
                <span>Service Charge (${order.serviceChargePercentage ?? 5}%):</span>
                <span>₹${serviceChargeAmount.toFixed(2)}</span>
              </div>
            ` : ''}
          </div>

          <div class="grand-total">
            <span>GRAND TOTAL:</span>
            <span>₹${grandTotal.toFixed(2)}</span>
          </div>

          <div class="footer text-center">
            <p style="margin: 0;">${footerNote}</p>
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

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Edit Bill & Print Options</h2>
              <p className="text-xs text-slate-500">Edit customer info, restaurant header & footer before printing bill #{order.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2 Column Layout (Form + Receipt Preview) */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Edit Form Fields */}
          <div className="lg:col-span-7 space-y-5">
            {message && (
              <div
                className={`p-3.5 rounded-xl flex items-center gap-2.5 text-sm font-medium ${
                  message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {/* Customer Details Section */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <User className="w-4 h-4 text-orange-500" />
                <span>Customer Order Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="Customer Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mobile / Phone Number</label>
                  <input
                    type="text"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="e.g. +91 9876543210"
                  />
                </div>
              </div>
            </div>

            {/* Restaurant Header Section */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Building2 className="w-4 h-4 text-orange-500" />
                <span>Restaurant Bill Header Info</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Restaurant Name</label>
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="Restaurant Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Restaurant Address</label>
                  <input
                    type="text"
                    value={restaurantAddress}
                    onChange={(e) => setRestaurantAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="Street, City, Zip"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={restaurantPhone}
                    onChange={(e) => setRestaurantPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="Ph: +1 234-567-8900"
                  />
                </div>
              </div>
            </div>

            {/* Custom Receipt Footer Message */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <FileText className="w-4 h-4 text-orange-500" />
                <span>Custom Receipt Footer Note</span>
              </div>

              <div>
                <textarea
                  rows={2}
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="Thank you message..."
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live Receipt Preview Box */}
          <div className="lg:col-span-5 bg-slate-100 p-4 rounded-xl border border-slate-200 flex flex-col items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Live Receipt Preview</span>

            <div className="bg-white p-5 rounded-lg border border-slate-300 shadow-md w-full max-w-sm font-mono text-xs text-slate-900 space-y-3 leading-tight">
              {/* Receipt Header */}
              <div className="text-center border-b border-dashed border-slate-400 pb-3 space-y-1">
                <h3 className="font-bold text-sm text-slate-900">{restaurantName || 'Restaurant Name'}</h3>
                {restaurantAddress && <p className="text-[10px] text-slate-600">{restaurantAddress}</p>}
                {restaurantPhone && <p className="text-[10px] text-slate-600">Ph: {restaurantPhone}</p>}
              </div>

              {/* Receipt Metadata */}
              <div className="border-b border-dashed border-slate-400 pb-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-bold">{order.date ? order.date.slice(0, 10) : 'Today'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt ID:</span>
                  <span className="font-bold">{order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold">{customerName || 'Guest'}</span>
                </div>
                {mobileNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Contact:</span>
                    <span className="font-bold">{mobileNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment:</span>
                  <span className="font-bold uppercase">{order.paymentMethod || order.paymentMode || 'UPI'}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border-b border-dashed border-slate-400 pb-3 space-y-1.5">
                <div className="flex justify-between font-bold border-b border-slate-300 pb-1 text-[11px]">
                  <span className="w-1/2">Item</span>
                  <span className="w-1/6 text-right">Qty</span>
                  <span className="w-1/3 text-right">Total</span>
                </div>
                {itemsList.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="w-1/2 truncate">{item.name}</span>
                    <span className="w-1/6 text-right">{item.quantity}</span>
                    <span className="w-1/3 text-right font-bold">₹{(item.quantity * item.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {gstAmount > 0 && (
                  <div className="flex justify-between">
                    <span>GST ({order.gstPercentage ?? 18}%):</span>
                    <span>₹{gstAmount.toFixed(2)}</span>
                  </div>
                )}
                {serviceChargeAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Service Charge ({order.serviceChargePercentage ?? 5}%):</span>
                    <span>₹{serviceChargeAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-extrabold border-t border-dashed border-slate-400 pt-2 text-slate-950">
                  <span>GRAND TOTAL:</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="text-center pt-2 text-[10px] text-slate-600 whitespace-pre-line border-t border-slate-200">
                <p>{footerNote}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/80">
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors shadow-2xs"
          >
            <Save className="w-4 h-4 text-orange-500" />
            {saving ? 'Saving...' : 'Save & Update Database'}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePrintReceipt}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all shadow-md shadow-orange-500/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Edited Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
