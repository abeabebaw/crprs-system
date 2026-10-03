import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';
import { List, Search, RefreshCw, Edit3, Trash2, Truck, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const TRANSACTION_TYPES = [
  'REGISTRATION_OF_LEASEHOLD',
  'REGISTRATION_OF_OLD_POSSESSION',
  'REGISTRATION_OF_URBAN_FARM',
  'REGISTRATION_OF_LANDHOLDING_NO_USERIGHT',
  'MORTGAGE_REGISTRATION',
  'MORTGAGE_CANCELLATION',
  'COURT_INJUNCTION_REGISTRATION',
  'COURT_INJUNCTION_CANCELLATION',
  'GENERAL_RESTRICTION_REGISTRATION',
  'GENERAL_RESTRICTION_CANCELLATION',
  'GENERAL_RESPONSIBILITY_REGISTRATION',
  'GENERAL_RESPONSIBILITY_CANCELLATION',
  'PARCEL_SPLIT',
  'PARCEL_MERGE',
  'PARCEL_BOUNDARY_CHANGE',
  'MODIFY_REGISTERED_PARTY',
  'TRANSFER_PUBLIC_TO_PRIVATE',
  'TRANSFER_PRIVATE_TO_PUBLIC',
  'TRANSFER_PRIVATE_TO_PRIVATE',
  'PRINT_REGISTRATION_EXTRACT',
  'PRINT_CADASTRAL_EXTRACT',
  'PRINT_NEW_TITLE',
  'REPLACE_DAMAGED_TITLE',
  'REPLACE_LOST_TITLE',
  'MODIFY_REGISTERED_INJUNCTION',
  'MODIFY_REGISTERED_RIGHT',
  'MODIFY_REGISTERED_MORTGAGE',
  'REGISTER_SERVITUDE',
  'CREATE_BUILDING',
  'CREATE_CORNER_POINT',
  'CREATE_BOUNDARY_LINE',
  'CHANGE_LAND_USE',
  'CORRECTION_REGISTERED_RIGHT',
  'CORRECTION_REGISTERED_INJUNCTION',
  'CORRECTION_REGISTERED_MORTGAGE',
  'CORRECTION_REGISTERED_PARTY',
  'PARCEL_INFO_UPDATE'
];

export default function TransactionList() {
  const { user } = useAuth();
  const isFDO = user?.role === 'FDO' || user?.role === 'ADMIN';
  const [searchParams] = useSearchParams();

  const [txns, setTxns] = useState([]);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [appIdFilter, setAppIdFilter] = useState(searchParams.get('app') || '');
  const [parcelIdFilter, setParcelIdFilter] = useState(searchParams.get('parcel') || '');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [editTxnType, setEditTxnType] = useState('');
  const [editParcelId, setEditParcelId] = useState('');
  const [deliveryCertificateNumber, setDeliveryCertificateNumber] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDelivering, setIsDelivering] = useState(false);

  const fetchTxns = async () => {
    setLoading(true);
    try {
      const params = {
        status: statusFilter || undefined,
        applicationId: appIdFilter || undefined,
        parcelId: parcelIdFilter || undefined,
        search: search || undefined
      };
      const { data } = await API.get('/transactions', { params });
      const list = Array.isArray(data) ? data : (data.data || []);
      setTxns(list);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch transactions');
      setTxns([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTxns();
  }, [statusFilter, appIdFilter, parcelIdFilter]);

  const statusTabs = [
    { label: 'ALL STATUS', value: '' },
    { label: 'CREATED', value: 'CREATED' },
    { label: 'INITIATED', value: 'INITIATED' },
    { label: 'IN PROCESS', value: 'IN_PROCESS' },
    { label: 'READY FOR APPROVAL', value: 'READY_FOR_APPROVAL' },
    { label: 'APPROVED', value: 'APPROVED' },
    { label: 'NOT IN TASK', value: 'NOT_IN_TASK' },
    { label: 'DELIVERED', value: 'DELIVERED' }
  ];

  const openEditTxn = (txn) => {
    setSelectedTxn(txn);
    setEditTxnType(txn.transaction_type || txn.transactionType || '');
    setEditParcelId(txn.parcel_id || txn.parcelId || '');
    setShowEditModal(true);
  };

  const handleUpdateTxn = async () => {
    if (!selectedTxn || !editTxnType) {
      toast.error('Transaction type is required');
      return;
    }

    setIsSavingEdit(true);
    try {
      await API.put(`/transactions/${selectedTxn.id}`, {
        transaction_type: editTxnType,
        parcel_id: editParcelId || null
      });
      toast.success('Transaction updated successfully');
      setShowEditModal(false);
      setSelectedTxn(null);
      fetchTxns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update transaction');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteTxn = async (id) => {
    if (!window.confirm('Delete this CREATED transaction?')) {
      return;
    }

    try {
      await API.delete(`/transactions/${id}`);
      toast.success('Transaction deleted');
      fetchTxns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete transaction');
    }
  };

  const handleDeliverTxn = async (id) => {
    try {
      setIsDelivering(true);
      await API.post(`/transactions/${id}/deliver`, { certificateNumber: deliveryCertificateNumber });
      toast.success('Transaction delivered and moved to NOT IN TASK');
      setShowDeliverModal(false);
      setSelectedTxn(null);
      setDeliveryCertificateNumber('');
      fetchTxns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deliver transaction');
    } finally {
      setIsDelivering(false);
    }
  };

  const openDeliverTxn = (txn) => {
    setSelectedTxn(txn);
    const storedCertificate = sessionStorage.getItem(`crprs_return_certificate_${txn.application_id}`) || '';
    setDeliveryCertificateNumber(storedCertificate);
    setShowDeliverModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <List className="w-6 h-6 text-blue-600" /> Transactions Master Queue
          </h2>
          <p className="text-xs text-slate-500 font-medium">Filter transaction lists by status, application id, parcel id, and transaction id.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap gap-1.5 text-xs">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 font-bold rounded-lg transition border ${statusFilter === tab.value ? 'bg-blue-900 text-white border-blue-900 shadow-sm' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              type="text"
              placeholder="Application ID"
              value={appIdFilter}
              onChange={(e) => setAppIdFilter(e.target.value.trim())}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
            />
            <input
              type="text"
              placeholder="Parcel ID"
              value={parcelIdFilter}
              onChange={(e) => setParcelIdFilter(e.target.value.trim())}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
            />
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Txn #, App #, Parcel code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchTxns()}
                className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
              />
              <button onClick={fetchTxns} className="absolute right-1.5 top-1.5 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="p-3">Transaction #</th>
                <th className="p-3">Application #</th>
                <th className="p-3">Parcel Code</th>
                <th className="p-3">Transaction Type</th>
                <th className="p-3">Status</th>
                <th className="p-3">Assigned User</th>
                <th className="p-3">Created Date</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="p-6 text-center text-slate-400">Loading transactions...</td></tr>
              ) : txns.length === 0 ? (
                <tr><td colSpan="8" className="p-6 text-center text-slate-400">No transactions match the selected filter.</td></tr>
              ) : (
                txns.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition">
                    <td className="p-3 font-bold text-blue-900">{t.transaction_number || t.transactionNumber}</td>
                    <td className="p-3 font-semibold text-slate-700">{t.application_number || t.applicationNumber}</td>
                    <td className="p-3 font-mono">{t.parcel_code || t.parcelCode || '-'}</td>
                    <td className="p-3">{(t.transaction_type || t.transactionType)?.replace(/_/g, ' ')}</td>
                    <td className="p-3"><StatusBadge status={t.status} /></td>
                    <td className="p-3 text-slate-600">{t.assignee_name || t.assignedUser?.fullName || 'Unassigned'}</td>
                    <td className="p-3 text-slate-500">{new Date(t.created_at || t.createdAt || Date.now()).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {isFDO && t.status === 'CREATED' && (
                          <>
                            <button onClick={() => openEditTxn(t)} className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded flex items-center gap-1 font-semibold" title="Update">
                              <Edit3 className="w-3.5 h-3.5" /> Update
                            </button>
                            <button onClick={() => handleDeleteTxn(t.id)} className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded flex items-center gap-1 font-semibold" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </>
                        )}
                        {isFDO && t.status === 'APPROVED' && (
                          <button onClick={() => openDeliverTxn(t)} className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded flex items-center gap-1 font-semibold" title="Deliver">
                            <Truck className="w-3.5 h-3.5" /> Deliver
                          </button>
                        )}
                        {(!isFDO || (t.status !== 'CREATED' && t.status !== 'APPROVED')) && (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showEditModal && selectedTxn && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Update Transaction</h3>
              <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Transaction Type *</label>
                <select
                  value={editTxnType}
                  onChange={(e) => setEditTxnType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                >
                  {TRANSACTION_TYPES.map((type) => (
                    <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Parcel ID</label>
                <input
                  type="text"
                  value={editParcelId}
                  onChange={(e) => setEditParcelId(e.target.value.trim())}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  placeholder="Optional UUID"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg">Cancel</button>
              <button onClick={handleUpdateTxn} disabled={isSavingEdit} className="px-4 py-2 bg-blue-700 text-white font-bold text-xs rounded-lg shadow">
                {isSavingEdit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeliverModal && selectedTxn && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Deliver Approved Transaction</h3>
              <button onClick={() => setShowDeliverModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="text-xs text-slate-700 space-y-1">
              <p><strong>Transaction #:</strong> {selectedTxn.transaction_number || selectedTxn.transactionNumber}</p>
              <p><strong>Application #:</strong> {selectedTxn.application_number || selectedTxn.applicationNumber}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Certificate Number *</label>
              <input
                type="text"
                value={deliveryCertificateNumber}
                onChange={(e) => setDeliveryCertificateNumber(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                placeholder="Enter printed certificate number"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowDeliverModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg">Cancel</button>
              <button
                onClick={() => handleDeliverTxn(selectedTxn.id)}
                disabled={isDelivering || !deliveryCertificateNumber.trim()}
                className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg shadow disabled:opacity-60"
              >
                {isDelivering ? 'Delivering...' : 'Accept'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
