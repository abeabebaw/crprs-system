import { useState } from 'react';
import API from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import { Search, MapPin, Calendar, FileText, CheckCircle2 } from 'lucide-react';

export default function ApplicationStatus() {
  const [city, setCity] = useState('');
  const [appId, setAppId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async (e) => {
    if (e) e.preventDefault();
    if (!appId.trim()) {
      setError('Please provide an Application ID to search');
      return;
    }
    setError(''); 
    setResult(null);
    setLoading(true);
    try {
      const { data } = await API.get('/public/application-status', { params: { city, applicationId: appId } });
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Application not found. Please verify the application number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <nav className="bg-blue-950 text-white px-6 py-4 shadow-md flex justify-between items-center">
        <a href="/portal" className="text-lg font-bold text-amber-400 flex items-center gap-2">
          CRPRS National Real Property Portal
        </a>
        <a href="/login" className="text-xs bg-blue-800 hover:bg-blue-700 px-3 py-1.5 rounded text-white font-medium transition">
          Officer Login
        </a>
      </nav>
      
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" /> Track Application Status
            </h2>
            <p className="text-xs text-slate-500">
              Enter your official Application Number provided on your submission receipt.
            </p>
          </div>

          <form onSubmit={search} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">City / Jurisdiction (Optional):</label>
                <input 
                  type="text"
                  className="w-full p-2.5 border border-slate-300 rounded text-slate-800 focus:outline-blue-500 bg-white" 
                  value={city} 
                  onChange={e => setCity(e.target.value)} 
                  placeholder="e.g., Addis Ababa" 
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Application Number *:</label>
                <input 
                  type="text"
                  className="w-full p-2.5 border border-slate-300 rounded font-mono font-medium text-slate-900 focus:outline-blue-500 bg-white" 
                  value={appId} 
                  onChange={e => setAppId(e.target.value)} 
                  placeholder="e.g., APP-2026-000103" 
                  required 
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded text-xs flex items-center gap-2 shadow transition disabled:opacity-50"
            >
              <Search className="w-4 h-4" /> {loading ? 'Searching...' : 'Check Status'}
            </button>
          </form>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
            {error}
          </div>
        )}
        
        {result && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Application Record Found
              </h3>
              <StatusBadge status={result.status} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-slate-500">Application Number:</span>
                <div className="font-mono font-bold text-sm text-blue-950">{result.application_number}</div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500">Service Type:</span>
                <div className="font-semibold text-slate-800">{result.application_type?.replace(/_/g,' ')}</div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500">Applicant:</span>
                <div className="font-semibold text-slate-800">{result.applicant_name}</div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500">Date Submitted:</span>
                <div className="text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(result.submitted_at).toLocaleString()}
                </div>
              </div>
            </div>

            {result.parcel_code && (
              <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 p-3.5 rounded-lg space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" /> Registered Cadastral Parcel
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">UPI / Code:</span>
                    <div className="font-mono font-bold text-blue-900">{result.parcel_code}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Location:</span>
                    <div className="font-medium text-slate-800">{result.city || 'N/A'}, {result.sub_city || ''}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Land Use:</span>
                    <div className="font-medium text-slate-800">{result.land_use || 'Residential'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Area (sqm):</span>
                    <div className="font-mono font-bold text-slate-800">{result.area_sqm ? `${result.area_sqm} m²` : 'N/A'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}