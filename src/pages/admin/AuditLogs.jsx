import React, { useState, useEffect } from 'react';
import API from '../../api/client';
import toast from 'react-hot-toast';
import { ShieldCheck, Search, Filter, RefreshCw, Eye, Calendar, User, Clock, Terminal } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  
  const [filterAction, setFilterAction] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.limit)
      });
      if (filterAction) params.append('action', filterAction);
      if (filterEntityType) params.append('entity_type', filterEntityType);
      if (searchTerm) params.append('search', searchTerm);

      const { data } = await API.get(`/audit-logs?${params.toString()}`);
      setLogs(data.data || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [filterAction, filterEntityType]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const getActionBadgeColor = (action) => {
    if (action.includes('CREATE')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (action.includes('APPROVE')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (action.includes('REJECT') || action.includes('FAILED') || action.includes('CANCEL')) return 'bg-rose-100 text-rose-800 border-rose-300';
    if (action.includes('UPDATE') || action.includes('STATUS')) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-slate-100 text-slate-800 border-slate-300';
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
            <ShieldCheck className="w-6 h-6 text-blue-700" />
            Audit & Activity Monitoring Trail
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable system logs capturing security, application events, spatial modifications, and transactions.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(pagination.page)}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-300 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search action, entity ID, reason, or IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <button type="submit" className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm">
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
          >
            <option value="">All Actions</option>
            <option value="AUTH_LOGIN">Login Events</option>
            <option value="APPLICATION_CREATED">Application Created</option>
            <option value="APPLICATION_UPDATED">Application Updated</option>
            <option value="APPLICATION_REJECTED">Application Rejected</option>
            <option value="TRANSACTION_CREATED">Transaction Created</option>
            <option value="TRANSACTION_APPROVED">Transaction Approved</option>
            <option value="DOCUMENT_UPLOADED">Document Uploaded</option>
            <option value="PARCEL_CREATED">Parcel Created</option>
          </select>

          <select
            value={filterEntityType}
            onChange={(e) => setFilterEntityType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
          >
            <option value="">All Entities</option>
            <option value="APPLICATION">Application</option>
            <option value="TRANSACTION">Transaction</option>
            <option value="PARCEL">Parcel</option>
            <option value="DOCUMENT">Document</option>
            <option value="USER">User / Auth</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Entity Reference</th>
                <th className="py-3 px-4">Officer / User</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                    No audit records match the current filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {new Date(log.created_at || log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {log.entity_type || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-[140px]" title={log.entity_id}>
                      {log.entity_id || '-'}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-800">
                      {log.user?.full_name || log.user?.username || (log.user_id ? 'User ID ' + log.user_id.substring(0, 8) : 'System')}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {log.ip_address || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium rounded border border-slate-200 inline-flex items-center gap-1 transition"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing {logs.length} of {pagination.total} records (Page {pagination.page} of {pagination.pages})
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Audit Log Event Inspector</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Event Action:</span>
                <span className="font-bold text-slate-800">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Timestamp:</span>
                <span className="font-semibold text-slate-800">{new Date(selectedLog.created_at || selectedLog.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Entity:</span>
                <span className="font-semibold text-slate-800">{selectedLog.entity_type} ({selectedLog.entity_id})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Actor:</span>
                <span className="font-semibold text-slate-800">{selectedLog.user?.full_name || selectedLog.user?.username || 'System'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">IP & User Agent:</span>
                <span className="text-slate-700 truncate block" title={selectedLog.user_agent}>{selectedLog.ip_address || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Correlation ID:</span>
                <span className="font-mono text-slate-600">{selectedLog.correlation_id || '-'}</span>
              </div>
            </div>

            {selectedLog.reason && (
              <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 font-semibold block mb-1">Reason / Note:</span>
                <span className="text-slate-800">{selectedLog.reason}</span>
              </div>
            )}

            {selectedLog.new_value && (
              <div className="text-xs space-y-1">
                <span className="text-slate-500 font-semibold block">Payload / State Changes:</span>
                <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg overflow-x-auto text-[11px] max-h-48">
                  {JSON.stringify(selectedLog.new_value, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
