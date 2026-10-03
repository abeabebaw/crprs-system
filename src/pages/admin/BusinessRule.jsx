import React, { useState, useEffect } from 'react';
import API from '../../api/client';
import toast from 'react-hot-toast';
import { Settings, Plus, Trash2, Edit2 } from 'lucide-react';

export default function BusinessRule() {
  const [rules, setRules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    ruleName: '',
    landUse: '',
    minParcelSizeSqm: '',
    maxParcelSizeSqm: '',
    minLeasePeriodYears: '',
    maxLeasePeriodYears: ''
  });
  const [editingId, setEditingId] = useState(null);

  const fetchRules = async () => {
    try {
      const { data } = await API.get('/business-rules');
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching business rules:', err);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        minParcelSizeSqm: form.minParcelSizeSqm ? parseFloat(form.minParcelSizeSqm) : null,
        maxParcelSizeSqm: form.maxParcelSizeSqm ? parseFloat(form.maxParcelSizeSqm) : null,
        minLeasePeriodYears: form.minLeasePeriodYears ? parseInt(form.minLeasePeriodYears, 10) : null,
        maxLeasePeriodYears: form.maxLeasePeriodYears ? parseInt(form.maxLeasePeriodYears, 10) : null,
      };

      if (editingId) {
        await API.put(`/business-rules/${editingId}`, payload);
        toast.success('Business rule updated');
      } else {
        await API.post('/business-rules', payload);
        toast.success('Business rule created');
      }
      
      setForm({
        ruleName: '',
        landUse: '',
        minParcelSizeSqm: '',
        maxParcelSizeSqm: '',
        minLeasePeriodYears: '',
        maxLeasePeriodYears: ''
      });
      setShowForm(false);
      setEditingId(null);
      fetchRules();
    } catch (e) {
      toast.error('Failed to save business rule');
    }
  };

  const handleEdit = (rule) => {
    setForm({
      ruleName: rule.ruleName || '',
      landUse: rule.landUse || '',
      minParcelSizeSqm: rule.minParcelSizeSqm || '',
      maxParcelSizeSqm: rule.maxParcelSizeSqm || '',
      minLeasePeriodYears: rule.minLeasePeriodYears || '',
      maxLeasePeriodYears: rule.maxLeasePeriodYears || ''
    });
    setEditingId(rule.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await API.delete(`/business-rules/${id}`);
      toast.success('Rule deleted');
      fetchRules();
    } catch (e) {
      toast.error('Failed to delete rule');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" /> System Administration: Business Rules
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Configure specific values for parcel size and lease period based on land use type (Section 4.2.3)</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setForm({
              ruleName: '', landUse: '', minParcelSizeSqm: '', maxParcelSizeSqm: '', minLeasePeriodYears: '', maxLeasePeriodYears: ''
            });
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Add Rule'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Name</label>
            <input required type="text" value={form.ruleName} onChange={e => setForm({...form, ruleName: e.target.value})} className="w-full p-2 text-sm border rounded" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Land Use Type</label>
            <input type="text" value={form.landUse} onChange={e => setForm({...form, landUse: e.target.value})} className="w-full p-2 text-sm border rounded" placeholder="e.g., Residence, commercial" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Min Parcel Size (Sqm)</label>
            <input type="number" step="0.01" value={form.minParcelSizeSqm} onChange={e => setForm({...form, minParcelSizeSqm: e.target.value})} className="w-full p-2 text-sm border rounded" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Max Parcel Size (Sqm)</label>
            <input type="number" step="0.01" value={form.maxParcelSizeSqm} onChange={e => setForm({...form, maxParcelSizeSqm: e.target.value})} className="w-full p-2 text-sm border rounded" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Min Lease Period (Years)</label>
            <input type="number" value={form.minLeasePeriodYears} onChange={e => setForm({...form, minLeasePeriodYears: e.target.value})} className="w-full p-2 text-sm border rounded" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Max Lease Period (Years)</label>
            <input type="number" value={form.maxLeasePeriodYears} onChange={e => setForm({...form, maxLeasePeriodYears: e.target.value})} className="w-full p-2 text-sm border rounded" />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded font-semibold text-sm">
              {editingId ? 'Update Rule' : 'Save Rule'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold">Rule Name</th>
              <th className="p-4 font-semibold">Land Use</th>
              <th className="p-4 font-semibold">Size (Sqm)</th>
              <th className="p-4 font-semibold">Lease Period (Yrs)</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rules.map(rule => (
              <tr key={rule.id} className="hover:bg-slate-50">
                <td className="p-4">{rule.ruleName}</td>
                <td className="p-4">{rule.landUse || '-'}</td>
                <td className="p-4">
                  {(rule.minParcelSizeSqm || rule.maxParcelSizeSqm) 
                    ? `${rule.minParcelSizeSqm || 0} - ${rule.maxParcelSizeSqm || '∞'}` 
                    : '-'}
                </td>
                <td className="p-4">
                  {(rule.minLeasePeriodYears || rule.maxLeasePeriodYears) 
                    ? `${rule.minLeasePeriodYears || 0} - ${rule.maxLeasePeriodYears || '∞'}` 
                    : '-'}
                </td>
                <td className="p-4 flex justify-end gap-2">
                  <button onClick={() => handleEdit(rule)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(rule.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-500">No business rules found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
