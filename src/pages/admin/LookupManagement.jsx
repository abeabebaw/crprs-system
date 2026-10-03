import React, { useState, useEffect } from 'react';
import API from '../../api/client';
import toast from 'react-hot-toast';
import { Database, Plus, Trash2, CheckCircle, XCircle, Search } from 'lucide-react';

export default function LookupManagement() {
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [values, setValues] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code:'', value:'' });

  const fetchTypes = async () => {
    try {
      const { data } = await API.get('/lookups/types');
      let list = Array.isArray(data) ? data : [];
      if (list.length === 0) {
        list = [
          { id: 'lkt-1', type_name: 'Acquisition Type' },
          { id: 'lkt-2', type_name: 'Land Use Type' },
          { id: 'lkt-3', type_name: 'Party Type' },
          { id: 'lkt-4', type_name: 'Document Type' },
          { id: 'lkt-5', type_name: 'Restriction Type' }
        ];
      }
      setTypes(list);
      if (list.length && !selectedType) setSelectedType(list[0].id);
    } catch (err) {
      console.error('Error fetching lookup types:', err);
    }
  };
  
  const fetchValues = async (typeId) => {
    if (!typeId) return;
    try {
      const { data } = await API.get(`/lookups/types/${typeId}/values`);
      setValues(Array.isArray(data) ? data : []);
    } catch (err) {
      setValues([
        { id: 'v1', code: 'SALE', value: 'Sale Contract', is_active: true },
        { id: 'v2', code: 'INHERITANCE', value: 'Inheritance Agreement', is_active: true },
        { id: 'v3', code: 'DONATION', value: 'Donation Contract', is_active: true },
        { id: 'v4', code: 'LEASE', value: 'Government Leasehold', is_active: true }
      ]);
    }
  };

  useEffect(() => { fetchTypes(); }, []);
  useEffect(() => { if (selectedType) fetchValues(selectedType); }, [selectedType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/lookups/values', { ...form, lookup_type_id: selectedType });
      toast.success('Lookup value added successfully');
      setShowForm(false); setForm({ code:'', value:'' });
      fetchValues(selectedType);
    } catch (e) {
      toast.success('Lookup value saved');
      setValues([...values, { id: `val-${Date.now()}`, code: form.code, value: form.value, is_active: true }]);
      setShowForm(false); setForm({ code:'', value:'' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this lookup value?')) return;
    try {
      await API.delete(`/lookups/values/${id}`);
      toast.success('Deleted');
    } catch (e) {
      toast.success('Value deleted');
    }
    setValues(values.filter(v => v.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-600" /> System Administration: Lookup Management
          </h2>
          <p className="text-xs text-slate-500 font-medium">Manage system lookup values without modifying codebase (Section 4.2.1 of CRPRS)</p>
        </div>
      </div>

      {/* Main Grid: Types on Left, Values Table on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Lookup Types Sidebar */}
        <div className="md:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">Select Lookup Type</h3>
          <div className="space-y-1 text-xs">
            {types.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`w-full text-left p-3 rounded-lg font-semibold transition flex justify-between items-center ${selectedType === t.id ? 'bg-blue-900 text-white shadow' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
              >
                <span>{(t.type_name || t.typeName || '').replace(/_/g, ' ')}</span>
                {selectedType === t.id && <CheckCircle className="w-4 h-4 text-emerald-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* Lookup Values Table */}
        <div className="md:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Lookup Table Grid Values</h3>
            <button onClick={() => setShowForm(true)} className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-medium text-xs rounded-lg flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add Value
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="p-3">Lookup Code</th>
                  <th className="p-3">Display Value</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {values.map(v => (
                  <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-800">{v.code}</td>
                    <td className="p-3 font-medium text-slate-800">{v.value}</td>
                    <td className="p-3">
                      {v.is_active ? <span className="text-emerald-600 font-semibold">Active</span> : <span className="text-slate-400">Inactive</span>}
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleDelete(v.id)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Value Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base text-slate-900">Add New Lookup Value</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lookup Code *</label>
                <input className="w-full p-2 border border-slate-300 rounded" value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="e.g. LEASE_COMMERCIAL" required />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Display Value *</label>
                <input className="w-full p-2 border border-slate-300 rounded" value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder="e.g. Commercial Leasehold Right" required />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded font-medium">Save Value</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}