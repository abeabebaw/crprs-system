import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';
import { 
  Plus, Search, FileText, Filter, Eye, RefreshCw, ChevronDown, 
  Printer, Edit3, XCircle, Trash2, ArrowRight, Info, Check, ShieldAlert, X
} from 'lucide-react';

const APP_TYPES = [
  { value: '', label: 'ALL Application Type' },
  { value: 'FIRST_REGISTRATION', label: 'First Registration' },
  { value: 'SUBSEQUENT_REGISTRATION', label: 'Subsequent Registration' },
  { value: 'PARCEL_RESIZE', label: 'Parcel resize' },
  { value: 'INFORMATION_PROVISION', label: 'Information Provision' },
  { value: 'TRANSFER_OF_RIGHT', label: 'Transfer of Right' },
  { value: 'MODIFY_PARTY', label: 'Modify Party' },
  { value: 'MODIFY_RRR', label: 'Modify RRR' },
  { value: 'EASEMENT_REGISTRATION', label: 'Easement Registration' },
  { value: 'BUILD_NEW_FEATURE', label: 'Build New Feature' },
  { value: 'CHANGE_LAND_USE', label: 'Change Land Use' },
  { value: 'CORRECTION_RRR', label: 'Correction RRR' },
  { value: 'CORRECTION_PARTY', label: 'Correction Party' },
  { value: 'PARCEL_INFO_UPDATING', label: 'Parcel Info Updating' }
];

export default function ApplicationList() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 100, pages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [appTypeFilter, setAppTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Active Action Menu Popover State
  const [openActionId, setOpenActionId] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState(null);

  // Modal States
  const [selectedApp, setSelectedApp] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);
  const [receiptType, setReceiptType] = useState('ACKNOWLEDGMENT'); // ACKNOWLEDGMENT or REJECTION
  const [showNewTxnModal, setShowNewTxnModal] = useState(false);
  const [selectedTxnType, setSelectedTxnType] = useState('REGISTRATION_OF_LEASEHOLD');

  const actionRef = useRef(null);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (appTypeFilter) params.append('type', appTypeFilter);
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);

      const { data } = await API.get(`/applications?${params}`);

      if (Array.isArray(data)) {
        setApps(data);
      } else if (data.data && Array.isArray(data.data)) {
        setApps(data.data);
        if (data.pagination) setPagination(data.pagination);
      } else {
        setApps([]);
      }
    } catch (e) {
      console.error('Error fetching applications:', e);
      setApps([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApps();
  }, [statusFilter, appTypeFilter]);

  // Close Action Menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionRef.current && !actionRef.current.contains(e.target)) {
        setOpenActionId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statusTabButtons = [
    { label: 'ALL STATUS', value: '' },
    { label: 'SUBMITTED', value: 'SUBMITTED' },
    { label: 'IN PROGRESS', value: 'IN_PROGRESS' },
    { label: 'FINISHED', value: 'FINISHED' },
    { label: 'WITHDRAWN', value: 'WITHDRAWN' }
  ];

  // Action Handlers
  const handleRejectApp = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }
    try {
      await API.post(`/applications/${selectedApp.id}/reject`, { reason: rejectReason });
      toast.success('Application rejected successfully');
      setShowRejectModal(false);
      setRejectReason('');
      fetchApps();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject application');
    }
  };

  const handleDeleteApp = async (appId) => {
    if (!window.confirm('Are you sure you want to delete this application?')) return;
    try {
      await API.delete(`/applications/${appId}`);
      toast.success('Application deleted');
      fetchApps();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete application');
    }
  };

  const handleCreateTransaction = async () => {
    try {
      await API.post('/transactions', {
        application_id: selectedApp.id,
        transaction_type: selectedTxnType,
        parcel_id: selectedApp.parcel_id || selectedApp.parcelId || (selectedApp.parcel?.id)
      });
      toast.success('Transaction created successfully');
      setShowNewTxnModal(false);
      fetchApps();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create transaction');
    }
  };

  const handleAcceptApp = async (appId) => {
    try {
      await API.patch(`/applications/${appId}/status`, { status: 'SUBMITTED', reason: 'Reopened by FDO' });
      toast.success('Application accepted and reopened');
      fetchApps();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept application');
    }
  };

  const openReceipt = (app, type) => {
    const routeType = type === 'REJECTION' ? 'rejection' : 'acknowledgment';
    navigate(`/applications/${app.id}/receipt/${routeType}`);
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header Navigation (Matching Screenshot 1) */}
      <div className="bg-slate-900 text-white p-3 rounded-xl flex flex-wrap justify-between items-center shadow">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">🇪🇹</span>
            <span className="font-bold text-sm tracking-wide">RPRS <span className="font-normal text-slate-300 text-xs">REAL PROPERTY REGISTRATION SYSTEM</span></span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link to="/applications" className="px-3 py-1 bg-blue-700 rounded text-white font-bold">1. Application</Link>
            <Link to="/transactions" className="px-3 py-1 hover:bg-slate-800 rounded text-slate-300">2. Transaction</Link>
            <Link to="/portal/application-status" className="px-3 py-1 hover:bg-slate-800 rounded text-slate-300">3. Search</Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            to="/applications/new" 
            className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-md flex items-center gap-1.5 shadow"
          >
            <Plus className="w-3.5 h-3.5" /> New Application
          </Link>
        </div>
      </div>

      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Application List</h2>
          <p className="text-xs text-slate-500">Front desk officer (FDO) application management portal</p>
        </div>
        <button onClick={fetchApps} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filters Row (Matching Screenshot 1) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {statusTabButtons.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 font-bold rounded-lg transition border ${
                  statusFilter === tab.value 
                    ? 'bg-blue-900 text-white border-blue-900 shadow-sm' 
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Application Type Dropdown Filter */}
          <div className="flex items-center gap-2">
            <select
              value={appTypeFilter}
              onChange={e => setAppTypeFilter(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              {APP_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Application id or Applicant Name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchApps()}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Main Data Table (Matching Screenshot 1 & Screenshot 2) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm" style={{ position: 'relative' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-left text-xs border-collapse" style={{ position: 'relative' }}>
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold">
                <th className="p-3 w-12 text-center">No</th>
                <th className="p-3">Application Id</th>
                <th className="p-3">Applicant Name</th>
                <th className="p-3">Application Type</th>
                <th className="p-3">Application Status</th>
                <th className="p-3">Creation Date</th>
                <th className="p-3">Modification Date</th>
                <th className="p-3 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">Loading applications...</td>
                </tr>
              ) : apps.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">No applications found matching search criteria.</td>
                </tr>
              ) : (
                apps.map((a, idx) => {
                  const appId = a.id;
                  const appNum = a.application_number || a.applicationNumber || `appReg${a.id.slice(0, 5)}`;
                  const applicantName = a.applicant_name || a.applicantName || 'N/A';
                  const appType = (a.application_type || a.applicationType || 'First Registration').replace(/_/g, ' ');
                  const status = a.status || 'SUBMITTED';
                  const transactionCount = a._count?.transactions || 0;
                  const hasTransactions = transactionCount > 0;
                  const creationDate = new Date(a.submitted_at || a.createdAt || Date.now()).toLocaleDateString();
                  const modDate = new Date(a.updatedAt || a.submitted_at || Date.now()).toLocaleDateString();
                  const isOpen = openActionId === appId;

                  return (
                    <tr key={appId} className="border-b border-slate-100 hover:bg-slate-50/90" style={{ position: 'relative' }}>
                      <td className="p-3 text-center text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-bold text-blue-900">{appNum}</td>
                      <td className="p-3 font-medium text-slate-800">{applicantName}</td>
                      <td className="p-3 text-slate-700 capitalize">{appType}</td>
                      <td className="p-3"><StatusBadge status={status} /></td>
                      <td className="p-3 text-slate-500">{creationDate}</td>
                      <td className="p-3 text-slate-500">{modDate}</td>
                      <td className="p-3 text-center" style={{ position: 'relative' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          {/* Blue Action Dropdown Button matching Screenshot 1 (`+ ▾`) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isOpen) {
                                setOpenActionId(null);
                                setActionMenuPosition(null);
                                return;
                              }

                              const buttonRect = e.currentTarget.getBoundingClientRect();
                              setActionMenuPosition({
                                top: buttonRect.bottom + 4,
                                right: Math.max(8, window.innerWidth - buttonRect.right)
                              });
                              setOpenActionId(appId);
                            }}
                            className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded flex items-center gap-1 mx-auto text-xs shadow-sm transition-colors"
                            style={{ transform: 'none' }}
                          >
                            <Plus className="w-3.5 h-3.5" /> <ChevronDown className="w-3 h-3" />
                          </button>

                          {/* Action Menu Popover (Matching Screenshot 2 Table Commands) */}
                          {isOpen && (
                            <div 
                              className="application-action-menu bg-white border border-slate-300 rounded-lg shadow-xl py-1 text-left text-xs divide-y divide-slate-100"
                              style={{ 
                                position: 'fixed',
                                zIndex: 9999,
                                minWidth: '200px',
                                top: actionMenuPosition?.top ?? 0,
                                right: actionMenuPosition?.right ?? 8,
                                maxHeight: '400px',
                                overflowY: 'auto'
                              }}
                            >
                            
                            {/* SUBMITTED STATUS ACTIONS */}
                            {status === 'SUBMITTED' && (
                              <>
                                <button
                                  onClick={() => { setSelectedApp(a); setShowNewTxnModal(true); setOpenActionId(null); }}
                                  className="w-full px-3 py-2 text-blue-700 hover:bg-blue-50 font-semibold flex items-center gap-2"
                                >
                                  <Plus className="w-3.5 h-3.5 text-blue-600" /> + New Transaction
                                </button>

                                {hasTransactions && (
                                  <button
                                    onClick={() => { openReceipt(a, 'ACKNOWLEDGMENT'); setOpenActionId(null); }}
                                    className="w-full px-3 py-2 text-blue-700 hover:bg-blue-50 font-semibold flex items-center gap-2"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-blue-600" /> Print Receipt
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => { navigate(`/applications/${appId}/edit`); setOpenActionId(null); }}
                                  className="w-full px-3 py-2 text-slate-700 hover:bg-amber-50 font-semibold flex items-center gap-2"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-amber-600" /> Update
                                </button>

                                <button
                                  onClick={() => { navigate(`/applications/${appId}/reject`); setOpenActionId(null); }}
                                  className="w-full px-3 py-2 text-rose-700 hover:bg-rose-50 font-semibold flex items-center gap-2"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" /> Reject
                                </button>

                                <button
                                  onClick={() => { handleDeleteApp(appId); setOpenActionId(null); }}
                                  className="w-full px-3 py-2 text-rose-700 hover:bg-rose-50 font-semibold flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Delete
                                </button>
                              </>
                            )}

                            {/* IN PROGRESS STATUS ACTIONS */}
                            {status === 'IN_PROGRESS' && (
                              <>
                                <button
                                  onClick={() => { setSelectedApp(a); setShowNewTxnModal(true); setOpenActionId(null); }}
                                  className="w-full px-3 py-2 text-blue-700 hover:bg-blue-50 font-semibold flex items-center gap-2"
                                >
                                  <Plus className="w-3.5 h-3.5 text-blue-600" /> + New Transaction
                                </button>

                                {hasTransactions && (
                                  <button
                                    onClick={() => { openReceipt(a, 'ACKNOWLEDGMENT'); setOpenActionId(null); }}
                                    className="w-full px-3 py-2 text-blue-700 hover:bg-blue-50 font-semibold flex items-center gap-2"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-blue-600" /> Print Receipt
                                  </button>
                                )}
                              </>
                            )}

                            {/* FINISHED STATUS ACTIONS */}
                            {status === 'FINISHED' && (
                              <button
                                onClick={() => { openReceipt(a, 'RETURN'); setOpenActionId(null); }}
                                className="w-full px-3 py-2 text-blue-700 hover:bg-blue-50 font-semibold flex items-center gap-2"
                              >
                                <Printer className="w-3.5 h-3.5 text-blue-600" /> Print Return Receipt
                              </button>
                            )}

                            {/* WITHDRAWN STATUS ACTIONS */}
                            {status === 'WITHDRAWN' && (
                              <>
                                <button
                                  onClick={() => { handleAcceptApp(appId); setOpenActionId(null); }}
                                  className="w-full px-3 py-2 text-emerald-700 hover:bg-emerald-50 font-semibold flex items-center gap-2"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Accept
                                </button>

                                <button
                                  onClick={() => { setSelectedApp(a); setShowReasonModal(true); setOpenActionId(null); }}
                                  className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-2"
                                >
                                  <Info className="w-3.5 h-3.5 text-slate-600" /> Withdraw Reason
                                </button>

                                <button
                                  onClick={() => { openReceipt(a, 'REJECTION'); setOpenActionId(null); }}
                                  className="w-full px-3 py-2 text-blue-700 hover:bg-blue-50 font-semibold flex items-center gap-2"
                                >
                                  <Printer className="w-3.5 h-3.5 text-blue-600" /> Print Rejection
                                </button>
                              </>
                            )}

                            {/* COMMON READ-ONLY ACTIONS */}
                            <div className="pt-1">
                              <button
                                onClick={() => { navigate(`/transactions?app=${appId}`); setOpenActionId(null); }}
                                className="w-full px-3 py-1.5 text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                              >
                                ≡ View Transactions
                              </button>

                              <button
                                onClick={() => { navigate(`/applications/${appId}`); setOpenActionId(null); }}
                                className="w-full px-3 py-1.5 text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                              >
                                ▤ View Parcel
                              </button>

                              <button
                                onClick={() => { navigate(`/applications/${appId}`); setOpenActionId(null); }}
                                className="w-full px-3 py-1.5 text-slate-600 hover:bg-slate-50 flex items-center gap-2 font-medium"
                              >
                                █ View Detail
                              </button>
                            </div>

                          </div>
                        )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer info matching Screenshot 1 */}
      <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-200">
        <div>Copyright © INSA 2010 E.C. All rights reserved.</div>
        <div>Version 2.0.1</div>
      </div>

      {/* MODAL: Reject Application */}
      {showRejectModal && selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="font-bold text-base flex items-center gap-2 text-rose-700">
                <ShieldAlert className="w-5 h-5" /> Reject Application
              </h3>
              <button onClick={() => setShowRejectModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <p className="text-xs text-slate-600">
              Application ID: <strong className="text-blue-900">{selectedApp.application_number || selectedApp.applicationNumber}</strong><br />
              Applicant: <strong>{selectedApp.applicant_name || selectedApp.applicantName}</strong>
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Rejection:*</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Specify rejection details for application rejection receipt..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs h-24 focus:outline-none focus:border-rose-600"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg">Cancel</button>
              <button onClick={handleRejectApp} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View Withdrawal/Rejection Reason */}
      {showReasonModal && selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="font-bold text-base flex items-center gap-2 text-amber-700">
                <Info className="w-5 h-5" /> Withdrawal Reason
              </h3>
              <button onClick={() => setShowReasonModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs leading-relaxed">
              {selectedApp.withdrawn_reason || selectedApp.withdrawnReason || 'No detailed withdrawal reason recorded.'}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowReasonModal(false)} className="px-4 py-2 bg-slate-800 text-white font-semibold text-xs rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create New Transaction */}
      {showNewTxnModal && selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-700" /> New Transaction
              </h3>
              <button onClick={() => setShowNewTxnModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="text-xs space-y-2">
              <p>Application: <strong className="text-blue-900">{selectedApp.application_number || selectedApp.applicationNumber}</strong></p>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Transaction Type:*</label>
                <select
                  value={selectedTxnType}
                  onChange={e => setSelectedTxnType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="REGISTRATION_OF_LEASEHOLD">Registration of Leasehold</option>
                  <option value="REGISTRATION_OF_OLD_POSSESSION">Registration of Old Possession</option>
                  <option value="PARCEL_SPLIT">Parcel Split</option>
                  <option value="MORTGAGE_REGISTRATION">Mortgage Registration</option>
                  <option value="TRANSFER_PRIVATE_TO_PRIVATE">Transfer Private to Private</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowNewTxnModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg">Cancel</button>
              <button onClick={handleCreateTransaction} className="px-4 py-2 bg-blue-700 text-white font-bold text-xs rounded-lg shadow">Create Transaction</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Printable Receipt (Acknowledgment / Rejection) */}
      {showReceiptModal && selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-8 space-y-6 shadow-2xl print:p-0 print:shadow-none print:w-full">
            <div className="flex justify-between items-start border-b border-slate-300 pb-4 print:hidden">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Receipt Preview</h2>
                <p className="text-xs text-slate-600 font-semibold mt-1">
                  {receiptType === 'ACKNOWLEDGMENT' ? 'Confirmation of application registration submission' : 'Confirmation of application rejection'}
                </p>
              </div>
              <button onClick={() => setShowReceiptModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            {isLoadingReceipt ? (
              <div className="text-xs text-slate-500">Loading receipt details...</div>
            ) : (
              <>
                {['CUSTOMER COPY', 'OFFICE COPY'].map((copyLabel, idx) => (
                  <div key={copyLabel} className={`${idx === 0 ? 'print:break-after-page' : ''} border border-slate-300 rounded-lg p-5 text-xs text-slate-800`}>
                    <div className="text-center space-y-1 mb-4">
                      <h3 className="font-bold text-base">RPRS - REAL PROPERTY REGISTRATION SYSTEM</h3>
                      <p className="font-semibold text-blue-900">
                        {receiptType === 'ACKNOWLEDGMENT' ? 'CONFIRMATION OF APPLICATION REGISTRATION SUBMISSION' : 'CONFIRMATION OF APPLICATION REJECTION'}
                      </p>
                      <p className="text-slate-500">{copyLabel}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
                      <div><strong>Application No:</strong> {selectedApp.application_number || selectedApp.applicationNumber}</div>
                      <div><strong>Certificate No:</strong> {selectedApp.certificate_number || 'N/A'}</div>
                      <div><strong>Status:</strong> {receiptType === 'ACKNOWLEDGMENT' ? 'SUBMITTED' : 'WITHDRAWN'}</div>
                      <div><strong>Lodgment Date:</strong> {new Date(selectedApp.submitted_at || selectedApp.created_at || Date.now()).toLocaleString()}</div>
                    </div>

                    <div className="mb-4">
                      <p><strong>Applicant Name:</strong> {selectedApp.applicant_name || selectedApp.applicantName}</p>
                      <p><strong>Application Type:</strong> {(selectedApp.application_type || selectedApp.applicationType || '').replace(/_/g, ' ')}</p>
                      <p><strong>Parcel Code:</strong> {selectedApp.parcel?.parcel_code || selectedApp.parcel?.parcelCode || selectedApp.parcel_code || '-'}</p>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-bold mb-1">Transactions</h4>
                      <table className="w-full border border-slate-300 text-xs">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="p-1.5 border border-slate-300 text-left">No</th>
                            <th className="p-1.5 border border-slate-300 text-left">Transaction Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedApp.transactions || []).length > 0 ? (
                            (selectedApp.transactions || []).map((t, index) => (
                              <tr key={t.id || index}>
                                <td className="p-1.5 border border-slate-300">{index + 1}</td>
                                <td className="p-1.5 border border-slate-300">{(t.transaction_type || t.transactionType || '').replace(/_/g, ' ')}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="p-1.5 border border-slate-300" colSpan="2">No transaction listed</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {receiptType === 'REJECTION' && (
                      <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-900 rounded">
                        <strong>Reason:</strong> {selectedApp.withdrawn_reason || selectedApp.withdrawnReason || 'No rejection reason recorded'}
                      </div>
                    )}

                    <div className="pt-6 grid grid-cols-2 gap-8 text-center">
                      <div className="border-t border-slate-300 pt-2">Lodged by: ____________________</div>
                      <div className="border-t border-slate-300 pt-2">Signature: ____________________</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 print:hidden">
              <button onClick={() => setShowReceiptModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg">Close</button>
              <button onClick={printReceipt} disabled={isLoadingReceipt} className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow disabled:opacity-60">
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}