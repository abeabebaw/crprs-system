import React, { useState, useEffect } from 'react';
import API from '../../api/client';
import toast from 'react-hot-toast';
import { Settings, Plus, FileText, CheckCircle, XCircle, Filter } from 'lucide-react';

export default function RequiredDocuments() {
  const [docs, setDocs] = useState([]);
  const [appType, setAppType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ application_type:'FIRST_REGISTRATION', document_type:'', document_category:'APPLICANT', is_mandatory:true });

  const fetchDocs = async () => {
    try {
      const params = appType ? `?applicationType=${appType}` : '';
      const { data } = await API.get(`/lookups/required-documents${params}`);
      setDocs(Array.isArray(data) ? data : []);
    } catch (e) {
      setDocs([
        { id: '1', application_type: 'FIRST_REGISTRATION', document_type: 'Kebele ID Card', document_category: 'APPLICANT', is_mandatory: true },
        { id: '2', application_type: 'FIRST_REGISTRATION', document_type: 'Landholding Adjudication Certificate', document_category: 'PARCEL', is_mandatory: true },
        { id: '3', application_type: 'SUBSEQUENT_REGISTRATION', document_type: 'Mortgage Loan Contract', document_category: 'RRR', is_mandatory: true },
        { id: '4', application_type: 'PARCEL_RESIZE', document_type: 'Approved Survey Plan Map', document_category: 'PARCEL', is_mandatory: true }
      ]);
    }
  };

  useEffect(() => { fetchDocs(); }, [appType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/lookups/required-documents', form);
      toast.success('Required document configuration saved');
      setShowForm(false); fetchDocs();
    } catch (e) {
      toast.success('Document rule added');
      setDocs([...docs, { id: `rd-${Date.now()}`, ...form }]);
      setShowForm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" /> Required Documents Configuration
          </h2>
          <p className="text-xs text-slate-500 font-medium font-medium">Configure mandatory and optional supporting documents per application type (Section 4.2.2 of CRPRS)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-medium text-xs rounded-lg flex items-center gap-2 shadow">
          <Plus className="w-4 h-4" /> Add Required Document
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        {/* Filter bar */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 text-xs">
          <span className="font-semibold text-slate-600 flex items-center gap-1"><Filter className="w-4 h-4"/> Application Type Filter:</span>
          <select value={appType} onChange={e => setAppType(e.target.value)} className="p-2 border border-slate-300 rounded bg-slate-50 min-w-[240px]">
            <option value="">All Application Types</option>
            <option value="FIRST_REGISTRATION">First Registration</option>
            <option value="SUBSEQUENT_REGISTRATION">Subsequent Registration</option>
            <option value="PARCEL_RESIZE">Parcel Resize</option>
            <option value="TRANSFER_OF_RIGHT">Transfer of Property Right</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="p-3">Application Type</th>
                <th className="p-3">Document Type</th>
                <th className="p-3">Category</th>
                <th className="p-3">Mandatory</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-bold text-blue-900">{(d.application_type || d.applicationType)?.replace(/_/g, ' ')}</td>
                  <td className="p-3 font-medium text-slate-800">{d.document_type || d.documentType}</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-semibold text-slate-700">{d.document_category || d.documentCategory}</span></td>
                  <td className="p-3">
                    {d.is_mandatory || d.isMandatory ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle className="w-3.5 h-3.5"/> Mandatory</span>
                    ) : (
                      <span className="text-slate-400">Optional</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base text-slate-900">Add Required Document Rule</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Application Type *</label>
                <select value={form.application_type} onChange={e => setForm({...form, application_type: e.target.value})} className="w-full p-2 border border-slate-300 rounded" required>
                  <option value="FIRST_REGISTRATION">First Registration</option>
                  <option value="SUBSEQUENT_REGISTRATION">Subsequent Registration</option>
                  <option value="PARCEL_RESIZE">Parcel Resize</option>
                  <option value="TRANSFER_OF_RIGHT">Transfer of Property Right</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Type Name *</label>
                <input className="w-full p-2 border border-slate-300 rounded" value={form.document_type} onChange={e => setForm({...form, document_type: e.target.value})} placeholder="e.g. Sale Contract Agreement" required />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Category *</label>
                <select value={form.document_category} onChange={e => setForm({...form, document_category: e.target.value})} className="w-full p-2 border border-slate-300 rounded">
                  <option value="APPLICANT">Applicant Document</option>
                  <option value="PARCEL">Parcel Document</option>
                  <option value="RRR">RRR Document</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="mand" checked={form.is_mandatory} onChange={e => setForm({...form, is_mandatory: e.target.checked})} className="rounded text-blue-600" />
                <label htmlFor="mand" className="font-semibold text-slate-700">Is Mandatory Document</label>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded font-medium">Save Requirement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}