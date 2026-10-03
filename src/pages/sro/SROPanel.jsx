import { useState, useEffect } from 'react';
import API from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Ban, Printer } from 'lucide-react';

export default function SROPanel() {
  const [txns, setTxns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAction, setShowAction] = useState(null); // 'approve', 'reject', 'cancel'
  const [reason, setReason] = useState('');
  const [certNumber, setCertNumber] = useState('');

  const fetchTxns = async () => {
    const { data } = await API.get('/transactions', { params: { status: 'READY_FOR_APPROVAL' } });
    setTxns(data);
  };
  useEffect(() => { fetchTxns(); }, []);

  const handleLoad = async (id) => {
    const { data } = await API.get(`/transactions/${id}`);
    setSelected(data);
  };

  const handleAction = async () => {
    try {
      if (showAction === 'approve') await API.post(`/transactions/${selected.id}/approve`);
      if (showAction === 'reject') await API.post(`/transactions/${selected.id}/reject`, { reason });
      if (showAction === 'cancel') await API.post(`/transactions/${selected.id}/cancel`, { reason });
      toast.success(`Transaction ${showAction}d`);
      setShowAction(null); setReason(''); setSelected(null); fetchTxns();
    } catch (e) { toast.error(e.response?.data?.message); }
  };

  const handlePrintTitle = () => {
    window.print();
    toast.success('Title certificate sent to printer');
  };

  const handleDeliver = async () => {
    try {
      await API.post(`/transactions/${selected.id}/deliver`, { certificateNumber: certNumber });
      toast.success('Transaction delivered');
      setSelected(null); setCertNumber(''); fetchTxns();
    } catch (e) { toast.error(e.response?.data?.message); }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Senior Registration Officer Panel</h2>
      
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Transactions Awaiting Approval</h3>
        <table>
          <thead><tr><th>Txn #</th><th>App #</th><th>Parcel</th><th>Type</th><th>Ready Since</th><th>Actions</th></tr></thead>
          <tbody>
            {txns.map(t => (
              <tr key={t.id}>
                <td>{t.transaction_number}</td>
                <td>{t.application_number}</td>
                <td>{t.parcel_code}</td>
                <td>{t.transaction_type?.replace(/_/g,' ')}</td>
                <td>{new Date(t.ready_for_approval_at).toLocaleString()}</td>
                <td><button className="btn btn-primary btn-sm" onClick={() => handleLoad(t.id)}>Review</button></td>
              </tr>
            ))}
            {txns.length === 0 && <tr><td colSpan="6" style={{textAlign:'center',padding:'1rem'}}>No transactions awaiting approval</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="card">
          <h3>Reviewing: {selected.transaction_number}</h3>
          <p><strong>Applicant:</strong> {selected.applicant_name}</p>
          <p><strong>Parcel:</strong> {selected.parcel_code} | <strong>Area:</strong> {selected.area_sqm} sqm | <strong>Land Use:</strong> {selected.land_use}</p>
          
          <div className="grid grid-2" style={{ marginTop: '1rem' }}>
            <div><h4>Parties ({selected.parties?.length || 0})</h4>
              {selected.parties?.map(p => <div key={p.id} style={{padding:'.5rem',border:'1px solid #e0e0e0',borderRadius:5,marginBottom:'.3rem'}}>{p.organization_name || `${p.first_name} ${p.father_name}`}</div>)}
            </div>
            <div><h4>Rights ({selected.rights?.length || 0})</h4>
              {selected.rights?.map(r => <div key={r.id} style={{padding:'.5rem',border:'1px solid #e0e0e0',borderRadius:5,marginBottom:'.3rem'}}>{r.right_type} - {r.acquisition_type}</div>)}
            </div>
            <div><h4>Mortgages ({selected.mortgages?.length || 0})</h4>
              {selected.mortgages?.map(m => <div key={m.id} style={{padding:'.5rem',border:'1px solid #e0e0e0',borderRadius:5,marginBottom:'.3rem'}}>{m.mortgagee_name}: {m.mortgage_amount}</div>)}
            </div>
            <div><h4>Injunctions ({selected.injunctions?.length || 0})</h4>
              {selected.injunctions?.map(i => <div key={i.id} style={{padding:'.5rem',border:'1px solid #e0e0e0',borderRadius:5,marginBottom:'.3rem'}}>{i.court_name}: {i.case_number}</div>)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '.5rem', marginTop: '1.5rem' }}>
            <button className="btn btn-success" onClick={() => setShowAction('approve')}><CheckCircle size={16} /> Approve</button>
            <button className="btn btn-warning" onClick={() => setShowAction('reject')}><XCircle size={16} /> Reject</button>
            <button className="btn btn-danger" onClick={() => setShowAction('cancel')}><Ban size={16} /> Cancel</button>
            <button className="btn btn-primary" onClick={handlePrintTitle}><Printer size={16} /> Print Title</button>
            {selected.status === 'APPROVED' && (
              <div style={{ display: 'flex', gap: '.5rem', marginLeft: 'auto' }}>
                <input className="form-control" placeholder="Certificate #" value={certNumber} onChange={e => setCertNumber(e.target.value)} style={{ width: 200 }} />
                <button className="btn btn-success" onClick={handleDeliver} disabled={!certNumber}>Deliver</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showAction && (
        <div className="modal-overlay" onClick={() => setShowAction(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{showAction.charAt(0).toUpperCase()+showAction.slice(1)} Transaction</h3><button onClick={() => setShowAction(null)}>×</button></div>
            {showAction !== 'approve' && (
              <div className="form-group"><label>Reason *</label><textarea className="form-control" rows="4" value={reason} onChange={e => setReason(e.target.value)} /></div>
            )}
            <button className={`btn ${showAction === 'approve' ? 'btn-success' : showAction === 'reject' ? 'btn-warning' : 'btn-danger'}`} onClick={handleAction}>
              Confirm {showAction}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}