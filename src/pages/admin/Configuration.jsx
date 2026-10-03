import React, { useState, useEffect } from 'react';
import API from '../../api/client';
import toast from 'react-hot-toast';
import { Settings, Plus, Trash2, Edit2 } from 'lucide-react';

export default function Configuration() {
  const [activeTab, setActiveTab] = useState('GEOMETRIC_REFERENCE');
  const [configs, setConfigs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

  const tabs = [
    { id: 'GEOMETRIC_REFERENCE', label: 'Geometric Reference' },
    { id: 'IP_ADDRESS', label: 'IP Address Configuration' },
    { id: 'GEOSERVER', label: 'GeoServer Configuration' },
    { id: 'LAYER_TYPE', label: 'Layer Type Configuration' }
  ];

  const fetchConfigs = async () => {
    try {
      const { data } = await API.get(`/configurations?type=${activeTab}`);
      setConfigs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching configurations:', err);
    }
  };

  useEffect(() => {
    fetchConfigs();
    setShowForm(false);
    setEditingId(null);
    setFormData({});
  }, [activeTab]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        configType: activeTab,
        data: formData
      };

      if (editingId) {
        await API.put(`/configurations/${editingId}`, payload);
        toast.success('Configuration updated');
      } else {
        await API.post('/configurations', payload);
        toast.success('Configuration created');
      }
      
      setShowForm(false);
      setEditingId(null);
      fetchConfigs();
    } catch (err) {
      toast.error('Failed to save configuration');
    }
  };

  const handleEdit = (config) => {
    setFormData(config.data || {});
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this configuration?')) return;
    try {
      await API.delete(`/configurations/${id}`);
      toast.success('Deleted successfully');
      fetchConfigs();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const renderFormFields = () => {
    if (activeTab === 'GEOMETRIC_REFERENCE') {
      return (
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">CRS Name</label>
          <input required type="text" value={formData.crsName || ''} onChange={e => setFormData({...formData, crsName: e.target.value})} className="w-full p-2 text-sm border rounded" placeholder="e.g. EPSG:20138" />
        </div>
      );
    }
    if (activeTab === 'IP_ADDRESS') {
      return (
        <>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Web Service IP</label><input type="text" value={formData.webService || ''} onChange={e => setFormData({...formData, webService: e.target.value})} className="w-full p-2 text-sm border rounded" /></div>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Geo Server IP</label><input type="text" value={formData.geoServer || ''} onChange={e => setFormData({...formData, geoServer: e.target.value})} className="w-full p-2 text-sm border rounded" /></div>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Alfresco IP</label><input type="text" value={formData.alfresco || ''} onChange={e => setFormData({...formData, alfresco: e.target.value})} className="w-full p-2 text-sm border rounded" /></div>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Active Directory</label><input type="text" value={formData.activeDirectory || ''} onChange={e => setFormData({...formData, activeDirectory: e.target.value})} className="w-full p-2 text-sm border rounded" /></div>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Database</label><input type="text" value={formData.database || ''} onChange={e => setFormData({...formData, database: e.target.value})} className="w-full p-2 text-sm border rounded" /></div>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">License Key</label><input type="text" value={formData.licenseKey || ''} onChange={e => setFormData({...formData, licenseKey: e.target.value})} className="w-full p-2 text-sm border rounded" /></div>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">City Code</label><input type="text" value={formData.cityCode || ''} onChange={e => setFormData({...formData, cityCode: e.target.value})} className="w-full p-2 text-sm border rounded" /></div>
        </>
      );
    }
    if (activeTab === 'GEOSERVER') {
      return (
        <>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Host Server</label><input required type="text" value={formData.hostServer || ''} onChange={e => setFormData({...formData, hostServer: e.target.value})} className="w-full p-2 text-sm border rounded" /></div>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Port Number</label><input type="text" value={formData.portNumber || ''} onChange={e => setFormData({...formData, portNumber: e.target.value})} className="w-full p-2 text-sm border rounded" /></div>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">City Code</label><input type="text" value={formData.cityCode || ''} onChange={e => setFormData({...formData, cityCode: e.target.value})} className="w-full p-2 text-sm border rounded" /></div>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">CRS Name</label><input type="text" value={formData.crsName || ''} onChange={e => setFormData({...formData, crsName: e.target.value})} className="w-full p-2 text-sm border rounded" /></div>
        </>
      );
    }
    if (activeTab === 'LAYER_TYPE') {
      return (
        <>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Layer Name</label><input required type="text" value={formData.layerName || ''} onChange={e => setFormData({...formData, layerName: e.target.value})} className="w-full p-2 text-sm border rounded" /></div>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Sort Order</label><input type="number" value={formData.sortOrder || ''} onChange={e => setFormData({...formData, sortOrder: e.target.value})} className="w-full p-2 text-sm border rounded" /></div>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Layer Type</label><input type="text" value={formData.layerType || ''} onChange={e => setFormData({...formData, layerType: e.target.value})} className="w-full p-2 text-sm border rounded" /></div>
        </>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" /> System Configuration
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Manage Geoserver, IP and Mapping configs (Section 4.2.4)</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFormData({}); setEditingId(null); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Add New'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-3 text-sm font-semibold border-b-2 transition ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderFormFields()}
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded font-semibold text-sm">
              {editingId ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              {activeTab === 'GEOMETRIC_REFERENCE' && <th className="p-4 font-semibold">CRS Name</th>}
              {activeTab === 'IP_ADDRESS' && (
                <>
                  <th className="p-4 font-semibold">Web Service</th>
                  <th className="p-4 font-semibold">Geo Server</th>
                  <th className="p-4 font-semibold">Alfresco</th>
                  <th className="p-4 font-semibold">City Code</th>
                </>
              )}
              {activeTab === 'GEOSERVER' && (
                <>
                  <th className="p-4 font-semibold">Host Server</th>
                  <th className="p-4 font-semibold">Port Number</th>
                  <th className="p-4 font-semibold">City Code</th>
                  <th className="p-4 font-semibold">CRS Name</th>
                </>
              )}
              {activeTab === 'LAYER_TYPE' && (
                <>
                  <th className="p-4 font-semibold">Layer Name</th>
                  <th className="p-4 font-semibold">Sort Order</th>
                  <th className="p-4 font-semibold">Layer Type</th>
                </>
              )}
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {configs.map(config => (
              <tr key={config.id} className="hover:bg-slate-50">
                {activeTab === 'GEOMETRIC_REFERENCE' && <td className="p-4">{config.data.crsName}</td>}
                {activeTab === 'IP_ADDRESS' && (
                  <>
                    <td className="p-4">{config.data.webService}</td>
                    <td className="p-4">{config.data.geoServer}</td>
                    <td className="p-4">{config.data.alfresco}</td>
                    <td className="p-4">{config.data.cityCode}</td>
                  </>
                )}
                {activeTab === 'GEOSERVER' && (
                  <>
                    <td className="p-4">{config.data.hostServer}</td>
                    <td className="p-4">{config.data.portNumber}</td>
                    <td className="p-4">{config.data.cityCode}</td>
                    <td className="p-4">{config.data.crsName}</td>
                  </>
                )}
                {activeTab === 'LAYER_TYPE' && (
                  <>
                    <td className="p-4">{config.data.layerName}</td>
                    <td className="p-4">{config.data.sortOrder}</td>
                    <td className="p-4">{config.data.layerType}</td>
                  </>
                )}
                
                <td className="p-4 flex justify-end gap-2">
                  <button onClick={() => handleEdit(config)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(config.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {configs.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">No configurations found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
