import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../../api/client';
import toast from 'react-hot-toast';
import { 
  Save, RotateCcw, Search, X, CheckCircle, ChevronRight, ChevronLeft, 
  FileText, User, MapPin, Plus, Trash2, ShieldAlert
} from 'lucide-react';

const APP_TYPES = [
  'FIRST_REGISTRATION', 'SUBSEQUENT_REGISTRATION', 'PARCEL_RESIZE', 'INFORMATION_PROVISION',
  'TRANSFER_OF_RIGHT', 'MODIFY_PARTY', 'MODIFY_RRR', 'EASEMENT_REGISTRATION', 'BUILD_NEW_FEATURE',
  'CHANGE_LAND_USE', 'CORRECTION_RRR', 'CORRECTION_PARTY', 'PARCEL_INFO_UPDATING'
];

const DOCUMENT_TYPES = [
  'Title Certificate', 'Kebele Identification', 'Driving License', 'Passport',
  'Assignment of Share Contract', 'Sales Agreement', 'Power of Attorney', 'Site Plan',
  'Court Order', 'Marriage Certificate', 'Tax Clearance Certificate'
];

const APPLICANT_TYPES = [
  { value: 'LANDHOLDER', label: 'Landholder / Holder', icon: '👤', description: 'Individual property owner' },
  { value: 'AGENT', label: 'Authorized Agent', icon: '🤝', description: 'Representative with authorization' },
  { value: 'INSTITUTION', label: 'Institution Representative', icon: '🏛️', description: 'Organization, NGO, or association' }
];

const ID_TYPES = [
  { value: 'KEBELE_ID', label: 'Kebele Identification' },
  { value: 'DRIVING_LICENSE', label: 'Driving License' },
  { value: 'PASSPORT', label: 'Passport' }
];

const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
const GENDERS = ['Male', 'Female'];

export default function ApplicationForm() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingApp, setFetchingApp] = useState(isEditMode);
  const [successMessage, setSuccessMessage] = useState('');

  // Main Form State matching Screenshot 3
  const [form, setForm] = useState({
    applicant_type: 'LANDHOLDER',
    application_type: 'FIRST_REGISTRATION',
    parcel_id: '',
    parcel_code: '',
    area_sqm: '',
    land_use: 'Residential',
    region: 'Addis Ababa',
    city: 'Bole',
    sub_city: '',
    woreda: '',
    // Applicant detailed fields
    applicant_name: '',
    first_name: '',
    father_name: '',
    grandfather_name: '',
    mother_name: '',
    gender: 'Male',
    birth_date: '1985-05-15',
    birth_place: 'DM',
    marital_status: 'Single',
    applicant_id_type: 'KEBELE_ID',
    applicant_id_number: '',
    tin_number: '',
    applicant_phone: '',
    applicant_email: '',
    applicant_address: '',
    description: ''
  });

  // Selected Parcels List
  const [selectedParcelsList, setSelectedParcelsList] = useState([]);
  const [selectedParcelInput, setSelectedParcelInput] = useState('');

  // Required Documents List — each entry: { id, docType }
  const [requiredDocsList, setRequiredDocsList] = useState([
    { id: 1, docType: 'Title Certificate' },
    { id: 2, docType: 'Kebele Identification' }
  ]);
  const [selectedDocInput, setSelectedDocInput] = useState('Title Certificate');
  // Map of docEntry.id → File object chosen by FDO
  const [docFiles, setDocFiles] = useState({});
  // Track which entries were flagged missing on submit attempt
  const [docErrors, setDocErrors] = useState({});

  useEffect(() => {
    API.get('/parcels')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.data || [];
        setParcels(list);
      })
      .catch(console.error);

    if (isEditMode) {
      setFetchingApp(true);
      API.get(`/applications/${id}`)
        .then(({ data }) => {
          const app = data;
          const fullName = app.applicant_name || app.applicantName || '';
          const nameParts = fullName.split(' ');

          setForm({
            applicant_type: app.applicant_type || app.applicantType || 'LANDHOLDER',
            application_type: app.application_type || app.applicationType || 'FIRST_REGISTRATION',
            parcel_id: app.parcel_id || app.parcelId || (app.parcel?.id) || '',
            parcel_code: app.parcel?.parcelCode || '',
            area_sqm: app.parcel?.areaSqm || '',
            land_use: app.parcel?.landUse || 'Residential',
            region: app.parcel?.region || 'Addis Ababa',
            city: app.parcel?.city || 'Bole',
            sub_city: app.parcel?.subCity || '',
            woreda: app.parcel?.woreda || '',
            applicant_name: fullName,
            first_name: nameParts[0] || '',
            father_name: nameParts[1] || '',
            grandfather_name: nameParts[2] || '',
            mother_name: app.mother_name || 'Alemitu Ayele',
            gender: app.gender || 'Male',
            birth_date: app.birth_date ? app.birth_date.split('T')[0] : '1985-05-15',
            birth_place: app.birth_place || 'DM',
            marital_status: app.marital_status || 'Single',
            applicant_id_type: app.applicant_id_type || app.applicantIdType || 'KEBELE_ID',
            applicant_id_number: app.applicant_id_number || app.applicantIdNumber || '',
            tin_number: app.tin_number || '',
            applicant_phone: app.applicant_phone || app.applicantPhone || '',
            applicant_email: app.applicant_email || app.applicantEmail || '',
            applicant_address: app.applicant_address || app.applicantAddress || '',
            description: app.description || ''
          });

          if (app.parcel?.parcelCode || app.parcel?.id) {
            setSelectedParcelsList([
              { id: 1, parcelCode: app.parcel?.parcelCode || app.parcel_id || 'SN001010109110' }
            ]);
          }
        })
        .catch(err => {
          toast.error('Failed to load former application data');
          console.error(err);
        })
        .finally(() => setFetchingApp(false));
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      // Auto build full applicant name when first/father/grandfather change
      if (['first_name', 'father_name', 'grandfather_name'].includes(name)) {
        const fn = name === 'first_name' ? value : prev.first_name;
        const fat = name === 'father_name' ? value : prev.father_name;
        const gf = name === 'grandfather_name' ? value : prev.grandfather_name;
        updated.applicant_name = [fn, fat, gf].filter(Boolean).join(' ');
      }
      return updated;
    });
  };

  const handleSelectExistingParcel = (e) => {
    const pId = e.target.value;
    if (!pId) {
      setForm(prev => ({ ...prev, parcel_id: '', parcel_code: '' }));
      return;
    }
    const found = parcels.find(p => p.id === pId || p.parcelCode === pId);
    if (found) {
      setForm(prev => ({
        ...prev,
        parcel_id: found.id,
        parcel_code: found.parcelCode || '',
        area_sqm: found.areaSqm ? String(found.areaSqm) : prev.area_sqm,
        land_use: found.landUse || prev.land_use,
        region: found.region || prev.region,
        city: found.city || prev.city,
        sub_city: found.subCity || prev.sub_city,
        woreda: found.woreda || prev.woreda
      }));
      setSelectedParcelInput(found.parcelCode);
      if (!selectedParcelsList.some(p => p.parcelCode === found.parcelCode)) {
        setSelectedParcelsList([{ id: found.id, parcelCode: found.parcelCode }]);
      }
      toast.success(`Parcel ${found.parcelCode} selected`);
    }
  };

  const handleAddParcel = () => {
    const code = selectedParcelInput || form.parcel_code || `PRC-${Date.now().toString().slice(-6)}`;
    if (!code) return;
    if (selectedParcelsList.some(p => p.parcelCode === code)) {
      toast.error('Parcel already added to list');
      return;
    }
    const found = parcels.find(p => p.parcelCode === code || p.id === code);
    const pId = found ? found.id : Date.now();
    setSelectedParcelsList([...selectedParcelsList, { id: pId, parcelCode: code }]);
    setForm(prev => ({
      ...prev,
      parcel_id: found ? found.id : prev.parcel_id,
      parcel_code: code
    }));
    setSelectedParcelInput('');
    toast.success('Parcel added to list');
  };

  const handleRemoveParcel = (parcelId) => {
    setSelectedParcelsList(selectedParcelsList.filter(p => p.id !== parcelId));
  };

  const handleAddDocument = () => {
    if (!selectedDocInput) return;
    if (requiredDocsList.some(d => d.docType === selectedDocInput)) {
      toast.error('Document type already added');
      return;
    }
    const newId = Date.now();
    setRequiredDocsList([...requiredDocsList, { id: newId, docType: selectedDocInput }]);
    toast.success('Document added — please attach the file below');
  };

  const handleRemoveDocument = (docId) => {
    setRequiredDocsList(requiredDocsList.filter(d => d.id !== docId));
    // also clear associated file & error
    setDocFiles(prev => { const n = { ...prev }; delete n[docId]; return n; });
    setDocErrors(prev => { const n = { ...prev }; delete n[docId]; return n; });
  };

  // Called when FDO picks a file for a specific doc row
  const handleDocFileChange = (docId, file) => {
    setDocFiles(prev => ({ ...prev, [docId]: file || null }));
    if (file) {
      setDocErrors(prev => ({ ...prev, [docId]: false }));
    }
  };

  const handleReset = () => {
    setForm({
      applicant_type: 'LANDHOLDER',
      application_type: 'FIRST_REGISTRATION',
      parcel_id: '',
      parcel_code: '',
      area_sqm: '',
      land_use: 'Residential',
      region: 'Addis Ababa',
      city: 'Bole',
      sub_city: '',
      woreda: '',
      applicant_name: '',
      first_name: '',
      father_name: '',
      grandfather_name: '',
      mother_name: '',
      gender: 'Male',
      birth_date: '1985-05-15',
      birth_place: '',
      marital_status: 'Single',
      applicant_id_type: 'KEBELE_ID',
      applicant_id_number: '',
      tin_number: '',
      applicant_phone: '',
      applicant_email: '',
      applicant_address: '',
      description: ''
    });
    setSelectedParcelsList([]);
    setDocFiles({});
    setDocErrors({});
    setSuccessMessage('');
    toast.success('Application form reset');
  };

  const handleSearchApplicant = () => {
    if (!form.applicant_id_number && !form.first_name) {
      toast.error('Enter an ID number or First Name to search');
      return;
    }
    toast.success('Searched applicant records');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const fullName = form.applicant_name || [form.first_name, form.father_name, form.grandfather_name].filter(Boolean).join(' ');
    
    if (!fullName.trim()) {
      toast.error('Please enter the applicant\'s first and father name');
      return;
    }

    // ── DOCUMENT FILE VALIDATION ──────────────────────────────────────────────
    // Every document in the required list must have a file attached
    if (!isEditMode) {
      const missing = {};
      requiredDocsList.forEach(doc => {
        if (!docFiles[doc.id]) {
          missing[doc.id] = true;
        }
      });

      if (Object.keys(missing).length > 0) {
        setDocErrors(missing);
        toast.error(`❌ Please attach a file for all ${Object.keys(missing).length} required document(s) before saving.`);
        // Scroll to required docs section
        document.getElementById('required-docs-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    setLoading(true);
    setSuccessMessage('');

    try {
      const activeParcelCode = form.parcel_code || (selectedParcelsList.length > 0 ? selectedParcelsList[0].parcelCode : '');
      const activeParcelId = form.parcel_id || (selectedParcelsList.length > 0 && typeof selectedParcelsList[0].id === 'string' && selectedParcelsList[0].id.length > 20 ? selectedParcelsList[0].id : null);

      const payload = {
        ...form,
        applicant_name: fullName.trim(),
        parcel_id: activeParcelId,
        parcel_code: activeParcelCode,
        area_sqm: form.area_sqm ? parseFloat(form.area_sqm) : 250.00
      };

      if (isEditMode) {
        await API.put(`/applications/${id}`, payload);
        const msg = 'Application updated successfully';
        setSuccessMessage(`• ${msg}`);
        toast.success(`✅ ${msg}`);
        setTimeout(() => navigate('/applications'), 1500);
      } else {
        // Step 1: Create the application
        const { data } = await API.post('/applications', payload);
        const newAppId = data.id || (data.data && data.data.id);

        // Step 2: Upload each required document file
        if (newAppId && requiredDocsList.length > 0) {
          const uploadErrors = [];
          for (const doc of requiredDocsList) {
            const file = docFiles[doc.id];
            if (!file) continue; // already validated above
            const fd = new FormData();
            fd.append('file', file);
            fd.append('application_id', newAppId);
            fd.append('document_type', doc.docType);
            fd.append('category', 'APPLICANT');
            fd.append('description', `${doc.docType} for application ${data.application_number || data.applicationNumber}`);
            try {
              await API.post('/documents/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
              });
            } catch (uploadErr) {
              uploadErrors.push(doc.docType);
              console.error(`Upload failed for ${doc.docType}:`, uploadErr);
            }
          }

          if (uploadErrors.length > 0) {
            toast.error(`⚠️ Application created but failed to upload: ${uploadErrors.join(', ')}`);
          } else {
            toast.success(`✅ All ${requiredDocsList.length} document(s) uploaded successfully`);
          }
        }

        const msg = `Application created successfully (No: ${data.applicationNumber || data.application_number || 'New'})`;
        setSuccessMessage(`• ${msg}`);
        toast.success(`✅ ${msg}`);
        setTimeout(() => navigate(newAppId ? `/applications/${newAppId}` : '/applications'), 1800);
      }
    } catch (err) {
      console.error('Submit error:', err);
      const errText = err.response?.data?.message || err.message || 'Application submission failed';
      toast.error(`❌ ${errText}`);
    } finally {
      setLoading(false);
    }
  };


  if (fetchingApp) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium">
        <div className="spinner mb-3"></div>
        Loading application details for update...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Top Modal / Page Navigation Toolbar */}
      <div className="bg-slate-100 p-3 rounded-xl border border-slate-300 flex flex-wrap justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-900" />
          <h2 className="text-base font-bold text-slate-900">
            {isEditMode ? 'Update Application' : 'New Application'}
          </h2>
        </div>

        {/* Toolbar Action Buttons (Save, Reset, Search, Close) */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded flex items-center gap-1.5 shadow-sm transition"
            title="Allows keeping filled info"
          >
            <Save className="w-3.5 h-3.5" /> Save
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded flex items-center gap-1.5 shadow-sm transition"
            title="Allows resetting application page"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>

          <button
            type="button"
            onClick={handleSearchApplicant}
            className="px-3.5 py-1.5 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded flex items-center gap-1.5 shadow-sm transition"
            title="Allows searching info by name and ID"
          >
            <Search className="w-3.5 h-3.5" /> Search
          </button>

          <button
            type="button"
            onClick={() => navigate('/applications')}
            className="px-3.5 py-1.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded flex items-center gap-1.5 shadow-sm transition"
          >
            <X className="w-3.5 h-3.5" /> Close
          </button>
        </div>
      </div>

      {/* Main Two-Column Split Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: Basic Information */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-700" /> Basic Information
          </h3>

          <div className="space-y-3 text-xs">
            {/* Applicants Type */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Applicants Type:*</label>
              <select
                name="applicant_type"
                value={form.applicant_type}
                onChange={handleChange}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600"
              >
                {APPLICANT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Application Type */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Application Type:*</label>
              <select
                name="application_type"
                value={form.application_type}
                onChange={handleChange}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600"
              >
                {APP_TYPES.map(type => (
                  <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            {/* Required Document Type & Add */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Required Document Type:*</label>
              <div className="flex gap-2">
                <select
                  value={selectedDocInput}
                  onChange={e => setSelectedDocInput(e.target.value)}
                  className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600"
                >
                  {DOCUMENT_TYPES.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddDocument}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            {/* Parcels Code / Select & Add */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cadastral Parcel:*</label>
              {parcels.length > 0 && (
                <div className="mb-2">
                  <select
                    value={form.parcel_id}
                    onChange={handleSelectExistingParcel}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600 font-medium"
                  >
                    <option value="">-- Select from Registered Parcels (or type code below) --</option>
                    {parcels.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.parcelCode} ({p.areaSqm || '250'} m² - {p.landUse || 'Residential'} - {p.city || 'Addis Ababa'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Or enter custom parcel code (e.g. SN001010109110)..."
                  value={selectedParcelInput || form.parcel_code}
                  onChange={e => {
                    setSelectedParcelInput(e.target.value);
                    setForm({ ...form, parcel_code: e.target.value });
                  }}
                  className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600 font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddParcel}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            {/* Selected Parcels Table */}
            <div className="pt-2">
              <span className="font-semibold text-slate-700 text-xs block mb-1.5">Selected Parcels</span>
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                      <th className="p-2 w-12">No</th>
                      <th className="p-2">Parcel ID</th>
                      <th className="p-2 text-right w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedParcelsList.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="p-3 text-center text-slate-400">No parcels selected (will be auto-generated if left empty).</td>
                      </tr>
                    ) : (
                      selectedParcelsList.map((p, idx) => (
                        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2 font-mono font-medium text-slate-800">{p.parcelCode}</td>
                          <td className="p-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveParcel(p.id)}
                              className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded border border-rose-200"
                              title="Remove Parcel"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Required Documents Table with File Upload */}
            <div className="pt-2" id="required-docs-section">
              <span className="font-semibold text-slate-700 text-xs block mb-1.5">
                Required Documents
                {!isEditMode && (
                  <span className="ml-2 text-rose-600 font-normal">(file upload required for each)</span>
                )}
              </span>
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                      <th className="p-2 w-8">No</th>
                      <th className="p-2">Document Type</th>
                      {!isEditMode && <th className="p-2">Attach File <span className="text-rose-500">*</span></th>}
                      <th className="p-2 text-right w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requiredDocsList.length === 0 ? (
                      <tr>
                        <td colSpan={isEditMode ? 3 : 4} className="p-3 text-center text-slate-400">No documents attached.</td>
                      </tr>
                    ) : (
                      requiredDocsList.map((d, idx) => {
                        const hasFile = Boolean(docFiles[d.id]);
                        const hasError = Boolean(docErrors[d.id]);
                        return (
                          <tr
                            key={d.id}
                            className={`border-b border-slate-100 ${hasError ? 'bg-rose-50' : hasFile ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                          >
                            <td className="p-2 text-slate-600">{idx + 1}</td>
                            <td className="p-2 font-medium text-slate-800">
                              <div className="flex items-center gap-1.5">
                                {hasError && <span className="text-rose-500 text-base leading-none">●</span>}
                                {hasFile && <span className="text-emerald-500 text-base leading-none">✓</span>}
                                {d.docType}
                              </div>
                            </td>
                            {!isEditMode && (
                              <td className="p-2">
                                <label className="flex flex-col gap-0.5 cursor-pointer">
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    className="hidden"
                                    onChange={e => handleDocFileChange(d.id, e.target.files?.[0] || null)}
                                  />
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition
                                      ${hasError
                                        ? 'border-rose-400 bg-rose-100 text-rose-700 hover:bg-rose-200'
                                        : hasFile
                                          ? 'border-emerald-400 bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                                      }`}
                                  >
                                    {hasFile ? '📎 ' + docFiles[d.id].name.slice(0, 22) + (docFiles[d.id].name.length > 22 ? '…' : '') : '📂 Choose File'}
                                  </span>
                                  {hasError && (
                                    <span className="text-rose-500 text-xs">File required!</span>
                                  )}
                                </label>
                              </td>
                            )}
                            <td className="p-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveDocument(d.id)}
                                className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded border border-rose-200"
                                title="Remove Document"
                              >
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
              {/* Summary alert if there are missing files */}
              {!isEditMode && Object.values(docErrors).some(Boolean) && (
                <div className="mt-2 p-2 bg-rose-50 border border-rose-300 text-rose-700 rounded text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>{Object.values(docErrors).filter(Boolean).length} document(s)</strong> missing a file.
                    Please choose a file for each highlighted row before saving.
                  </span>
                </div>
              )}
            </div>


            {/* Success / Confirmation Message Box (matching Screenshot 3 bottom left) */}
            {successMessage && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT COLUMN: Applicant Details */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-200 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-700" /> Applicant Details
          </h3>

          <div className="space-y-3 text-xs">
            {/* First Name */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">First Name:*</label>
              <input
                type="text"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                placeholder="e.g. Alemayehu"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600"
                required
              />
            </div>

            {/* Father Name */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Father Name:*</label>
              <input
                type="text"
                name="father_name"
                value={form.father_name}
                onChange={handleChange}
                placeholder="e.g. Kebede"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600"
                required
              />
            </div>

            {/* Grand Father Name */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Grand Father Name:*</label>
              <input
                type="text"
                name="grandfather_name"
                value={form.grandfather_name}
                onChange={handleChange}
                placeholder="e.g. Alemu"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600"
              />
            </div>

            {/* Mother Name */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mother Name:*</label>
              <input
                type="text"
                name="mother_name"
                value={form.mother_name}
                onChange={handleChange}
                placeholder="e.g. Alemitu Ayele"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600"
              />
            </div>

            {/* Gender & Birth Date (2-column layout) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gender:*</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600"
                >
                  {GENDERS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Birth Date:*</label>
                <input
                  type="date"
                  name="birth_date"
                  value={form.birth_date}
                  onChange={handleChange}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600"
                />
              </div>
            </div>

            {/* Birth Place & Marital Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Birth Place:*</label>
                <input
                  type="text"
                  name="birth_place"
                  value={form.birth_place}
                  onChange={handleChange}
                  placeholder="e.g. DM"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Marital Status:*</label>
                <select
                  name="marital_status"
                  value={form.marital_status}
                  onChange={handleChange}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600"
                >
                  {MARITAL_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Personal ID Type & Personal ID */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Personal Id Type:*</label>
                <select
                  name="applicant_id_type"
                  value={form.applicant_id_type}
                  onChange={handleChange}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600"
                >
                  {ID_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Personal ID:*</label>
                <input
                  type="text"
                  name="applicant_id_number"
                  value={form.applicant_id_number}
                  onChange={handleChange}
                  placeholder="e.g. ass3636"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600 font-mono"
                />
              </div>
            </div>

            {/* Tin Number */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tin Number:</label>
              <input
                type="text"
                name="tin_number"
                value={form.tin_number}
                onChange={handleChange}
                placeholder="Optional Taxpayer Identification Number"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600 font-mono"
              />
            </div>

            {/* Phone Number & Email Address */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number:*</label>
                <input
                  type="tel"
                  name="applicant_phone"
                  value={form.applicant_phone}
                  onChange={handleChange}
                  placeholder="e.g. +251 91 123 4567"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address:</label>
                <input
                  type="email"
                  name="applicant_email"
                  value={form.applicant_email}
                  onChange={handleChange}
                  placeholder="e.g. applicant@gmail.com"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Address / Location:*</label>
              <input
                type="text"
                name="applicant_address"
                value={form.applicant_address}
                onChange={handleChange}
                placeholder="e.g. Addis Ababa, Sub-City Bole, Woreda 03, House No. 234"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600"
                required
              />
            </div>

            {/* Description / Purpose */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Application Purpose / Description:</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                placeholder="Brief description or purpose of this registration intake..."
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-blue-600"
              />
            </div>

            {/* Bottom Right Next Button */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded flex items-center gap-1.5 shadow"
              >
                {loading ? 'Processing...' : isEditMode ? '✓ Save Updates' : 'Next ➔'}
              </button>
            </div>

          </div>
        </div>

      </form>
    </div>
  );
}
