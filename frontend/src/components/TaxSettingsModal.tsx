import React, { useState, useEffect } from 'react';
import { X, Receipt, CheckCircle, AlertCircle, Trash2, Percent, DollarSign } from 'lucide-react';
import { TaxSettings } from '../types';

interface TaxSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: (updatedSettings: TaxSettings) => void;
}

export default function TaxSettingsModal({ isOpen, onClose, onSettingsSaved }: TaxSettingsModalProps) {
  const [enableGst, setEnableGst] = useState<boolean>(true);
  const [gstPercentage, setGstPercentage] = useState<number>(18);
  const [enableServiceCharge, setEnableServiceCharge] = useState<boolean>(true);
  const [serviceChargePercentage, setServiceChargePercentage] = useState<number>(5);

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch current tax settings on open
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setMessage(null);

    fetch('/api/vendor/settings/tax')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setEnableGst(data.enableGst !== false);
          setGstPercentage(typeof data.gstPercentage === 'number' ? data.gstPercentage : 18);
          setEnableServiceCharge(data.enableServiceCharge !== false);
          setServiceChargePercentage(typeof data.serviceChargePercentage === 'number' ? data.serviceChargePercentage : 5);
        }
      })
      .catch((err) => {
        console.error('Failed to load tax settings:', err);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  // Live bill preview calculation on a sample ₹100 order
  const sampleSubtotal = 100;
  const calculatedGst = enableGst ? Number(((sampleSubtotal * Math.max(0, gstPercentage)) / 100).toFixed(2)) : 0;
  const calculatedService = enableServiceCharge ? Number(((sampleSubtotal * Math.max(0, serviceChargePercentage)) / 100).toFixed(2)) : 0;
  const sampleTotal = Number((sampleSubtotal + calculatedGst + calculatedService).toFixed(2));

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        enableGst,
        gstPercentage: enableGst ? Math.max(0, gstPercentage) : 0,
        enableServiceCharge,
        serviceChargePercentage: enableServiceCharge ? Math.max(0, serviceChargePercentage) : 0,
      };

      const res = await fetch('/api/vendor/settings/tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Tax and Service Charge settings updated successfully!' });
        if (onSettingsSaved) {
          onSettingsSaved(payload);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error saving settings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Tax & Bill Charge Settings</h2>
              <p className="text-xs text-slate-500">Edit or remove GST tax and service charges for QR menu bills</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
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

          {loading ? (
            <div className="py-8 text-center text-slate-400 text-sm">Loading tax settings...</div>
          ) : (
            <>
              {/* GST Tax Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-orange-500" />
                    <span className="font-bold text-slate-800 text-sm">GST Tax Rate</span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableGst}
                      onChange={(e) => setEnableGst(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    <span className="ml-2 text-xs font-semibold text-slate-600">
                      {enableGst ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>

                {enableGst ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={gstPercentage}
                        onChange={(e) => setGstPercentage(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        placeholder="GST Tax %"
                      />
                      <span className="text-sm font-bold text-slate-600">%</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[5, 12, 18, 28].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setGstPercentage(rate)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                            gstPercentage === rate
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {rate}%
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setEnableGst(false);
                          setGstPercentage(0);
                        }}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Remove GST
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-rose-600 font-medium">GST tax is removed and will not be charged to customers on bills.</p>
                )}
              </div>

              {/* Service Charge Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-orange-500" />
                    <span className="font-bold text-slate-800 text-sm">Service Charge Rate</span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableServiceCharge}
                      onChange={(e) => setEnableServiceCharge(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    <span className="ml-2 text-xs font-semibold text-slate-600">
                      {enableServiceCharge ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>

                {enableServiceCharge ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={serviceChargePercentage}
                        onChange={(e) => setServiceChargePercentage(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        placeholder="Service Charge %"
                      />
                      <span className="text-sm font-bold text-slate-600">%</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[0, 2.5, 5, 10].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => {
                            if (rate === 0) {
                              setEnableServiceCharge(false);
                              setServiceChargePercentage(0);
                            } else {
                              setEnableServiceCharge(true);
                              setServiceChargePercentage(rate);
                            }
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                            enableServiceCharge && serviceChargePercentage === rate
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {rate}%
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setEnableServiceCharge(false);
                          setServiceChargePercentage(0);
                        }}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Remove Service Charge
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-rose-600 font-medium">Service charge is removed and will not be charged to customers on bills.</p>
                )}
              </div>

              {/* Sample Bill Calculation Preview */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sample Bill Preview (₹100 Item)</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Item Subtotal</span>
                    <span className="font-semibold font-mono">₹100.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST Tax {enableGst ? `(${gstPercentage}%)` : '(Disabled)'}</span>
                    <span className={`font-semibold font-mono ${enableGst ? 'text-slate-900' : 'text-rose-500'}`}>
                      {enableGst ? `₹${calculatedGst.toFixed(2)}` : '₹0.00 (Removed)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Charge {enableServiceCharge ? `(${serviceChargePercentage}%)` : '(Disabled)'}</span>
                    <span className={`font-semibold font-mono ${enableServiceCharge ? 'text-slate-900' : 'text-rose-500'}`}>
                      {enableServiceCharge ? `₹${calculatedService.toFixed(2)}` : '₹0.00 (Removed)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-100 pt-2">
                    <span>Grand Total</span>
                    <span className="font-mono text-orange-600">₹{sampleTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-orange-500/20"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
