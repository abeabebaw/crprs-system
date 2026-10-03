import { useState, useEffect, useCallback } from 'react';
import API from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';
import {
  Play, FolderOpen, CheckCircle, UserPlus, FileText, Scale, Shield,
  Search, Filter, RefreshCw, ChevronRight, Plus, Pencil, Trash2, X,
  MapPin, Eye, Download, Ban, Save, RotateCcw, AlertTriangle, Clock,
  ExternalLink, UserCheck, Building2, Users, Check
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────
const RIGHT_TYPES = [
  { value: 'LEASEHOLD', label: 'Leasehold' },
  { value: 'OLD_POSSESSION', label: 'OldPossession' },
  { value: 'SUB_LEASE', label: 'Sub Lease' },
  { value: 'CONDOMINIUM', label: 'Condominium' },
  { value: 'URBAN_FARM', label: 'Urban Farm' },
  { value: 'GOVERNMENT_OWNED', label: 'Government Owned' },
  { value: 'WITHOUT_USE_RIGHT', label: 'Without Use Right' }
];

const ACQUISITION_TYPES = [
  'Inheritance', 'Sale', 'Gift', 'Government_Allocation',
  'Court_Decision', 'Exchange', 'Donation', 'Other'
];

const RESTRICTION_TYPES = [
  'Building Restriction', 'Land Use Restriction', 'Environmental',
  'Heritage / Conservation', 'Master Plan Restriction', 'Other'
];

const STATUS_OPTIONS = [
  'ALL STATUS', 'CREATED', 'INITIATED', 'IN_PROCESS',
  'READY_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'
];

export default function ROPanel() {
  // ─── Transaction List State ─────────────────────────────────────────────
  const [txns, setTxns] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL STATUS');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // ─── Loaded Transaction Detail ──────────────────────────────────────────
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('holder');

  // ─── Modals State ───────────────────────────────────────────────────────
  // Party
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [editingParty, setEditingParty] = useState(null);

  // Right (RRR)
  const [showRightModal, setShowRightModal] = useState(false);
  const [editingRight, setEditingRight] = useState(null);

  // Mortgage
  const [showMortgageModal, setShowMortgageModal] = useState(false);
  const [editingMortgage, setEditingMortgage] = useState(null);
  const [showMortgageReleaseModal, setShowMortgageReleaseModal] = useState(false);
  const [releasingMortgage, setReleasingMortgage] = useState(null);

  // Court Injunction
  const [showInjunctionModal, setShowInjunctionModal] = useState(false);
  const [editingInjunction, setEditingInjunction] = useState(null);
  const [showInjunctionReleaseModal, setShowInjunctionReleaseModal] = useState(false);
  const [releasingInjunction, setReleasingInjunction] = useState(null);

  // General Restriction
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [editingRestriction, setEditingRestriction] = useState(null);
  const [showRestrictionReleaseModal, setShowRestrictionReleaseModal] = useState(false);
  const [releasingRestriction, setReleasingRestriction] = useState(null);

  // Check if transaction is already finished
  const isFinished = selected && ['READY_FOR_APPROVAL', 'APPROVED', 'FINISHED', 'COMPLETED', 'DELIVERED'].includes(selected.status);

  // ─── Fetch Transactions ─────────────────────────────────────────────────
  const fetchTxns = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      const { data } = await API.get('/transactions', { params });
      let list = Array.isArray(data) ? data : data.data || [];
      if (statusFilter && statusFilter !== 'ALL STATUS') {
        list = list.filter(t => t.status === statusFilter);
      }
      setTxns(list);
    } catch (err) {
      console.error('Fetch transactions error:', err);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => { fetchTxns(); }, [fetchTxns]);

  // ─── Initiate ───────────────────────────────────────────────────────────
  const handleInitiate = async (id) => {
    if (!window.confirm('Are you sure you want to initiate this transaction?')) return;
    try {
      await API.post(`/transactions/${id}/initiate`);
      toast.success('✅ Transaction initiated successfully');
      fetchTxns();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to initiate transaction');
    }
  };

  // ─── Load (transition to IN_PROCESS + fetch full detail) ────────────────
  const handleLoad = async (id) => {
    try {
      const txnCheck = txns.find(t => t.id === id);
      if (txnCheck && txnCheck.status === 'INITIATED') {
        await API.post(`/transactions/${id}/load`);
      }
      const { data } = await API.get(`/transactions/${id}`);

      // Auto-detect holder from applicant if none registered
      if (data.applicant_name && (!data.parties || data.parties.length === 0)) {
        const nameParts = data.applicant_name.split(' ');
        data._autoHolder = {
          first_name: nameParts[0] || '',
          father_name: nameParts[1] || '',
          grandfather_name: nameParts[2] || '',
          phone: data.applicant_phone || '',
          email: data.applicant_email || '',
          address: data.applicant_address || '',
          national_id: data.applicant_id_number || ''
        };
      }

      setSelected(data);
      setActiveTab('holder');
      toast.success('Transaction loaded — registration page ready');
    } catch (e) {
      try {
        const { data } = await API.get(`/transactions/${id}`);
        setSelected(data);
        setActiveTab('holder');
      } catch (e2) {
        toast.error(e.response?.data?.message || 'Failed to load transaction');
      }
    }
  };

  // ─── Finish (submit for approval) ──────────────────────────────────────
  const handleFinish = async () => {
    if (!selected) return;
    if (!selected.rights || selected.rights.length === 0) {
      toast.error('⚠️ Please register at least one Right (RRR) before finishing');
      return;
    }
    if (!window.confirm('Are you sure you want to finish this task and submit for approval?')) return;
    try {
      await API.post(`/transactions/${selected.id}/finish`);
      toast.success('✅ Transaction submitted for approval (READY_FOR_APPROVAL)');
      setSelected(null);
      fetchTxns();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to finish transaction');
    }
  };

  // ─── Refresh loaded transaction data ────────────────────────────────────
  const refreshSelected = async () => {
    if (!selected) return;
    try {
      const { data } = await API.get(`/transactions/${selected.id}`);
      if (data.applicant_name && (!data.parties || data.parties.length === 0)) {
        const nameParts = data.applicant_name.split(' ');
        data._autoHolder = {
          first_name: nameParts[0] || '',
          father_name: nameParts[1] || '',
          grandfather_name: nameParts[2] || '',
          phone: data.applicant_phone || '',
          email: data.applicant_email || '',
          address: data.applicant_address || '',
          national_id: data.applicant_id_number || ''
        };
      }
      setSelected(data);
    } catch (e) { console.error(e); }
  };

  // ─── Delete Party ───────────────────────────────────────────────────────
  const handleDeleteParty = async (partyId) => {
    if (isFinished) {
      toast.error('Cannot delete: this task is already finished');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this holder?')) return;
    try {
      await API.delete(`/parties/${partyId}`);
      toast.success('✅ Holder deleted successfully');
      refreshSelected();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete holder');
    }
  };

  // ─── Delete Right ───────────────────────────────────────────────────────
  const handleDeleteRight = async (rightId) => {
    if (isFinished) {
      toast.error('Cannot delete: this task is already finished');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this registered right?')) return;
    try {
      await API.delete(`/rrr/rights/${rightId}`);
      toast.success('✅ Right deleted successfully');
      refreshSelected();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete right');
    }
  };

  // ─── Delete Mortgage ────────────────────────────────────────────────────
  const handleDeleteMortgage = async (mortgageId) => {
    if (isFinished) {
      toast.error('Cannot delete: this task is already finished');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this mortgage?')) return;
    try {
      await API.delete(`/mortgages/${mortgageId}`);
      toast.success('✅ Mortgage deleted successfully');
      refreshSelected();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete mortgage');
    }
  };

  // ─── Delete Court Injunction ────────────────────────────────────────────
  const handleDeleteInjunction = async (injId) => {
    if (isFinished) {
      toast.error('Cannot delete: this task is already finished');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this court injunction?')) return;
    try {
      await API.delete(`/injunctions/${injId}`);
      toast.success('✅ Court injunction deleted successfully');
      refreshSelected();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete injunction');
    }
  };

  // ─── Delete General Restriction ─────────────────────────────────────────
  const handleDeleteRestriction = async (resId) => {
    if (isFinished) {
      toast.error('Cannot delete: this task is already finished');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this restriction?')) return;
    try {
      await API.delete(`/restrictions/${resId}`);
      toast.success('✅ General restriction deleted successfully');
      refreshSelected();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete restriction');
    }
  };

  // ─── Action Button for Transaction List ────────────────────────────────
  const getActionButton = (txn) => {
    switch (txn.status) {
      case 'CREATED':
        return (
          <button className="text-blue-600 hover:text-blue-800 font-semibold text-xs hover:underline"
            onClick={() => handleInitiate(txn.id)}>
            Initiate
          </button>
        );
      case 'INITIATED':
      case 'IN_PROCESS':
      case 'READY_FOR_APPROVAL':
      case 'APPROVED':
      case 'REJECTED':
        return (
          <button className="text-emerald-600 hover:text-emerald-800 font-semibold text-xs hover:underline"
            onClick={() => handleLoad(txn.id)}>
            Load
          </button>
        );
      default:
        return <span className="text-slate-400 text-xs">—</span>;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* ──────────────────────── TRANSACTION LIST ──────────────────────────── */}
      {!selected && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex items-center justify-between rounded-t-xl">
            <h2 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-700" /> Transaction List
            </h2>
            <button onClick={fetchTxns} className="text-slate-500 hover:text-slate-800" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div className="p-4 flex flex-wrap items-center gap-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 border border-slate-300 rounded text-xs bg-white min-w-[160px]"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by Application id, Parcel id and Transaction id..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchTxns()}
                className="flex-1 p-2 border border-slate-300 rounded text-xs"
              />
              <button onClick={fetchTxns} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="p-3 text-left w-10">No</th>
                  <th className="p-3 text-left">Parcel ID</th>
                  <th className="p-3 text-left">Transaction Id</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Transaction Type</th>
                  <th className="p-3 text-left">Created By</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {txns.length === 0 ? (
                  <tr><td colSpan="8" className="p-6 text-center text-slate-400">No transactions found.</td></tr>
                ) : (
                  txns.map((t, idx) => (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-blue-50/30">
                      <td className="p-3 text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-mono text-slate-700">{t.parcel_code || '—'}</td>
                      <td className="p-3 font-mono font-medium text-slate-800">{t.transaction_number}</td>
                      <td className="p-3 text-slate-600">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                      <td className="p-3 text-slate-700">{(t.transaction_type || '').replace(/_/g, ' ')}</td>
                      <td className="p-3 text-slate-600">{t.creator_name || t.created_by || '—'}</td>
                      <td className="p-3"><StatusBadge status={t.status} /></td>
                      <td className="p-3 text-right">{getActionButton(t)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────── REGISTRATION PAGE (after Load) ───────────────── */}
      {selected && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          {/* Top Bar */}
          <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex items-center justify-between rounded-t-xl">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelected(null)}
                className="text-slate-500 hover:text-slate-700 text-xs flex items-center gap-1 font-medium">
                ← Back to List
              </button>
              <span className="text-slate-300">|</span>
              <h2 className="font-bold text-sm text-slate-800">
                Registration: {selected.transaction_number}
              </h2>
              <StatusBadge status={selected.status} />
              {isFinished && (
                <span className="text-[11px] bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded">
                  Task Finished (Read Only)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={refreshSelected}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
              {!isFinished && (
                <button onClick={handleFinish}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm">
                  <CheckCircle className="w-3.5 h-3.5" /> Finish
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row">
            {/* ─── Left Sidebar: Parcel Information (Matching Screenshot) ─── */}
            <div className="w-full md:w-60 border-r border-slate-200 p-4 bg-slate-50/60 shrink-0 space-y-3">
              <div className="border border-blue-400 bg-blue-50/70 rounded px-3 py-1.5">
                <h3 className="text-xs font-bold text-blue-900 tracking-wide">
                  Parcel Information
                </h3>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  ['Parcel ID', selected.parcel_code || '—'],
                  ['Transaction ID', selected.transaction_number],
                  ['Transaction Status', selected.status?.replace(/_/g, ' ')],
                  ['Parcel Type', selected.land_use || selected.transaction_type?.replace(/_/g, ' ') || '—'],
                  ['Zone', selected.region || '—'],
                  ['City', selected.city || '—'],
                  ['Sub-City', selected.sub_city || '—'],
                  ['Woreda', selected.woreda || '—'],
                ].map(([label, val]) => (
                  <div key={label} className="border-b border-slate-200/60 pb-1.5">
                    <span className="font-semibold text-slate-600 block text-[11px]">{label}:</span>
                    <span className="text-slate-800 font-mono text-[11px] block truncate">{val}</span>
                  </div>
                ))}
                {selected.area_sqm && (
                  <div className="border-b border-slate-200/60 pb-1.5">
                    <span className="font-semibold text-slate-600 block text-[11px]">Area:</span>
                    <span className="text-slate-800 font-mono text-[11px]">{selected.area_sqm} m²</span>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Right Content: Tabs ─────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200 bg-slate-50/80 px-2 overflow-x-auto">
                {[
                  { key: 'holder', label: '1. Holder', icon: <UserPlus className="w-3.5 h-3.5" /> },
                  { key: 'rrr', label: '2. RRR', icon: <FileText className="w-3.5 h-3.5" /> },
                  { key: 'mortgage', label: '3. Mortgage', icon: <Scale className="w-3.5 h-3.5" /> },
                  { key: 'injunction', label: '4. Court Injunction', icon: <Shield className="w-3.5 h-3.5" /> },
                  { key: 'document', label: '5. Document', icon: <FileText className="w-3.5 h-3.5" /> },
                  { key: 'map', label: '6. Map', icon: <MapPin className="w-3.5 h-3.5" /> },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors
                      ${activeTab === tab.key
                        ? 'border-blue-600 text-blue-700 bg-white font-bold'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Body */}
              <div className="p-5 min-h-[420px]">
                {/* ━━━━━ TAB 1: HOLDER (Natural, Legal, Group) ━━━━━━━━━━━━━━ */}
                {activeTab === 'holder' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Holder / Party List</h4>
                        <p className="text-[11px] text-slate-500">Register Natural Person, Legal Person, or Group Party holding rights on this parcel.</p>
                      </div>
                      {!isFinished && (
                        <button
                          onClick={() => { setEditingParty(null); setShowPartyModal(true); }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm">
                          <Plus className="w-3.5 h-3.5" /> Add Holder
                        </button>
                      )}
                    </div>

                    {/* Auto-detected holder prompt */}
                    {selected._autoHolder && (!selected.parties || selected.parties.length === 0) && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-amber-900 font-bold">Holder detected from Application:</strong>{' '}
                            <span className="text-amber-800 font-medium">
                              {selected._autoHolder.first_name} {selected._autoHolder.father_name} {selected._autoHolder.grandfather_name}
                            </span>
                            <p className="text-amber-700 text-[11px] mt-0.5">Click "Register Detected Holder" to quickly save this applicant as the primary natural person holder.</p>
                          </div>
                        </div>
                        {!isFinished && (
                          <button
                            onClick={() => {
                              setEditingParty({
                                party_type: 'NATURAL',
                                first_name: selected._autoHolder.first_name,
                                father_name: selected._autoHolder.father_name,
                                grandfather_name: selected._autoHolder.grandfather_name,
                                phone: selected._autoHolder.phone,
                                email: selected._autoHolder.email,
                                address: selected._autoHolder.address,
                                national_id: selected._autoHolder.national_id
                              });
                              setShowPartyModal(true);
                            }}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs shrink-0 flex items-center gap-1 shadow-sm">
                            <UserCheck className="w-3 h-3" /> Register Detected Holder
                          </button>
                        )}
                      </div>
                    )}

                    {/* Table matching Holder List specification */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold">
                            <th className="p-2.5 text-left w-10">No</th>
                            <th className="p-2.5 text-left">Party Type</th>
                            <th className="p-2.5 text-left">Holder Name</th>
                            <th className="p-2.5 text-left">Personal ID / TIN</th>
                            <th className="p-2.5 text-left">Tutorship</th>
                            <th className="p-2.5 text-center w-20">Update</th>
                            <th className="p-2.5 text-center w-20">Delete</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!selected.parties || selected.parties.length === 0) ? (
                            <tr><td colSpan="7" className="p-6 text-center text-slate-400">No holders registered yet. Click "+ Add Holder" above.</td></tr>
                          ) : (
                            selected.parties.map((p, i) => {
                              const holderName = p.party_type === 'LEGAL'
                                ? p.organization_name
                                : p.party_type === 'GROUP'
                                  ? (p.organization_name || `${p.first_name || 'Group'} (Members: ${p.members?.length || 0})`)
                                  : [p.first_name, p.father_name, p.grandfather_name].filter(Boolean).join(' ');

                              return (
                                <tr key={p.id} className="border-t border-slate-100 hover:bg-blue-50/20">
                                  <td className="p-2.5 text-slate-500">{i + 1}</td>
                                  <td className="p-2.5">
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                      p.party_type === 'LEGAL' ? 'bg-indigo-100 text-indigo-800' :
                                      p.party_type === 'GROUP' ? 'bg-purple-100 text-purple-800' :
                                      'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {p.party_type === 'LEGAL' ? 'Legal Person' : p.party_type === 'GROUP' ? 'Group Party' : 'Natural Person'}
                                    </span>
                                  </td>
                                  <td className="p-2.5 font-bold text-slate-800">{holderName}</td>
                                  <td className="p-2.5 font-mono text-[11px] text-slate-600">{p.national_id || p.registration_number || '—'}</td>
                                  <td className="p-2.5 text-slate-600">
                                    {p.is_under_tutorship ? <span className="text-amber-700 font-semibold">Yes ({p.tutor_name || 'Tutor'})</span> : 'No'}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <button
                                      disabled={isFinished}
                                      onClick={() => { setEditingParty(p); setShowPartyModal(true); }}
                                      title={isFinished ? 'Cannot modify finished task' : 'Update holder'}
                                      className={`p-1.5 rounded border ${
                                        isFinished ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400' :
                                        'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                                      }`}>
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <button
                                      disabled={isFinished}
                                      onClick={() => handleDeleteParty(p.id)}
                                      title={isFinished ? 'Cannot delete finished task' : 'Delete holder'}
                                      className={`p-1.5 rounded border ${
                                        isFinished ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400' :
                                        'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                      }`}>
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ━━━━━ TAB 2: RRR (Right List, Restriction, Responsibility) ━ */}
                {activeTab === 'rrr' && (
                  <div className="space-y-6">
                    {/* Section 1: Right List matching Screenshot 4 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="border border-blue-300 bg-blue-50/70 rounded px-2.5 py-1">
                          <h4 className="text-xs font-bold text-blue-900">Right List</h4>
                        </div>
                        {!isFinished && (
                          <button onClick={() => { setEditingRight(null); setShowRightModal(true); }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm">
                            <Plus className="w-3.5 h-3.5" /> Add
                          </button>
                        )}
                      </div>
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead><tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-2.5 text-left">Acquisition Type</th>
                            <th className="p-2.5 text-left">Right Type</th>
                            <th className="p-2.5 text-left">Annual Payment</th>
                            <th className="p-2.5 text-left">Begin Life Span</th>
                            <th className="p-2.5 text-center w-28">Action</th>
                          </tr></thead>
                          <tbody>
                            {(!selected.rights || selected.rights.length === 0) ? (
                              <tr><td colSpan="5" className="p-5 text-center text-slate-400">No rights registered. Click "Add" above to register.</td></tr>
                            ) : (
                              selected.rights.map(r => (
                                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                                  <td className="p-2.5 font-medium">{r.acquisition_type || '—'}</td>
                                  <td className="p-2.5 font-bold text-blue-800">
                                    {RIGHT_TYPES.find(t => t.value === r.right_type)?.label || (r.right_type || '').replace(/_/g, ' ')}
                                  </td>
                                  <td className="p-2.5 font-mono font-medium">{r.ground_rent ? `${Number(r.ground_rent).toLocaleString()} ETB` : '—'}</td>
                                  <td className="p-2.5 text-slate-600">{r.start_date ? new Date(r.start_date).toLocaleDateString() : '—'}</td>
                                  <td className="p-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        disabled={isFinished}
                                        onClick={() => { setEditingRight(r); setShowRightModal(true); }}
                                        title={isFinished ? 'Cannot modify finished task' : 'Modify right information'}
                                        className={`px-2 py-1 rounded border text-[11px] font-bold ${
                                          isFinished ? 'opacity-40 cursor-not-allowed bg-slate-100' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                                        }`}>
                                        Modify
                                      </button>
                                      <button
                                        disabled={isFinished}
                                        onClick={() => handleDeleteRight(r.id)}
                                        title={isFinished ? 'Cannot delete finished task' : 'Delete right'}
                                        className={`p-1 rounded border ${
                                          isFinished ? 'opacity-40 cursor-not-allowed bg-slate-100' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                        }`}>
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Section 2: Restriction List matching Screenshot 3 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="border border-slate-300 bg-slate-50 rounded px-2.5 py-1">
                          <h4 className="text-xs font-bold text-slate-800">Restriction List</h4>
                        </div>
                        {!isFinished && (
                          <button onClick={() => { setEditingRestriction(null); setShowRestrictionModal(true); }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm">
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        )}
                      </div>
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead><tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-2.5 text-left">Restriction Type</th>
                            <th className="p-2.5 text-left">Begin Life Span</th>
                            <th className="p-2.5 text-left">End Life Span</th>
                            <th className="p-2.5 text-left">Description</th>
                            <th className="p-2.5 text-left">Status</th>
                            <th className="p-2.5 text-center w-28">Action</th>
                          </tr></thead>
                          <tbody>
                            {(!selected.restrictions || selected.restrictions.length === 0) ? (
                              <tr><td colSpan="6" className="p-4 text-center text-slate-400">No general restrictions registered on this parcel.</td></tr>
                            ) : (
                              selected.restrictions.map(r => {
                                const isCancelled = r.status === 'CANCELLED';
                                return (
                                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                                    <td className="p-2.5 font-bold text-slate-800">{r.restriction_type}</td>
                                    <td className="p-2.5 text-slate-600">{r.imposed_date ? new Date(r.imposed_date).toLocaleDateString() : '—'}</td>
                                    <td className="p-2.5 text-slate-600">—</td>
                                    <td className="p-2.5 text-slate-700 max-w-xs truncate">{r.description}</td>
                                    <td className="p-2.5">
                                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                        isCancelled ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {isCancelled ? 'Released' : 'Restricted'}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-center">
                                      {!isCancelled ? (
                                        <div className="flex items-center justify-center gap-1.5">
                                          <button
                                            disabled={isFinished}
                                            onClick={() => { setReleasingRestriction(r); setShowRestrictionReleaseModal(true); }}
                                            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold text-[11px] shadow-sm">
                                            Release
                                          </button>
                                          <button
                                            disabled={isFinished}
                                            onClick={() => { setEditingRestriction(r); setShowRestrictionModal(true); }}
                                            title="Modify"
                                            className="p-1 text-blue-600 hover:text-blue-800">
                                            <Pencil className="w-3 h-3" />
                                          </button>
                                          <button
                                            disabled={isFinished}
                                            onClick={() => handleDeleteRestriction(r.id)}
                                            title="Delete"
                                            className="p-1 text-rose-600 hover:text-rose-800">
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 text-[11px]">Released</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Section 3: Responsibility List */}
                    <div>
                      <div className="border border-slate-300 bg-slate-50 rounded px-2.5 py-1 mb-2 inline-block">
                        <h4 className="text-xs font-bold text-slate-800">Responsibility List</h4>
                      </div>
                      <div className="border border-slate-200 rounded-lg p-3 text-xs bg-slate-50/40 text-slate-500 space-y-1">
                        <p>• Landholder must maintain property in accordance with municipal zoning regulations.</p>
                        <p>• Ground rent / annual lease payments must be settled before fiscal year end.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ━━━━━ TAB 3: MORTGAGE (Matching Screenshots 4 & 5) ━━━━━━━ */}
                {activeTab === 'mortgage' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="border border-blue-300 bg-blue-50/70 rounded px-2.5 py-1">
                        <h4 className="text-xs font-bold text-blue-900">Mortgage List</h4>
                      </div>
                      {!isFinished && (
                        <button
                          onClick={() => { setEditingMortgage(null); setShowMortgageModal(true); }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm">
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      )}
                    </div>

                    {/* Mortgage List Table matching Screenshot 4 & 5 */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-2.5 text-left">Institution Name</th>
                            <th className="p-2.5 text-left">Amount</th>
                            <th className="p-2.5 text-left">Interest Rate</th>
                            <th className="p-2.5 text-left">Rank</th>
                            <th className="p-2.5 text-left">Letter Number</th>
                            <th className="p-2.5 text-left">Restricted Date</th>
                            <th className="p-2.5 text-left">End Loan Period</th>
                            <th className="p-2.5 text-left">Status</th>
                            <th className="p-2.5 text-center w-36">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!selected.mortgages || selected.mortgages.length === 0) ? (
                            <tr><td colSpan="9" className="p-6 text-center text-slate-400">No mortgages registered on this parcel. Click "Add" above.</td></tr>
                          ) : (
                            selected.mortgages.map(m => {
                              let meta = {};
                              try { if (m.description && m.description.startsWith('{')) meta = JSON.parse(m.description); } catch(e){}
                              const isCancelled = m.status === 'CANCELLED';

                              return (
                                <tr key={m.id} className="border-t border-slate-100 hover:bg-blue-50/20">
                                  <td className="p-2.5 font-bold text-slate-800">{m.mortgagee_name}</td>
                                  <td className="p-2.5 font-mono font-medium">{Number(m.mortgage_amount).toLocaleString()} {m.currency || 'ETB'}</td>
                                  <td className="p-2.5">{meta.interest_rate ? `${meta.interest_rate}%` : '—'}</td>
                                  <td className="p-2.5">{meta.rank || '1'}</td>
                                  <td className="p-2.5 font-mono text-[11px]">{m.loan_agreement_number || '—'}</td>
                                  <td className="p-2.5 text-slate-600">{m.mortgage_date ? new Date(m.mortgage_date).toLocaleDateString() : '—'}</td>
                                  <td className="p-2.5 text-slate-600">{meta.end_loan_period ? new Date(meta.end_loan_period).toLocaleDateString() : '—'}</td>
                                  <td className="p-2.5">
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                      isCancelled ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {isCancelled ? 'Released' : 'Restricted'}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center">
                                    {!isCancelled ? (
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          disabled={isFinished}
                                          onClick={() => { setEditingMortgage(m); setShowMortgageModal(true); }}
                                          title="Modify mortgage information"
                                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-bold text-[11px]">
                                          Modify
                                        </button>
                                        <button
                                          disabled={isFinished}
                                          onClick={() => { setReleasingMortgage(m); setShowMortgageReleaseModal(true); }}
                                          className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold text-[11px] shadow-sm">
                                          Release
                                        </button>
                                        <button
                                          disabled={isFinished}
                                          onClick={() => handleDeleteMortgage(m.id)}
                                          title="Delete"
                                          className="p-1 text-rose-600 hover:text-rose-800">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 text-[11px]">Released</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ━━━━━ TAB 4: COURT INJUNCTION (Screenshots 1 & 2) ━━━━━━━━━ */}
                {activeTab === 'injunction' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="border border-blue-300 bg-blue-50/70 rounded px-2.5 py-1">
                        <h4 className="text-xs font-bold text-blue-900">Court Injunction List</h4>
                      </div>
                      {!isFinished && (
                        <button
                          onClick={() => { setEditingInjunction(null); setShowInjunctionModal(true); }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm">
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      )}
                    </div>
                    {/* Court Injunction Table matching Screenshots 1 & 2 */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead><tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-2.5 text-left">Court Name</th>
                          <th className="p-2.5 text-left">Letter Number</th>
                          <th className="p-2.5 text-left">Restricted Date</th>
                          <th className="p-2.5 text-left">Status</th>
                          <th className="p-2.5 text-center w-36">Action</th>
                        </tr></thead>
                        <tbody>
                          {(!selected.injunctions || selected.injunctions.length === 0) ? (
                            <tr><td colSpan="5" className="p-6 text-center text-slate-400">No court injunctions registered on this parcel. Click "Add" above.</td></tr>
                          ) : (
                            selected.injunctions.map(inj => {
                              const isCancelled = inj.status === 'CANCELLED';
                              return (
                                <tr key={inj.id} className="border-t border-slate-100 hover:bg-slate-50">
                                  <td className="p-2.5 font-bold text-slate-800">{inj.court_name}</td>
                                  <td className="p-2.5 font-mono">{inj.case_number}</td>
                                  <td className="p-2.5 text-slate-600">{inj.injunction_date ? new Date(inj.injunction_date).toLocaleDateString() : '—'}</td>
                                  <td className="p-2.5">
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                      isCancelled ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {isCancelled ? 'Released' : 'Restricted'}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center">
                                    {!isCancelled ? (
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          disabled={isFinished}
                                          onClick={() => { setReleasingInjunction(inj); setShowInjunctionReleaseModal(true); }}
                                          className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold text-[11px] shadow-sm">
                                          Release
                                        </button>
                                        <button
                                          disabled={isFinished}
                                          onClick={() => { setEditingInjunction(inj); setShowInjunctionModal(true); }}
                                          title="Modify"
                                          className="p-1 text-blue-600 hover:text-blue-800">
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          disabled={isFinished}
                                          onClick={() => handleDeleteInjunction(inj.id)}
                                          title="Delete"
                                          className="p-1 text-rose-600 hover:text-rose-800">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 text-[11px]">Released</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ━━━━━ TAB 5: DOCUMENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {activeTab === 'document' && (
                  <div className="space-y-4">
                    <div className="border border-blue-300 bg-blue-50/70 rounded px-2.5 py-1 inline-block">
                      <h4 className="text-xs font-bold text-blue-900">Submitted Documents</h4>
                    </div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead><tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-2.5 text-left w-10">No</th>
                          <th className="p-2.5 text-left">Document Type</th>
                          <th className="p-2.5 text-left">Category</th>
                          <th className="p-2.5 text-left">File Name</th>
                          <th className="p-2.5 text-left">Reference #</th>
                          <th className="p-2.5 text-right">Actions</th>
                        </tr></thead>
                        <tbody>
                          {(!selected.documents || selected.documents.length === 0) ? (
                            <tr><td colSpan="6" className="p-6 text-center text-slate-400">No documents submitted for this transaction.</td></tr>
                          ) : (
                            selected.documents.map((d, i) => (
                              <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="p-2.5 text-slate-500">{i + 1}</td>
                                <td className="p-2.5 font-bold text-slate-800">{d.document_type || d.documentType || '—'}</td>
                                <td className="p-2.5">{d.category || '—'}</td>
                                <td className="p-2.5 font-mono text-[11px] text-slate-600">{d.file_name || d.fileName || '—'}</td>
                                <td className="p-2.5 font-mono text-slate-600">{d.reference_number || d.referenceNumber || '—'}</td>
                                <td className="p-2.5 text-right flex items-center justify-end gap-1.5">
                                  <button onClick={() => {
                                    const token = localStorage.getItem('crprs_token');
                                    window.open(`/api/documents/${d.id}/preview?token=${token}`, '_blank');
                                  }} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700" title="View Preview">
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => {
                                    const token = localStorage.getItem('crprs_token');
                                    window.open(`/api/documents/${d.id}/download?token=${token}`, '_blank');
                                  }} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700" title="Download">
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ━━━━━ TAB 6: MAP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {activeTab === 'map' && (
                  <div className="text-center py-12 text-slate-400">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-bold text-slate-600">Map & Spatial Boundary</p>
                    <p className="text-xs mt-1">Cadastral boundary details for Parcel Code:</p>
                    <p className="text-xs font-mono font-bold text-blue-600 mt-1">{selected.parcel_code || selected.parcel_id}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ MODALS ═══════════════════════════════════════ */}

      {/* 1. PARTY REGISTRATION MODAL */}
      {showPartyModal && selected && (
        <ComprehensivePartyModal
          txn={selected}
          initialParty={editingParty}
          onClose={() => { setShowPartyModal(false); setEditingParty(null); }}
          onSaved={() => { setShowPartyModal(false); setEditingParty(null); refreshSelected(); }}
        />
      )}

      {/* 2. RIGHT MODAL (Screenshot 4: Modify Right Information) */}
      {showRightModal && selected && (
        <RightModalMatching
          txn={selected}
          initialRight={editingRight}
          onClose={() => { setShowRightModal(false); setEditingRight(null); }}
          onSaved={() => { setShowRightModal(false); setEditingRight(null); refreshSelected(); }}
        />
      )}

      {/* 3. MORTGAGE MODAL (Screenshot 4: Add & Screenshot 5: Modify Mortgage Information) */}
      {showMortgageModal && selected && (
        <ComprehensiveMortgageModal
          txn={selected}
          initialMortgage={editingMortgage}
          onClose={() => { setShowMortgageModal(false); setEditingMortgage(null); }}
          onSaved={() => { setShowMortgageModal(false); setEditingMortgage(null); refreshSelected(); }}
        />
      )}

      {/* 4. MORTGAGE RELEASE MODAL */}
      {showMortgageReleaseModal && releasingMortgage && (
        <MortgageReleaseModal
          mortgage={releasingMortgage}
          onClose={() => { setShowMortgageReleaseModal(false); setReleasingMortgage(null); }}
          onSaved={() => { setShowMortgageReleaseModal(false); setReleasingMortgage(null); refreshSelected(); }}
        />
      )}

      {/* 5. COURT INJUNCTION MODAL (Screenshot 1: Add Court Injunction Information) */}
      {showInjunctionModal && selected && (
        <CourtInjunctionModalMatching
          txn={selected}
          initialInjunction={editingInjunction}
          onClose={() => { setShowInjunctionModal(false); setEditingInjunction(null); }}
          onSaved={() => { setShowInjunctionModal(false); setEditingInjunction(null); refreshSelected(); }}
        />
      )}

      {/* 6. COURT INJUNCTION RELEASE MODAL (Screenshot 2: Cancel/Release Court Injunction) */}
      {showInjunctionReleaseModal && releasingInjunction && (
        <CourtInjunctionReleaseModal
          injunction={releasingInjunction}
          onClose={() => { setShowInjunctionReleaseModal(false); setReleasingInjunction(null); }}
          onSaved={() => { setShowInjunctionReleaseModal(false); setReleasingInjunction(null); refreshSelected(); }}
        />
      )}

      {/* 7. GENERAL RESTRICTION MODAL (Screenshot 3: Add General Restriction) */}
      {showRestrictionModal && selected && (
        <GeneralRestrictionModalMatching
          txn={selected}
          initialRestriction={editingRestriction}
          onClose={() => { setShowRestrictionModal(false); setEditingRestriction(null); }}
          onSaved={() => { setShowRestrictionModal(false); setEditingRestriction(null); refreshSelected(); }}
        />
      )}

      {/* 8. GENERAL RESTRICTION RELEASE MODAL */}
      {showRestrictionReleaseModal && releasingRestriction && (
        <GeneralRestrictionReleaseModal
          restriction={releasingRestriction}
          onClose={() => { setShowRestrictionReleaseModal(false); setReleasingRestriction(null); }}
          onSaved={() => { setShowRestrictionReleaseModal(false); setReleasingRestriction(null); refreshSelected(); }}
        />
      )}
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// 1. PARTY MODAL: Screenshots 1, 2, 3 (Legal, Natural, Group)
// ═════════════════════════════════════════════════════════════════════════════
function ComprehensivePartyModal({ txn, initialParty, onClose, onSaved }) {
  const isEditing = Boolean(initialParty && initialParty.id);
  const [partyType, setPartyType] = useState(initialParty?.party_type || 'NATURAL');
  const [isUnderTutorship, setIsUnderTutorship] = useState(initialParty?.is_under_tutorship || false);
  const [tutorName, setTutorName] = useState(initialParty?.tutor_name || '');

  const [naturalForm, setNaturalForm] = useState({
    first_name: initialParty?.first_name || '',
    father_name: initialParty?.father_name || '',
    grandfather_name: initialParty?.grandfather_name || '',
    mother_name: initialParty?.mother_name || '',
    birth_date: initialParty?.date_of_birth ? new Date(initialParty.date_of_birth).toISOString().split('T')[0] : '',
    birth_place: initialParty?.birth_place || '',
    sex: initialParty?.sex || 'M',
    marital_status: initialParty?.marital_status || 'Single',
    tin_number: initialParty?.tin_number || '',
    personal_id_type: initialParty?.personal_id_type || 'Kebele ID',
    personal_id: initialParty?.national_id || ''
  });

  const [legalForm, setLegalForm] = useState({
    institution_name: initialParty?.organization_name || '',
    legal_party_type: initialParty?.organization_type || 'Company',
    tin_number: initialParty?.registration_number || '',
    rep_first_name: initialParty?.first_name || '',
    rep_father_name: initialParty?.father_name || '',
    rep_grandfather_name: initialParty?.grandfather_name || '',
    rep_gender: initialParty?.sex || 'M',
    rep_personal_id_type: 'Kebele ID',
    rep_personal_id: initialParty?.national_id || ''
  });

  const [groupForm, setGroupForm] = useState({
    group_party_name: initialParty?.organization_name || '',
    group_party_type: initialParty?.organization_type || 'Family'
  });
  const [members, setMembers] = useState(initialParty?.members || []);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberInput, setMemberInput] = useState({
    first_name: '', father_name: '', grandfather_name: '', sex: 'M', national_id: '', share_percentage: '50.00', phone: ''
  });

  const [saving, setSaving] = useState(false);

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!memberInput.first_name || !memberInput.father_name) {
      toast.error('Member first name and father name are required');
      return;
    }
    setMembers([...members, { ...memberInput, id: Date.now() }]);
    setMemberInput({ first_name: '', father_name: '', grandfather_name: '', sex: 'M', national_id: '', share_percentage: '', phone: '' });
    setShowMemberForm(false);
  };

  const handleRemoveMember = (idx) => {
    setMembers(members.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to save this holder information?')) return;

    setSaving(true);
    try {
      let payload = {
        parcel_id: txn.parcel_id,
        party_type: partyType,
        is_under_tutorship: isUnderTutorship,
        tutor_name: isUnderTutorship ? tutorName : null
      };

      if (partyType === 'NATURAL') {
        if (!naturalForm.first_name || !naturalForm.father_name) {
          toast.error('First Name and Father Name are required for Natural Person');
          setSaving(false);
          return;
        }
        payload = {
          ...payload,
          first_name: naturalForm.first_name,
          father_name: naturalForm.father_name,
          grandfather_name: naturalForm.grandfather_name,
          sex: naturalForm.sex,
          date_of_birth: naturalForm.birth_date || null,
          national_id: naturalForm.personal_id,
          registration_number: naturalForm.tin_number,
          address: naturalForm.birth_place
        };
      } else if (partyType === 'LEGAL') {
        if (!legalForm.institution_name) {
          toast.error('Institution Name is required for Legal Person');
          setSaving(false);
          return;
        }
        payload = {
          ...payload,
          organization_name: legalForm.institution_name,
          organization_type: legalForm.legal_party_type,
          registration_number: legalForm.tin_number,
          first_name: legalForm.rep_first_name,
          father_name: legalForm.rep_father_name,
          grandfather_name: legalForm.rep_grandfather_name,
          sex: legalForm.rep_gender,
          national_id: legalForm.rep_personal_id
        };
      } else if (partyType === 'GROUP') {
        if (!groupForm.group_party_name) {
          toast.error('Group party name is required');
          setSaving(false);
          return;
        }
        payload = {
          ...payload,
          organization_name: groupForm.group_party_name,
          organization_type: groupForm.group_party_type,
          members: members
        };
      }

      if (isEditing) {
        await API.put(`/parties/${initialParty.id}`, payload);
        toast.success('✅ Holder updated successfully');
      } else {
        await API.post('/parties', payload);
        toast.success('✅ Holder registered successfully');
      }
      onSaved();
    } catch (err) {
      console.error('Save party error:', err);
      toast.error(err.response?.data?.message || 'Failed to save party. Please check required fields.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between rounded-t-xl">
          <div className="border border-blue-400 bg-blue-50/80 px-3 py-1 rounded">
            <h3 className="font-bold text-xs text-blue-950">
              Basic Information
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={handleSubmit} disabled={saving}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm">
              <Save className="w-3.5 h-3.5" /> Save
            </button>
            <button type="button" onClick={onClose}
              className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded text-xs font-bold flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 ml-2"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <label className="font-bold text-slate-800 shrink-0">Party Type:<span className="text-rose-500">*</span></label>
            <select value={partyType} onChange={e => setPartyType(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded font-semibold text-slate-800 bg-white">
              <option value="NATURAL">Natural Person</option>
              <option value="LEGAL">Legal Person</option>
              <option value="GROUP">Group Party</option>
            </select>
          </div>

          {/* Natural Person */}
          {partyType === 'NATURAL' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-slate-800">Tutor:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                    <input type="radio" name="tutor" checked={isUnderTutorship} onChange={() => setIsUnderTutorship(true)} /> Yes
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                    <input type="radio" name="tutor" checked={!isUnderTutorship} onChange={() => setIsUnderTutorship(false)} /> No
                  </label>
                </div>
                {isUnderTutorship ? (
                  <div className="mt-2.5">
                    <label className="font-bold text-blue-900 block mb-1">Tutor Full Name / Organization:<span className="text-rose-500">*</span></label>
                    <input type="text" placeholder="Enter legal tutor or guardian name..." value={tutorName} onChange={e => setTutorName(e.target.value)} className="w-full p-2 border border-blue-300 rounded bg-white" required />
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1 italic">If landholding users are under tutorship administration, tick on yes and register tutor info.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="font-semibold text-slate-700 block mb-1">First Name:<span className="text-rose-500">*</span></label><input type="text" className="w-full p-2 border border-slate-300 rounded" value={naturalForm.first_name} onChange={e => setNaturalForm({...naturalForm, first_name: e.target.value})} required /></div>
                <div><label className="font-semibold text-slate-700 block mb-1">Father Name:<span className="text-rose-500">*</span></label><input type="text" className="w-full p-2 border border-slate-300 rounded" value={naturalForm.father_name} onChange={e => setNaturalForm({...naturalForm, father_name: e.target.value})} required /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="font-semibold text-slate-700 block mb-1">Grand Father Name:<span className="text-rose-500">*</span></label><input type="text" className="w-full p-2 border border-slate-300 rounded" value={naturalForm.grandfather_name} onChange={e => setNaturalForm({...naturalForm, grandfather_name: e.target.value})} required /></div>
                <div><label className="font-semibold text-slate-700 block mb-1">Mother Name:<span className="text-rose-500">*</span></label><input type="text" className="w-full p-2 border border-slate-300 rounded" value={naturalForm.mother_name} onChange={e => setNaturalForm({...naturalForm, mother_name: e.target.value})} /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="font-semibold text-slate-700 block mb-1">Birth Date:<span className="text-rose-500">*</span></label><input type="date" className="w-full p-2 border border-slate-300 rounded" value={naturalForm.birth_date} onChange={e => setNaturalForm({...naturalForm, birth_date: e.target.value})} /></div>
                <div><label className="font-semibold text-slate-700 block mb-1">Birth Place:<span className="text-rose-500">*</span></label><input type="text" placeholder="e.g. Addis Ababa" className="w-full p-2 border border-slate-300 rounded" value={naturalForm.birth_place} onChange={e => setNaturalForm({...naturalForm, birth_place: e.target.value})} /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="font-semibold text-slate-700 block mb-1">Gender:<span className="text-rose-500">*</span></label><select className="w-full p-2 border border-slate-300 rounded" value={naturalForm.sex} onChange={e => setNaturalForm({...naturalForm, sex: e.target.value})}><option value="M">Male</option><option value="F">Female</option></select></div>
                <div><label className="font-semibold text-slate-700 block mb-1">Marital Status:<span className="text-rose-500">*</span></label><select className="w-full p-2 border border-slate-300 rounded" value={naturalForm.marital_status} onChange={e => setNaturalForm({...naturalForm, marital_status: e.target.value})}><option value="Single">Single</option><option value="Married">Married</option><option value="Divorced">Divorced</option><option value="Widowed">Widowed</option></select></div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div><label className="font-semibold text-slate-700 block mb-1">Tin Number:</label><input type="text" placeholder="TIN..." className="w-full p-2 border border-slate-300 rounded" value={naturalForm.tin_number} onChange={e => setNaturalForm({...naturalForm, tin_number: e.target.value})} /></div>
                <div><label className="font-semibold text-slate-700 block mb-1">Personal Id Type:<span className="text-rose-500">*</span></label><select className="w-full p-2 border border-slate-300 rounded" value={naturalForm.personal_id_type} onChange={e => setNaturalForm({...naturalForm, personal_id_type: e.target.value})}><option value="Kebele ID">Kebele ID</option><option value="National ID">National ID</option><option value="Passport">Passport</option><option value="Driving License">Driving License</option></select></div>
                <div><label className="font-semibold text-slate-700 block mb-1">Personal ID:<span className="text-rose-500">*</span></label><input type="text" placeholder="ID Number..." className="w-full p-2 border border-slate-300 rounded" value={naturalForm.personal_id} onChange={e => setNaturalForm({...naturalForm, personal_id: e.target.value})} /></div>
              </div>
            </div>
          )}

          {/* Legal Person */}
          {partyType === 'LEGAL' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="border border-blue-400 bg-blue-50/80 px-2 py-0.5 rounded inline-block"><h4 className="text-[11px] font-bold text-blue-900">Basic Information</h4></div>
                <div><label className="font-semibold text-slate-700 block mb-1">Institution Name:<span className="text-rose-500">*</span></label><input type="text" placeholder="e.g. Commercial Bank of Ethiopia, ABC Real Estate" className="w-full p-2 border border-slate-300 rounded" value={legalForm.institution_name} onChange={e => setLegalForm({...legalForm, institution_name: e.target.value})} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="font-semibold text-slate-700 block mb-1">Legal Party Type:<span className="text-rose-500">*</span></label><select className="w-full p-2 border border-slate-300 rounded" value={legalForm.legal_party_type} onChange={e => setLegalForm({...legalForm, legal_party_type: e.target.value})}><option value="Company">Private Limited Company (PLC)</option><option value="Share Company">Share Company (S.C.)</option><option value="Bank">Bank / Financial Institution</option><option value="Association">Association / NGO</option><option value="Condominium">Condominium Administration</option><option value="Public Body">Public Body / Government Agency</option><option value="Embassy">Embassy / International Mission</option><option value="Other">Other</option></select></div>
                  <div><label className="font-semibold text-slate-700 block mb-1">Tin Number:<span className="text-rose-500">*</span></label><input type="text" placeholder="e.g. 0001234567" className="w-full p-2 border border-slate-300 rounded font-mono" value={legalForm.tin_number} onChange={e => setLegalForm({...legalForm, tin_number: e.target.value})} required /></div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="border border-blue-400 bg-blue-50/80 px-2 py-0.5 rounded inline-block"><h4 className="text-[11px] font-bold text-blue-900">Representative</h4></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="font-semibold text-slate-700 block mb-1">First Name:<span className="text-rose-500">*</span></label><input type="text" className="w-full p-2 border border-slate-300 rounded" value={legalForm.rep_first_name} onChange={e => setLegalForm({...legalForm, rep_first_name: e.target.value})} required /></div>
                  <div><label className="font-semibold text-slate-700 block mb-1">Father Name:<span className="text-rose-500">*</span></label><input type="text" className="w-full p-2 border border-slate-300 rounded" value={legalForm.rep_father_name} onChange={e => setLegalForm({...legalForm, rep_father_name: e.target.value})} required /></div>
                  <div><label className="font-semibold text-slate-700 block mb-1">Grand Father Name:<span className="text-rose-500">*</span></label><input type="text" className="w-full p-2 border border-slate-300 rounded" value={legalForm.rep_grandfather_name} onChange={e => setLegalForm({...legalForm, rep_grandfather_name: e.target.value})} required /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="font-semibold text-slate-700 block mb-1">Gender:<span className="text-rose-500">*</span></label><select className="w-full p-2 border border-slate-300 rounded" value={legalForm.rep_gender} onChange={e => setLegalForm({...legalForm, rep_gender: e.target.value})}><option value="M">Male</option><option value="F">Female</option></select></div>
                  <div><label className="font-semibold text-slate-700 block mb-1">Personal Id Type:<span className="text-rose-500">*</span></label><select className="w-full p-2 border border-slate-300 rounded" value={legalForm.rep_personal_id_type} onChange={e => setLegalForm({...legalForm, rep_personal_id_type: e.target.value})}><option value="Kebele ID">Kebele ID</option><option value="National ID">National ID</option><option value="Passport">Passport</option><option value="Driving License">Driving License</option></select></div>
                  <div><label className="font-semibold text-slate-700 block mb-1">Personal ID:<span className="text-rose-500">*</span></label><input type="text" className="w-full p-2 border border-slate-300 rounded" value={legalForm.rep_personal_id} onChange={e => setLegalForm({...legalForm, rep_personal_id: e.target.value})} required /></div>
                </div>
              </div>
            </div>
          )}

          {/* Group Party */}
          {partyType === 'GROUP' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-slate-800">Tutor:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700"><input type="radio" name="grouptutor" checked={isUnderTutorship} onChange={() => setIsUnderTutorship(true)} /> Yes</label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700"><input type="radio" name="grouptutor" checked={!isUnderTutorship} onChange={() => setIsUnderTutorship(false)} /> No</label>
                </div>
                {isUnderTutorship && (
                  <div className="mt-2.5"><label className="font-bold text-blue-900 block mb-1">Tutor Information:<span className="text-rose-500">*</span></label><input type="text" placeholder="Tutor name..." value={tutorName} onChange={e => setTutorName(e.target.value)} className="w-full p-2 border border-blue-300 rounded bg-white" required /></div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="font-semibold text-slate-700 block mb-1">Group party name:<span className="text-rose-500">*</span></label><input type="text" placeholder="e.g. Kebede Family Heirs" className="w-full p-2 border border-slate-300 rounded" value={groupForm.group_party_name} onChange={e => setGroupForm({...groupForm, group_party_name: e.target.value})} required /></div>
                <div><label className="font-semibold text-slate-700 block mb-1">Group party typ:<span className="text-rose-500">*</span></label><select className="w-full p-2 border border-slate-300 rounded" value={groupForm.group_party_type} onChange={e => setGroupForm({...groupForm, group_party_type: e.target.value})}><option value="Family">Family</option><option value="Association">Association</option><option value="Joint Ownership">Joint Ownership</option><option value="Heirs">Heirs / Successors</option><option value="Other">Other</option></select></div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-700">Group Members ({members.length})</span>
                  <button type="button" onClick={() => setShowMemberForm(true)} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[11px] flex items-center gap-1 shadow-sm"><Plus className="w-3 h-3" /> Add Member</button>
                </div>

                {showMemberForm && (
                  <div className="p-3 bg-slate-100 rounded-lg border border-slate-300 mb-3 space-y-2">
                    <h5 className="font-bold text-slate-800 text-[11px]">New Member Details</h5>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="text" placeholder="First Name *" value={memberInput.first_name} onChange={e => setMemberInput({...memberInput, first_name: e.target.value})} className="p-1.5 border border-slate-300 rounded" />
                      <input type="text" placeholder="Father Name *" value={memberInput.father_name} onChange={e => setMemberInput({...memberInput, father_name: e.target.value})} className="p-1.5 border border-slate-300 rounded" />
                      <input type="text" placeholder="Grand Father Name" value={memberInput.grandfather_name} onChange={e => setMemberInput({...memberInput, grandfather_name: e.target.value})} className="p-1.5 border border-slate-300 rounded" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <select value={memberInput.sex} onChange={e => setMemberInput({...memberInput, sex: e.target.value})} className="p-1.5 border border-slate-300 rounded"><option value="M">Male</option><option value="F">Female</option></select>
                      <input type="text" placeholder="Share % (e.g. 50)" value={memberInput.share_percentage} onChange={e => setMemberInput({...memberInput, share_percentage: e.target.value})} className="p-1.5 border border-slate-300 rounded" />
                      <input type="text" placeholder="National ID" value={memberInput.national_id} onChange={e => setMemberInput({...memberInput, national_id: e.target.value})} className="p-1.5 border border-slate-300 rounded" />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button type="button" onClick={() => setShowMemberForm(false)} className="px-2 py-1 bg-slate-200 rounded font-semibold">Cancel</button>
                      <button type="button" onClick={handleAddMember} className="px-3 py-1 bg-emerald-600 text-white rounded font-bold">Add</button>
                    </div>
                  </div>
                )}

                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead><tr className="bg-slate-200/80 text-slate-700 font-bold"><th className="p-2 w-8">No</th><th className="p-2">Party Type</th><th className="p-2">Holder Name</th><th className="p-2">Share %</th><th className="p-2 text-center w-14">Delete</th></tr></thead>
                    <tbody>
                      {members.length === 0 ? (
                        <tr><td colSpan="5" className="p-3 text-center text-slate-400">No members added yet. Click "+ Add Member" above.</td></tr>
                      ) : (
                        members.map((m, idx) => (
                          <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="p-2">{idx + 1}</td>
                            <td className="p-2 font-medium">Natural Person</td>
                            <td className="p-2 font-bold">{[m.first_name, m.father_name, m.grandfather_name].filter(Boolean).join(' ')}</td>
                            <td className="p-2 font-mono">{m.share_percentage ? `${m.share_percentage}%` : '—'}</td>
                            <td className="p-2 text-center">
                              <button type="button" onClick={() => handleRemoveMember(idx)} className="p-1 text-rose-600 hover:text-rose-800"><Trash2 className="w-3.5 h-3.5" /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1.5 shadow-sm">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : (isEditing ? 'Update' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// 2. RIGHT MODAL: Matching Screenshot 4 (Modify Right Information)
// ═════════════════════════════════════════════════════════════════════════════
function RightModalMatching({ txn, initialRight, onClose, onSaved }) {
  const isEditing = Boolean(initialRight && initialRight.id);

  const [form, setForm] = useState({
    right_type: initialRight?.right_type || 'OLD_POSSESSION',
    acquisition_type: initialRight?.acquisition_type || 'Inheritance',
    annual_payment: initialRight?.ground_rent || '200',
    begin_life_span: initialRight?.start_date ? new Date(initialRight.start_date).toISOString().split('T')[0] : '1991-10-06'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.confirm('Save right information?')) return;
    setSaving(true);
    try {
      const payload = {
        parcel_id: txn.parcel_id,
        transaction_id: txn.id,
        right_type: form.right_type,
        acquisition_type: form.acquisition_type,
        ground_rent: form.annual_payment ? parseFloat(form.annual_payment) : null,
        start_date: form.begin_life_span || null
      };

      if (isEditing) {
        await API.put(`/rrr/rights/${initialRight.id}`, payload);
        toast.success('✅ Right information modified successfully');
      } else {
        await API.post('/rrr/rights', payload);
        toast.success('✅ Right information registered successfully');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save right information');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between rounded-t-xl">
          <div className="border border-blue-400 bg-blue-50/80 px-3 py-1 rounded">
            <h3 className="font-bold text-xs text-blue-950">
              {isEditing ? 'Modify Right Information' : 'Add Right Information'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 text-xs space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-[11px] font-bold text-slate-800">Right Information</h4>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Right Type:</label>
              <select className="w-full p-2 border border-slate-300 rounded bg-white font-medium" value={form.right_type} onChange={e => setForm({...form, right_type: e.target.value})}>
                {RIGHT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Acquisition Type:</label>
              <select className="w-full p-2 border border-slate-300 rounded bg-white font-medium" value={form.acquisition_type} onChange={e => setForm({...form, acquisition_type: e.target.value})}>
                {ACQUISITION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Annual Payment:<span className="text-rose-500">*</span></label>
              <input type="number" step="0.01" className="w-full p-2 border border-slate-300 rounded font-mono" value={form.annual_payment} onChange={e => setForm({...form, annual_payment: e.target.value})} required />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Begin Life Span:</label>
              <input type="date" className="w-full p-2 border border-slate-300 rounded" value={form.begin_life_span} onChange={e => setForm({...form, begin_life_span: e.target.value})} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button type="button" onClick={() => setForm({ right_type: 'OLD_POSSESSION', acquisition_type: 'Inheritance', annual_payment: '', begin_life_span: '' })} className="px-4 py-2 bg-slate-100 rounded font-bold">Reset</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold flex items-center gap-1">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : (isEditing ? 'Modify' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// 3. MORTGAGE MODAL: Matching Screenshot 4 (Add) & Screenshot 5 (Modify)
// ═════════════════════════════════════════════════════════════════════════════
function ComprehensiveMortgageModal({ txn, initialMortgage, onClose, onSaved }) {
  const isEditing = Boolean(initialMortgage && initialMortgage.id);
  const defaultHolder = txn.applicant_name ? `${txn.applicant_name} (Lease)` : 'Solomon Kabede (Lease)';

  let existingMeta = {};
  if (initialMortgage?.description) {
    try { if (initialMortgage.description.startsWith('{')) existingMeta = JSON.parse(initialMortgage.description); } catch(e){}
  }

  const [form, setForm] = useState({
    right_holder: existingMeta.right_holder || defaultHolder,
    amount: initialMortgage?.mortgage_amount || '500000.00',
    interest_rate: existingMeta.interest_rate || '10',
    rank: existingMeta.rank || '1',
    letter_number: initialMortgage?.loan_agreement_number || 'buna145555555',
    begin_loan_period: initialMortgage?.mortgage_date ? new Date(initialMortgage.mortgage_date).toISOString().split('T')[0] : '2010-06-18',
    end_loan_period: existingMeta.end_loan_period || '2011-06-28',

    institution_name: initialMortgage?.mortgagee_name || 'Bunna International',
    legal_party_type: initialMortgage?.mortgagee_type || 'Bank',
    tin_number: existingMeta.tin_number || '9877777777',

    region: existingMeta.region || 'Dire Dawa',
    zone: existingMeta.zone || 'DireDawa',
    city: existingMeta.city || 'DireDawa',
    sub_city: existingMeta.sub_city || '',
    woreda: existingMeta.woreda || '',
    kebele: existingMeta.kebele || '',
    street_name: existingMeta.street_name || '',
    street_number: existingMeta.street_number || '',
    house_number: existingMeta.house_number || '',
    po_box: existingMeta.po_box || ''
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.institution_name || !form.amount || !form.letter_number) {
      toast.error('Institution Name, Amount, and Letter Number are required');
      return;
    }
    if (!window.confirm('Save mortgage information?')) return;

    setSaving(true);
    try {
      const meta = {
        right_holder: form.right_holder,
        interest_rate: form.interest_rate,
        rank: form.rank,
        end_loan_period: form.end_loan_period,
        tin_number: form.tin_number,
        region: form.region,
        zone: form.zone,
        city: form.city,
        sub_city: form.sub_city,
        woreda: form.woreda,
        kebele: form.kebele,
        street_name: form.street_name,
        street_number: form.street_number,
        house_number: form.house_number,
        po_box: form.po_box
      };

      const payload = {
        parcel_id: txn.parcel_id,
        transaction_id: txn.id,
        mortgagee_name: form.institution_name,
        mortgagee_type: form.legal_party_type,
        mortgage_amount: parseFloat(form.amount),
        currency: 'ETB',
        mortgage_date: form.begin_loan_period || new Date().toISOString().split('T')[0],
        loan_agreement_number: form.letter_number,
        description: JSON.stringify(meta)
      };

      if (isEditing) {
        await API.put(`/mortgages/${initialMortgage.id}`, payload);
        toast.success('✅ Mortgage modified successfully');
      } else {
        await API.post('/mortgages', payload);
        toast.success('✅ Mortgage registered successfully');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save mortgage information');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between rounded-t-xl">
          <div className="border border-blue-400 bg-blue-50/80 px-3 py-1 rounded">
            <h3 className="font-bold text-xs text-blue-950">
              {isEditing ? 'Modify Mortgage Information' : 'Add Mortgage Information'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 text-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                <h4 className="text-[11px] font-bold text-slate-800">Mortgage Information</h4>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Right Holder:</label>
                  <input type="text" className="w-full p-2 border border-slate-300 rounded bg-slate-100 font-medium" value={form.right_holder} onChange={e => setForm({...form, right_holder: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Amount:*</label>
                    <input type="number" step="0.01" className="w-full p-2 border border-slate-300 rounded font-mono" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Interest Rate %:*</label>
                    <input type="number" step="0.01" className="w-full p-2 border border-slate-300 rounded" value={form.interest_rate} onChange={e => setForm({...form, interest_rate: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Rank:*</label>
                    <select className="w-full p-2 border border-slate-300 rounded" value={form.rank} onChange={e => setForm({...form, rank: e.target.value})}>
                      <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Letter Number:*</label>
                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-mono" value={form.letter_number} onChange={e => setForm({...form, letter_number: e.target.value})} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Begin Loan Period:*</label>
                    <input type="date" className="w-full p-2 border border-slate-300 rounded" value={form.begin_loan_period} onChange={e => setForm({...form, begin_loan_period: e.target.value})} required />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">End Loan Period:*</label>
                    <input type="date" className="w-full p-2 border border-slate-300 rounded" value={form.end_loan_period} onChange={e => setForm({...form, end_loan_period: e.target.value})} required />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                <h4 className="text-[11px] font-bold text-slate-800">Basic Information</h4>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Institution Name:*</label>
                  <input type="text" className="w-full p-2 border border-slate-300 rounded font-bold" value={form.institution_name} onChange={e => setForm({...form, institution_name: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Legal Party Type:*</label>
                    <select className="w-full p-2 border border-slate-300 rounded" value={form.legal_party_type} onChange={e => setForm({...form, legal_party_type: e.target.value})}>
                      <option value="Bank">Bank</option><option value="Microfinance">Microfinance</option><option value="Private Lender">Private Lender</option><option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tin Number:*</label>
                    <input type="text" className="w-full p-2 border border-slate-300 rounded font-mono" value={form.tin_number} onChange={e => setForm({...form, tin_number: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Address Information matching Screenshot 5 */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
              <h4 className="text-[11px] font-bold text-slate-800">Address Information</h4>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Region:*</label>
                  <select className="w-full p-2 border border-slate-300 rounded" value={form.region} onChange={e => setForm({...form, region: e.target.value})}>
                    <option value="Dire Dawa">Dire Dawa</option><option value="Addis Ababa">Addis Ababa</option><option value="Oromia">Oromia</option><option value="Amhara">Amhara</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Zone:*</label>
                  <input type="text" className="w-full p-2 border border-slate-300 rounded" value={form.zone} onChange={e => setForm({...form, zone: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">City:*</label>
                  <input type="text" className="w-full p-2 border border-slate-300 rounded" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sub City:</label>
                  <input type="text" className="w-full p-2 border border-slate-300 rounded" value={form.sub_city} onChange={e => setForm({...form, sub_city: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Woreda:</label>
                  <input type="text" className="w-full p-2 border border-slate-300 rounded" value={form.woreda} onChange={e => setForm({...form, woreda: e.target.value})} />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kebele:</label>
                  <input type="text" className="w-full p-2 border border-slate-300 rounded" value={form.kebele} onChange={e => setForm({...form, kebele: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Street Name:</label>
                <input type="text" className="w-full p-2 border border-slate-300 rounded" value={form.street_name} onChange={e => setForm({...form, street_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div><label className="font-semibold text-slate-700 block mb-1">Street Number:</label><input type="text" className="w-full p-2 border border-slate-300 rounded" value={form.street_number} onChange={e => setForm({...form, street_number: e.target.value})} /></div>
                <div><label className="font-semibold text-slate-700 block mb-1">House Number:</label><input type="text" className="w-full p-2 border border-slate-300 rounded" value={form.house_number} onChange={e => setForm({...form, house_number: e.target.value})} /></div>
                <div><label className="font-semibold text-slate-700 block mb-1">P.O.BOX:</label><input type="text" className="w-full p-2 border border-slate-300 rounded" value={form.po_box} onChange={e => setForm({...form, po_box: e.target.value})} /></div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded font-bold">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold flex items-center gap-1.5 shadow-sm">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// 4. MORTGAGE RELEASE MODAL: Matching Screenshot 5 (Release)
// ═════════════════════════════════════════════════════════════════════════════
function MortgageReleaseModal({ mortgage, onClose, onSaved }) {
  let meta = {};
  if (mortgage.description) {
    try { if (mortgage.description.startsWith('{')) meta = JSON.parse(mortgage.description); } catch(e){}
  }

  const [letterNumber, setLetterNumber] = useState('');
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleRelease = async (e) => {
    e.preventDefault();
    if (!letterNumber) {
      toast.error('Release letter number is required');
      return;
    }
    if (!window.confirm('Are you sure you want to release and cancel this mortgage?')) return;

    setSaving(true);
    try {
      await API.post(`/mortgages/${mortgage.id}/cancel`, {
        cancellation_reference: `Letter: ${letterNumber} (Date: ${releaseDate})`
      });
      toast.success('✅ Mortgage released and cancelled successfully');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel mortgage');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between rounded-t-xl">
          <div className="border border-blue-400 bg-blue-50/80 px-3 py-1 rounded">
            <h3 className="font-bold text-xs text-blue-950">Mortgage Cancellation / Release</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleRelease} className="p-6 text-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <h4 className="text-[11px] font-bold text-slate-800">Mortgage Information</h4>
                <div>
                  <span className="font-semibold text-slate-600 block">Right Holder:</span>
                  <span className="font-bold text-slate-800">{meta.right_holder || 'Ayale Kebede (Lease)'}</span>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Letter Number:<span className="text-rose-500">*</span></label>
                  <input type="text" placeholder="Cancellation letter number..." value={letterNumber} onChange={e => setLetterNumber(e.target.value)} className="w-full p-2 border border-slate-300 rounded font-mono" required />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Release Date:<span className="text-rose-500">*</span></label>
                  <input type="date" value={releaseDate} onChange={e => setReleaseDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded" required />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <h4 className="text-[11px] font-bold text-slate-800">Basic Information</h4>
                <div><span className="text-slate-500 block">Institution Name:</span><span className="font-bold text-slate-800">{mortgage.mortgagee_name}</span></div>
                <div><span className="text-slate-500 block">Legal Party Type:</span><span className="font-medium text-slate-700">{mortgage.mortgagee_type || 'Bank'}</span></div>
                <div><span className="text-slate-500 block">Tin Number:</span><span className="font-mono text-slate-700">{meta.tin_number || '—'}</span></div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <h4 className="text-[11px] font-bold text-slate-800">Address Information</h4>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div><span className="text-slate-500 block">Region:</span> {meta.region || 'Dire Dawa'}</div>
                <div><span className="text-slate-500 block">Zone:</span> {meta.zone || 'DireDawa'}</div>
                <div><span className="text-slate-500 block">City:</span> {meta.city || 'DireDawa'}</div>
                <div><span className="text-slate-500 block">Sub-City:</span> {meta.sub_city || '—'}</div>
                <div><span className="text-slate-500 block">Woreda:</span> {meta.woreda || '—'}</div>
                <div><span className="text-slate-500 block">Kebele:</span> {meta.kebele || '—'}</div>
                <div><span className="text-slate-500 block">Street:</span> {meta.street_name || '—'}</div>
                <div><span className="text-slate-500 block">House #:</span> {meta.house_number || '—'}</div>
                <div><span className="text-slate-500 block">P.O.BOX:</span> {meta.po_box || '—'}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded font-bold">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold flex items-center gap-1">
              <Check className="w-4 h-4" /> {saving ? 'Releasing...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// 5. COURT INJUNCTION MODAL: Matching Screenshot 1 (Add Court Injunction)
// ═════════════════════════════════════════════════════════════════════════════
function CourtInjunctionModalMatching({ txn, initialInjunction, onClose, onSaved }) {
  const isEditing = Boolean(initialInjunction && initialInjunction.id);
  const defaultHolder = txn.applicant_name ? `${txn.applicant_name} Lease` : 'Ayele Kebede Lease';

  let existingMeta = {};
  if (initialInjunction?.description) {
    try { if (initialInjunction.description.startsWith('{')) existingMeta = JSON.parse(initialInjunction.description); } catch(e){}
  }

  const [form, setForm] = useState({
    // Left Box: Court Injunction Information
    right_holder: existingMeta.right_holder || defaultHolder,
    begin_life_span: initialInjunction?.injunction_date ? new Date(initialInjunction.injunction_date).toISOString().split('T')[0] : '',
    court_name: initialInjunction?.court_name || 'Ledeta Kefetegna',
    letter_number: initialInjunction?.case_number || 'Ledeta3655899998',
    tin_number: existingMeta.tin_number || '',

    // Right Box: Address (Court Address)
    region: existingMeta.region || 'Dire Dawa',
    zone: existingMeta.zone || 'DireDawa',
    city: existingMeta.city || 'DireDawa',
    sub_city: existingMeta.sub_city || '',
    woreda: existingMeta.woreda || '',
    kebele: existingMeta.kebele || '',
    street_name: existingMeta.street_name || '',
    street_number: existingMeta.street_number || '',
    house_number: existingMeta.house_number || '',
    po_box: existingMeta.po_box || ''
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.court_name || !form.letter_number) {
      toast.error('Court Name and Letter Number are required');
      return;
    }
    if (!window.confirm('Save this court injunction?')) return;

    setSaving(true);
    try {
      const meta = {
        right_holder: form.right_holder,
        tin_number: form.tin_number,
        region: form.region,
        zone: form.zone,
        city: form.city,
        sub_city: form.sub_city,
        woreda: form.woreda,
        kebele: form.kebele,
        street_name: form.street_name,
        street_number: form.street_number,
        house_number: form.house_number,
        po_box: form.po_box
      };

      const payload = {
        parcel_id: txn.parcel_id,
        transaction_id: txn.id,
        court_name: form.court_name,
        case_number: form.letter_number,
        injunction_date: form.begin_life_span || new Date().toISOString().split('T')[0],
        issued_by: form.court_name,
        description: JSON.stringify(meta)
      };

      if (isEditing) {
        await API.put(`/injunctions/${initialInjunction.id}`, payload);
        toast.success('✅ Court injunction updated successfully');
      } else {
        await API.post('/injunctions', payload);
        toast.success('✅ Court injunction registered successfully');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save court injunction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between rounded-t-xl">
          <div className="border border-blue-400 bg-blue-50/80 px-3 py-1 rounded">
            <h3 className="font-bold text-xs text-blue-950">Add Court Injunction Information</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 text-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column: Court Injunction Information */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <h4 className="text-[11px] font-bold text-slate-800">Court Injunction Information</h4>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Right Holder:</label>
                <input type="text" className="w-full p-2 border border-slate-300 rounded bg-slate-100 font-medium" value={form.right_holder} onChange={e => setForm({...form, right_holder: e.target.value})} />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Begin Life Span:*</label>
                <input type="date" className="w-full p-2 border border-slate-300 rounded" value={form.begin_life_span} onChange={e => setForm({...form, begin_life_span: e.target.value})} required />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Court Name:*</label>
                <input type="text" placeholder="e.g. Ledeta Kefetegna Court" className="w-full p-2 border border-slate-300 rounded font-bold" value={form.court_name} onChange={e => setForm({...form, court_name: e.target.value})} required />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Letter Number:*</label>
                <input type="text" placeholder="Court injunction letter / case number" className="w-full p-2 border border-slate-300 rounded font-mono" value={form.letter_number} onChange={e => setForm({...form, letter_number: e.target.value})} required />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tin Number:</label>
                <input type="text" className="w-full p-2 border border-slate-300 rounded font-mono" value={form.tin_number} onChange={e => setForm({...form, tin_number: e.target.value})} />
              </div>
            </div>

            {/* Right Column: Court Address */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
              <h4 className="text-[11px] font-bold text-slate-800">Address (Court Address)</h4>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Region:*</label>
                  <select className="w-full p-2 border border-slate-300 rounded" value={form.region} onChange={e => setForm({...form, region: e.target.value})}>
                    <option value="Dire Dawa">Dire Dawa</option><option value="Addis Ababa">Addis Ababa</option><option value="Oromia">Oromia</option><option value="Amhara">Amhara</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Zone:*</label>
                  <input type="text" className="w-full p-2 border border-slate-300 rounded" value={form.zone} onChange={e => setForm({...form, zone: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">City:*</label>
                  <input type="text" className="w-full p-2 border border-slate-300 rounded" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sub City:</label>
                  <input type="text" className="w-full p-2 border border-slate-300 rounded" value={form.sub_city} onChange={e => setForm({...form, sub_city: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Woreda:</label>
                  <input type="text" className="w-full p-2 border border-slate-300 rounded" value={form.woreda} onChange={e => setForm({...form, woreda: e.target.value})} />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kebele:</label>
                  <input type="text" className="w-full p-2 border border-slate-300 rounded" value={form.kebele} onChange={e => setForm({...form, kebele: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Street Name:</label>
                <input type="text" className="w-full p-2 border border-slate-300 rounded" value={form.street_name} onChange={e => setForm({...form, street_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div><label className="font-semibold text-slate-700 block mb-1">Street Number:</label><input type="text" className="w-full p-2 border border-slate-300 rounded" value={form.street_number} onChange={e => setForm({...form, street_number: e.target.value})} /></div>
                <div><label className="font-semibold text-slate-700 block mb-1">House Number:</label><input type="text" className="w-full p-2 border border-slate-300 rounded" value={form.house_number} onChange={e => setForm({...form, house_number: e.target.value})} /></div>
                <div><label className="font-semibold text-slate-700 block mb-1">P.O.BOX:</label><input type="text" className="w-full p-2 border border-slate-300 rounded" value={form.po_box} onChange={e => setForm({...form, po_box: e.target.value})} /></div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded font-bold">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold flex items-center gap-1.5 shadow-sm">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// 6. COURT INJUNCTION RELEASE MODAL: Matching Screenshot 2 (Cancel/Release)
// ═════════════════════════════════════════════════════════════════════════════
function CourtInjunctionReleaseModal({ injunction, onClose, onSaved }) {
  let meta = {};
  if (injunction.description) {
    try { if (injunction.description.startsWith('{')) meta = JSON.parse(injunction.description); } catch(e){}
  }

  const [releaseLetterNo, setReleaseLetterNo] = useState('');
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleRelease = async (e) => {
    e.preventDefault();
    if (!releaseLetterNo) {
      toast.error('Release Letter Number is required');
      return;
    }
    if (!window.confirm('Are you sure you want to release and cancel this court injunction?')) return;

    setSaving(true);
    try {
      await API.post(`/injunctions/${injunction.id}/cancel`, {
        cancellation_reference: `Release Letter: ${releaseLetterNo} (Date: ${releaseDate})`
      });
      toast.success('✅ Court injunction cancelled/released successfully');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel court injunction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between rounded-t-xl">
          <div className="border border-blue-400 bg-blue-50/80 px-3 py-1 rounded">
            <h3 className="font-bold text-xs text-blue-950">Court Injunction Cancellation</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleRelease} className="p-6 text-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column matching Screenshot 2 */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <h4 className="text-[11px] font-bold text-slate-800">Court Injunction Information</h4>
              <div>
                <span className="font-semibold text-slate-600 block">Right Holder:</span>
                <span className="font-bold text-slate-800">{meta.right_holder || 'Solomon G/Medhen OldPossession'}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-600 block">Court Name:*</span>
                <span className="font-bold text-slate-800">{injunction.court_name}</span>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Release Letter No:*</label>
                <input type="text" placeholder="Court cancellation / release letter #" value={releaseLetterNo} onChange={e => setReleaseLetterNo(e.target.value)} className="w-full p-2 border border-slate-300 rounded font-mono" required />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Release Date:*</label>
                <input type="date" value={releaseDate} onChange={e => setReleaseDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded" required />
              </div>
            </div>

            {/* Right Column: Court Address info matching Screenshot 2 */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <h4 className="text-[11px] font-bold text-slate-800">Address Information</h4>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div><span className="text-slate-500 block">Region:</span> {meta.region || 'Dire Dawa'}</div>
                <div><span className="text-slate-500 block">Zone:</span> {meta.zone || 'DireDawa'}</div>
                <div><span className="text-slate-500 block">City:</span> {meta.city || 'DireDawa'}</div>
                <div><span className="text-slate-500 block">Sub-City:</span> {meta.sub_city || '—'}</div>
                <div><span className="text-slate-500 block">Woreda:</span> {meta.woreda || '—'}</div>
                <div><span className="text-slate-500 block">Kebele:</span> {meta.kebele || '—'}</div>
                <div><span className="text-slate-500 block">Street:</span> {meta.street_name || '—'}</div>
                <div><span className="text-slate-500 block">House #:</span> {meta.house_number || '—'}</div>
                <div><span className="text-slate-500 block">P.O.BOX:</span> {meta.po_box || '—'}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded font-bold">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold flex items-center gap-1">
              <Check className="w-4 h-4" /> {saving ? 'Releasing...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// 7. GENERAL RESTRICTION MODAL: Matching Screenshot 3 (Add General Restriction)
// ═════════════════════════════════════════════════════════════════════════════
function GeneralRestrictionModalMatching({ txn, initialRestriction, onClose, onSaved }) {
  const isEditing = Boolean(initialRestriction && initialRestriction.id);
  const defaultHolder = txn.applicant_name ? `${txn.applicant_name} Lease` : 'Tsilahun Kebede Lease';

  const [form, setForm] = useState({
    right_holder: defaultHolder,
    restriction_type: initialRestriction?.restriction_type || 'Building Restriction',
    begin_life_span: initialRestriction?.imposed_date ? new Date(initialRestriction.imposed_date).toISOString().split('T')[0] : '',
    end_life_span: '',
    description: initialRestriction?.description || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description) {
      toast.error('Description is required');
      return;
    }
    if (!window.confirm('Save this general restriction?')) return;

    setSaving(true);
    try {
      const payload = {
        parcel_id: txn.parcel_id,
        transaction_id: txn.id,
        restriction_type: form.restriction_type,
        description: form.description,
        imposed_by: form.right_holder,
        imposed_date: form.begin_life_span || new Date().toISOString().split('T')[0]
      };

      if (isEditing) {
        await API.put(`/restrictions/${initialRestriction.id}`, payload);
        toast.success('✅ General restriction modified successfully');
      } else {
        await API.post('/restrictions', payload);
        toast.success('✅ General restriction registered successfully');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save general restriction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between rounded-t-xl">
          <div className="border border-blue-400 bg-blue-50/80 px-3 py-1 rounded">
            <h3 className="font-bold text-xs text-blue-950">Add General Restriction</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 text-xs space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-[11px] font-bold text-slate-800">Restriction Information</h4>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Right Holder:</label>
              <input type="text" className="w-full p-2 border border-slate-300 rounded bg-slate-100 font-medium" value={form.right_holder} onChange={e => setForm({...form, right_holder: e.target.value})} />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Restriction Type:*</label>
              <select className="w-full p-2 border border-slate-300 rounded bg-white font-medium" value={form.restriction_type} onChange={e => setForm({...form, restriction_type: e.target.value})}>
                {RESTRICTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Begin Life Span:*</label>
                <input type="date" className="w-full p-2 border border-slate-300 rounded" value={form.begin_life_span} onChange={e => setForm({...form, begin_life_span: e.target.value})} required />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">End Life Span:*</label>
                <input type="date" className="w-full p-2 border border-slate-300 rounded" value={form.end_life_span} onChange={e => setForm({...form, end_life_span: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Description:*</label>
              <textarea rows={3} placeholder="Enter detailed restriction notes..." className="w-full p-2 border border-rose-300 rounded focus:border-blue-500" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button type="button" onClick={() => setForm({...form, description: '', begin_life_span: '', end_life_span: ''})} className="px-4 py-2 bg-slate-100 rounded font-bold">Reset</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold flex items-center gap-1">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// 8. GENERAL RESTRICTION RELEASE MODAL
// ═════════════════════════════════════════════════════════════════════════════
function GeneralRestrictionReleaseModal({ restriction, onClose, onSaved }) {
  const [releaseRef, setReleaseRef] = useState('');
  const [saving, setSaving] = useState(false);

  const handleRelease = async (e) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to cancel and release this general restriction?')) return;
    setSaving(true);
    try {
      await API.post(`/restrictions/${restriction.id}/cancel`, {
        cancellation_reference: releaseRef || 'Administrative Cancellation Decision'
      });
      toast.success('✅ General restriction released successfully');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel restriction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between rounded-t-xl">
          <h3 className="font-bold text-xs text-slate-800">Cancel General Restriction</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <form onSubmit={handleRelease} className="p-5 text-xs space-y-3">
          <p className="text-slate-600">
            Confirm cancellation of <strong>{restriction.restriction_type}</strong>:
          </p>
          <div className="p-2.5 bg-slate-50 border rounded text-slate-700 italic">
            "{restriction.description}"
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Cancellation Reference / Letter #:</label>
            <input type="text" placeholder="e.g. Letter Ref # / Directive #" className="w-full p-2 border border-slate-300 rounded font-mono" value={releaseRef} onChange={e => setReleaseRef(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded font-bold">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold">
              {saving ? 'Releasing...' : 'Confirm Release'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}