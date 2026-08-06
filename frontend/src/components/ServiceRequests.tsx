import React, { useState, useEffect } from 'react';
import { ServiceRequest } from '../types';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  Check, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  AlertCircle, 
  MessageSquare,
  Sparkles,
  Volume2
} from 'lucide-react';

export default function ServiceRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Accepted' | 'Completed'>('All');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Fetch Requests from Backend
  const fetchRequests = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/service-requests');
      if (!res.ok) {
        throw new Error(`Failed to load service requests (${res.status})`);
      }
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching service requests:', err);
      if (!isSilent) setError(err.message || 'Failed to load service requests');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // Auto refresh every 5 seconds for live notifications
    const interval = setInterval(() => {
      fetchRequests(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update Status (Accept / Complete / Cancel)
  const handleUpdateStatus = async (requestId: string, status: 'Accepted' | 'Completed' | 'Cancelled') => {
    setActionLoadingId(requestId);
    try {
      const res = await fetch(`/api/vendor/service-requests/${requestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }

      const updated = await res.json();
      setRequests(prev => prev.map(r => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      alert(err.message || 'Failed to update request status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete Request
  const handleDeleteRequest = async (requestId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this request notification?');
    if (!confirmed) return;

    setActionLoadingId(requestId);
    try {
      const res = await fetch(`/api/vendor/service-requests/${requestId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Failed to delete request');
      }

      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Metrics
  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const acceptedCount = requests.filter(r => r.status === 'Accepted').length;
  const completedCount = requests.filter(r => r.status === 'Completed').length;

  // Filtered list
  const filteredRequests = requests.filter(r => {
    if (filter === 'All') return true;
    return r.status === filter;
  });

  return (
    <div className="pt-20 pb-24 px-4 md:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-700/50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-orange-400 animate-bounce" />
            Table Assistance & Notifications
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Real-time customer requests for waiter calls, water refills, bills, and table service.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRequests(false)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Requests</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              {pendingCount > 0 && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                  NEEDS ATTENTION
                </span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Bell className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Accepted / In Progress</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{acceptedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Completed Requests</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        {(['All', 'Pending', 'Accepted', 'Completed'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
              filter === tab
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab} {tab === 'Pending' && pendingCount > 0 ? `(${pendingCount})` : ''}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-3" />
          <p className="font-medium text-sm">Fetching service notifications...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={() => fetchRequests(false)}
            className="text-xs bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Bell className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No {filter !== 'All' ? filter : ''} Service Requests</h3>
          <p className="text-slate-500 text-xs">
            When dining customers click "Call Waiter" or request table assistance on the QR Menu, notifications will appear here.
          </p>
        </div>
      ) : (
        /* Requests Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRequests.map(req => {
            const isLoading = actionLoadingId === req.id;
            const formattedTime = new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden flex flex-col justify-between ${
                  req.status === 'Pending'
                    ? 'border-amber-300 ring-2 ring-amber-400/20 bg-amber-50/30'
                    : req.status === 'Accepted'
                    ? 'border-blue-200 bg-blue-50/20'
                    : 'border-slate-200 opacity-80'
                }`}
              >
                {/* Top Content */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-extrabold text-lg flex items-center justify-center shadow-inner shrink-0">
                        #{req.tableNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-base">
                            {req.tableName || `Table ${req.tableNumber}`}
                          </h3>
                          <span className="text-[11px] font-mono font-semibold text-slate-400">
                            {req.id}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-orange-600 flex items-center gap-1 mt-0.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          {req.requestType}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                        req.status === 'Pending'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : req.status === 'Accepted'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : req.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  {/* Message note if provided */}
                  {req.message && (
                    <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <p className="italic">"{req.message}"</p>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Requested at {formattedTime}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 w-full">
                    {req.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'Accepted')}
                          disabled={isLoading}
                          className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs disabled:opacity-50"
                        >
                          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                          Accept
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'Completed')}
                          disabled={isLoading}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs disabled:opacity-50"
                        >
                          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Complete
                        </button>
                      </>
                    )}

                    {req.status === 'Accepted' && (
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'Completed')}
                        disabled={isLoading}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs disabled:opacity-50"
                      >
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Mark Completed
                      </button>
                    )}

                    {req.status === 'Completed' && (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Resolved
                        </span>
                        <button
                          onClick={() => handleDeleteRequest(req.id)}
                          disabled={isLoading}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
