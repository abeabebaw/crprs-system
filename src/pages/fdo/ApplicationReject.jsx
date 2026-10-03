import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../../api/client';
import toast from 'react-hot-toast';
import { ArrowLeft, Printer, Save } from 'lucide-react';

export default function ApplicationReject() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchApp = async () => {
      try {
        const { data } = await API.get(`/applications/${id}`);
        setApp(data);
        setReason(data.withdrawn_reason || data.withdrawnReason || '');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load application');
      }
    };

    fetchApp();
  }, [id]);

  const handleSave = async () => {
    if (!reason.trim()) {
      toast.error('Please enter rejection reason');
      return;
    }

    setSaving(true);
    try {
      await API.post(`/applications/${id}/reject`, { reason: reason.trim() });
      setSaved(true);
      toast.success('Application rejected successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject application');
    } finally {
      setSaving(false);
    }
  };

  if (!app) {
    return <div className="text-sm text-slate-500">Loading application...</div>;
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-lg font-bold text-slate-900">Application Rejection Reason</h2>
        <p className="text-xs text-slate-600 mt-1">
          Enter the withdrawal reason, save it, then print the rejection receipt.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="text-xs text-slate-700 space-y-1">
          <p><strong>Application No:</strong> {app.application_number || app.applicationNumber}</p>
          <p><strong>Applicant Name:</strong> {app.applicant_name || app.applicantName}</p>
          <p><strong>Application Type:</strong> {(app.application_type || app.applicationType || '').replace(/_/g, ' ')}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Withdraw Reason *</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={6}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-rose-600"
            placeholder="Write why the application is rejected..."
            disabled={saved}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate('/applications')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {!saved && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
            </button>
          )}

          {saved && (
            <button
              onClick={() => navigate(`/applications/${id}/receipt/rejection`)}
              className="px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print Rejection Receipt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
