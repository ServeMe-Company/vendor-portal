import React, { useState, useEffect } from 'react';
import { RestaurantTable } from '../types';
import { 
  Plus, 
  QrCode, 
  Download, 
  Printer, 
  Eye, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Copy, 
  Check, 
  X,
  AlertTriangle
} from 'lucide-react';

export default function TableManagement() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);

  // QR Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [qrModalData, setQrModalData] = useState<{
    table: RestaurantTable;
    qrDataUrl?: string;
    targetUrl?: string;
    loading?: boolean;
  } | null>(null);

  // Form Inputs
  const [formTableNumber, setFormTableNumber] = useState<string>('');
  const [formTableName, setFormTableName] = useState<string>('');
  const [formCapacity, setFormCapacity] = useState<string>('4');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Copy Feedback State
  const [copiedToken, setCopiedToken] = useState<boolean>(false);

  // Load Tables from Backend
  const fetchTables = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/tables');
      if (!res.ok) {
        throw new Error(`Failed to load tables (${res.status})`);
      }
      const data = await res.json();
      setTables(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching tables:', err);
      setError(err.message || 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // Reset Form
  const resetForm = () => {
    setFormTableNumber('');
    setFormTableName('');
    setFormCapacity('4');
    setFormError(null);
  };

  // Open Add Modal
  const openAddModal = () => {
    resetForm();
    // Auto-suggest next table number
    const maxTableNum = tables.reduce((max, t) => (t.tableNumber > max ? t.tableNumber : max), 0);
    const nextNum = maxTableNum + 1;
    setFormTableNumber(String(nextNum));
    setFormTableName(`Table ${nextNum}`);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (table: RestaurantTable) => {
    setEditingTable(table);
    setFormTableNumber(String(table.tableNumber));
    setFormTableName(table.tableName);
    setFormCapacity(String(table.capacity));
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Validate Form
  const validateForm = (): boolean => {
    if (!formTableNumber || isNaN(Number(formTableNumber)) || Number(formTableNumber) <= 0) {
      setFormError('Please enter a valid Table Number.');
      return false;
    }
    if (!formTableName.trim()) {
      setFormError('Please enter a Table Name.');
      return false;
    }
    if (!formCapacity || isNaN(Number(formCapacity)) || Number(formCapacity) <= 0) {
      setFormError('Please enter a valid Capacity.');
      return false;
    }
    setFormError(null);
    return true;
  };

  // Add Table Submit
  const handleAddTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/vendor/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: Number(formTableNumber),
          tableName: formTableName.trim(),
          capacity: Number(formCapacity)
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add table');
      }

      const newTable = await res.json();
      setTables(prev => [...prev, newTable]);
      setIsAddModalOpen(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Error adding table');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Table Submit (No QR token regeneration)
  const handleEditTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable || !validateForm()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/vendor/tables/${editingTable.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: Number(formTableNumber),
          tableName: formTableName.trim(),
          capacity: Number(formCapacity)
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update table');
      }

      const updatedTable = await res.json();
      setTables(prev => prev.map(t => (t.id === updatedTable.id ? updatedTable : t)));
      setIsEditModalOpen(false);
      setEditingTable(null);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Error updating table');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Table Status (Activate/Deactivate)
  const handleToggleStatus = async (table: RestaurantTable) => {
    try {
      const newStatus = !table.isActive;
      const res = await fetch(`/api/vendor/tables/${table.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus })
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }

      const updated = await res.json();
      setTables(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    } catch (err: any) {
      alert(err.message || 'Failed to toggle table status.');
    }
  };

  // Delete Table with Confirmation
  const handleDeleteTable = async (table: RestaurantTable) => {
    const confirmed = window.confirm(`Are you sure you want to delete ${table.tableName}?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/vendor/tables/${table.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete table');
      }

      setTables(prev => prev.filter(t => t.id !== table.id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete table.');
    }
  };

  // Regenerate QR with Confirmation
  const handleRegenerateQr = async (table: RestaurantTable) => {
    const confirmed = window.confirm(
      `Regenerating the QR code for ${table.tableName} will invalidate any previously printed QR cards. Do you want to proceed?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/vendor/tables/${table.id}/regenerate-qr`, {
        method: 'POST'
      });

      if (!res.ok) {
        throw new Error('Failed to regenerate QR code');
      }

      const updatedTable = await res.json();
      setTables(prev => prev.map(t => (t.id === updatedTable.id ? updatedTable : t)));

      // If view modal is open for this table, refresh modal
      if (qrModalData?.table.id === table.id) {
        handleViewQr(updatedTable);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate QR code.');
    }
  };

  // View QR Modal
  const handleViewQr = async (table: RestaurantTable) => {
    setQrModalData({ table, loading: true });
    setIsQrModalOpen(true);

    try {
      const res = await fetch(`/api/vendor/tables/${table.id}/qr`);
      if (!res.ok) {
        throw new Error('Failed to load QR details');
      }
      const data = await res.json();
      let finalTargetUrl = data.targetUrl || '';
      if (finalTargetUrl.includes('localhost') || finalTargetUrl.includes('127.0.0.1')) {
        finalTargetUrl = finalTargetUrl.replace(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, 'https://qr-menu.serveme.in');
      }
      setQrModalData({
        table,
        qrDataUrl: data.qrDataUrl,
        targetUrl: finalTargetUrl,
        loading: false
      });
    } catch (err: any) {
      console.error('QR fetch error:', err);
      // Fallback preview
      const qrMenuBaseUrl = 'https://qr-menu.serveme.in';
      const targetUrl = `${qrMenuBaseUrl}/?qr=${table.qrToken}`;
      setQrModalData({
        table,
        targetUrl,
        loading: false
      });
    }
  };

  // Download QR Code
  const handleDownloadQr = (table: RestaurantTable) => {
    window.location.href = `/api/vendor/tables/${table.id}/download`;
  };

  // Print QR Card Page
  const handlePrintQr = (table: RestaurantTable) => {
    window.open(`/api/vendor/tables/${table.id}/print`, '_blank');
  };

  // Copy Link
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Summary Metrics
  const activeTablesCount = tables.filter(t => t.isActive).length;
  const totalCapacity = tables.reduce((acc, t) => acc + (t.capacity || 0), 0);

  return (
    <div className="pt-20 pb-24 px-4 md:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-700/50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <QrCode className="w-6 h-6 text-orange-400" />
            Table & QR Code Management
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Manage restaurant seating tables, generate digital QR dining codes, and monitor table availability.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md active:scale-95 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add New Table
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Tables</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{tables.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
            <QrCode className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Tables</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{activeTablesCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Seating Capacity</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCapacity} Guests</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-3" />
          <p className="font-medium text-sm">Loading restaurant tables...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={fetchTables}
            className="text-xs bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : tables.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
            <QrCode className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Dining Tables Configured</h3>
          <p className="text-slate-500 text-sm">
            Add restaurant tables to generate unique QR codes for customer ordering & digital payments.
          </p>
          <button
            onClick={openAddModal}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add First Table
          </button>
        </div>
      ) : (
        /* Tables List Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map(table => (
            <div
              key={table.id}
              className={`bg-white rounded-2xl border transition-all shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden ${
                table.isActive ? 'border-slate-200' : 'border-slate-200 opacity-75 bg-slate-50/50'
              }`}
            >
              {/* Card Top */}
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-extrabold text-lg flex items-center justify-center shadow-inner">
                      #{table.tableNumber}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-tight">
                        {table.tableName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <Users className="w-3.5 h-3.5" />
                          Capacity: {table.capacity}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Active / Inactive Badge */}
                  <button
                    onClick={() => handleToggleStatus(table)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                      table.isActive
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                    title="Click to toggle table active status"
                  >
                    {table.isActive ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-slate-500" />
                        Inactive
                      </>
                    )}
                  </button>
                </div>

                {/* QR Token Box Preview */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div className="truncate mr-2 font-mono text-slate-600">
                    <span className="text-slate-400 mr-1">Token:</span>
                    {table.qrToken ? `${table.qrToken.slice(0, 14)}...` : 'N/A'}
                  </div>
                  <button
                    onClick={() => handleViewQr(table)}
                    className="text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </button>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="bg-slate-50 border-t border-slate-100 px-5 py-3.5 flex items-center justify-between gap-2">
                {/* QR Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleViewQr(table)}
                    className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                    title="View QR Code"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownloadQr(table)}
                    className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                    title="Download QR PNG"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePrintQr(table)}
                    className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                    title="Print QR Card Page"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRegenerateQr(table)}
                    className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-100/60 rounded-lg transition-colors cursor-pointer"
                    title="Regenerate QR Token"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Edit & Delete Actions */}
                <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                  <button
                    onClick={() => openEditModal(table)}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit Table Details"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTable(table)}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete Table"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== ADD TABLE MODAL ==================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-500" />
                Add New Table
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTableSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Table Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formTableNumber}
                  onChange={e => {
                    setFormTableNumber(e.target.value);
                    if (!formTableName || formTableName.startsWith('Table ')) {
                      setFormTableName(`Table ${e.target.value}`);
                    }
                  }}
                  placeholder="e.g. 1"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Table Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTableName}
                  onChange={e => setFormTableName(e.target.value)}
                  placeholder="e.g. Table 1 or VIP Lounge"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Capacity (Guests) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formCapacity}
                  onChange={e => setFormCapacity(e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Save Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== EDIT TABLE MODAL ==================== */}
      {isEditModalOpen && editingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-500" />
                Edit Table Details
              </h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingTable(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTableSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Table Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formTableNumber}
                  onChange={e => setFormTableNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Table Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTableName}
                  onChange={e => setFormTableName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Capacity (Guests) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formCapacity}
                  onChange={e => setFormCapacity(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                Note: Updating table details preserves the existing QR code token.
              </p>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTable(null);
                  }}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                  Update Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== VIEW QR CODE MODAL ==================== */}
      {isQrModalOpen && qrModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <QrCode className="w-5 h-5 text-orange-500" />
                {qrModalData.table.tableName} QR Code
              </h3>
              <button
                onClick={() => {
                  setIsQrModalOpen(false);
                  setQrModalData(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {qrModalData.loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
                  <p className="text-xs">Generating QR Image...</p>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl inline-block">
                    {qrModalData.qrDataUrl ? (
                      <img
                        src={qrModalData.qrDataUrl}
                        alt={`QR Code for ${qrModalData.table.tableName}`}
                        className="w-52 h-52 mx-auto rounded-lg"
                      />
                    ) : (
                      <div className="w-52 h-52 bg-slate-200 flex items-center justify-center text-slate-400 text-xs rounded-lg">
                        QR Preview Unavailable
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Scan to View Menu</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Customers scan this QR code at Table #{qrModalData.table.tableNumber} to view menu & place orders.
                    </p>
                  </div>

                  {qrModalData.targetUrl && (
                    <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200 text-xs">
                      <span className="truncate flex-1 font-mono text-slate-600 text-left px-1">
                        {qrModalData.targetUrl}
                      </span>
                      <button
                        onClick={() => handleCopyLink(qrModalData.targetUrl!)}
                        className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 shrink-0 cursor-pointer"
                        title="Copy QR Menu URL"
                      >
                        {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}

                  {/* Actions inside modal */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => handleDownloadQr(qrModalData.table)}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PNG
                    </button>
                    <button
                      onClick={() => handlePrintQr(qrModalData.table)}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Card
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
