import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/client';
import { 
  Map, FileText, CheckCircle, Clock, RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  ZoomIn, ZoomOut, Crop, Trash2, Save, Scan, HardDrive, Search, UserCheck, Archive, FolderCheck,
  Upload, Eye, ArrowRightLeft, Filter, RefreshCw, X, Download
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DOPanel() {
  const [activeTab, setActiveTab] = useState('queue'); // queue, scanner, archive, checkouts
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  
  // Scanning studio state
  const [selectedDocCategory, setSelectedDocCategory] = useState('APPLICANT');
  const [docType, setDocType] = useState('Kebele ID');
  const [refNumber, setRefNumber] = useState('');
  const [description, setDescription] = useState('');
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isFlippedH, setIsFlippedH] = useState(false);
  const [isFlippedV, setIsFlippedV] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [scannedImage, setScannedImage] = useState('https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80');
  const [uploadedFile, setUploadedFile] = useState(null);

  // Saved documents list for target app
  const [savedDocs, setSavedDocs] = useState([]);

  // Archive physical location state
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveDocs, setArchiveDocs] = useState([]);
  const [archiveLocation, setArchiveLocation] = useState({
    region: 'AA',
    city: 'Addis Ababa',
    wereda: '01',
    block: '05',
    section: '002',
    shelfNumber: 'ETH-DES-234',
    cellNumber: '334'
  });

  // Check-out / Check-in Tracking List (Physical Folder Management)
  const [checkouts, setCheckouts] = useState([]);
  const [searchDocQuery, setSearchDocQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadApplications();
    loadCheckouts();
  }, []);

  useEffect(() => {
    if (selectedApp) {
      loadDocumentsForApp(selectedApp.id);
    }
  }, [selectedApp]);

  const loadApplications = async () => {
    try {
      const { data } = await API.get('/applications');
      let allApps = Array.isArray(data) ? data : (data.data || []);
      const filtered = allApps.filter(app => ['SUBMITTED', 'READY_FOR_FILE_ATTACHMENT', 'FILE_ATTACHMENT_FINISHED', 'IN_PROGRESS'].includes(app.status));
      setApplications(filtered);
      if (filtered.length > 0 && !selectedApp) {
        setSelectedApp(filtered[0]);
      }
    } catch (err) {
      console.error('Error loading applications:', err);
    }
  };

  const loadDocumentsForApp = async (appId) => {
    try {
      const { data } = await API.get(`/documents/application/${appId}`);
      setSavedDocs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading documents for application:', err);
    }
  };

  const loadCheckouts = async () => {
    try {
      const { data } = await API.get('/documents/search?checked_out=true');
      setCheckouts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading checked-out documents:', err);
    }
  };

  const searchDocumentsForArchive = async (e) => {
    if (e) e.preventDefault();
    try {
      const { data } = await API.get(`/documents/search?q=${encodeURIComponent(archiveSearch)}`);
      setArchiveDocs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error searching documents for archive:', err);
      toast.error('Failed to search documents');
    }
  };

  const searchDocumentsForCheckout = async (e) => {
    if (e) e.preventDefault();
    try {
      const { data } = await API.get(`/documents/search?q=${encodeURIComponent(searchDocQuery)}`);
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error searching documents for checkout:', err);
      toast.error('Failed to search documents');
    }
  };

  const isPdfPreview = uploadedFile?.type === 'application/pdf' || uploadedFile?.name?.toLowerCase().endsWith('.pdf');

  const simulateScan = () => {
    toast.success('Scanner connected: Capturing document pages via TWAIN interface...');
    setScannedImage('https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80');
    setRotationAngle(0);
    setIsFlippedH(false);
    setIsFlippedV(false);
    setUploadedFile(null); // Will generate a JPEG blob on save
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      const imageUrl = URL.createObjectURL(file);
      setScannedImage(imageUrl);
      toast.success(`Loaded document file: ${file.name}`);
    }
  };

  const handleSaveScannedDocument = async () => {
    if (!selectedApp) {
      toast.error('Select an application from the queue first!');
      return;
    }

    let fileToUpload = uploadedFile;
    if (!fileToUpload) {
      // Create a canvas image blob from the scanned preview
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 400);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`CRPRS Cadastre & Real Property Registration System`, 30, 50);
      ctx.font = '14px sans-serif';
      ctx.fillText(`Document Category: ${selectedDocCategory}`, 30, 90);
      ctx.fillText(`Document Type: ${docType}`, 30, 120);
      ctx.fillText(`Application: ${selectedApp.application_number || selectedApp.applicationNumber}`, 30, 150);
      ctx.fillText(`Applicant: ${selectedApp.applicant_name || selectedApp.applicantName}`, 30, 180);
      ctx.fillText(`Scanned At: ${new Date().toISOString()}`, 30, 210);
      if (description) {
        ctx.fillText(`Remarks: ${description}`, 30, 240);
      }
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      fileToUpload = new File([blob], `${docType.toLowerCase().replace(/[^a-z0-9]/g, '_')}_scan.jpg`, { type: 'image/jpeg' });
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('application_id', selectedApp.id);
    formData.append('category', selectedDocCategory === 'LANDHOLDING' ? 'PARCEL' : selectedDocCategory);
    formData.append('document_type', docType);
    if (refNumber.trim()) {
      formData.append('reference_number', refNumber.trim());
    }
    if (description.trim()) {
      formData.append('description', description.trim());
    }

    try {
      const { data } = await API.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`Document uploaded successfully: ${data.referenceNumber || 'OK'}`);
      setRefNumber('');
      setDescription('');
      setUploadedFile(null);
      await loadDocumentsForApp(selectedApp.id);
    } catch (err) {
      console.error('Upload document error:', err);
      toast.error(err.response?.data?.message || 'Failed to upload document');
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await API.delete(`/documents/${docId}`);
      toast.success('Document deleted successfully');
      if (selectedApp) {
        await loadDocumentsForApp(selectedApp.id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleFinishAttachment = async (appId) => {
    try {
      await API.post(`/applications/${appId}/transition`, { status: 'FILE_ATTACHMENT_FINISHED' });
      toast.success('Attachment process finished! Status set to FILE_ATTACHMENT_FINISHED');
      loadApplications();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
      loadApplications();
    }
  };

  const handleArchiveDocument = async (docId) => {
    try {
      const payload = {
        region: archiveLocation.region,
        city: archiveLocation.city,
        wereda: archiveLocation.wereda,
        block: archiveLocation.block,
        shelf: archiveLocation.shelfNumber,
        cell: archiveLocation.cellNumber
      };
      await API.post(`/documents/${docId}/archive`, payload);
      toast.success(`Physical storage location updated for document`);
      if (selectedApp) loadDocumentsForApp(selectedApp.id);
      if (archiveSearch) searchDocumentsForArchive();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to archive document');
    }
  };

  const handleCheckoutDoc = async (docId) => {
    try {
      await API.post(`/documents/${docId}/checkout`);
      toast.success('Document checked out successfully');
      loadCheckouts();
      if (selectedApp) loadDocumentsForApp(selectedApp.id);
      if (searchDocQuery) searchDocumentsForCheckout();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check out document');
    }
  };

  const handleReturnFolder = async (docId) => {
    try {
      await API.post(`/documents/${docId}/checkin`);
      toast.success('Folder returned and checked in successfully');
      loadCheckouts();
      if (selectedApp) loadDocumentsForApp(selectedApp.id);
      if (searchDocQuery) searchDocumentsForCheckout();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to return folder');
    }
  };

  const openDocumentView = (docId) => {
    const token = localStorage.getItem('crprs_token');
    window.open(`/api/documents/${docId}/preview?token=${token}`, '_blank');
  };

  const downloadDocument = (docId) => {
    const token = localStorage.getItem('crprs_token');
    window.open(`/api/documents/${docId}/download?token=${token}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Scan className="w-6 h-6 text-blue-600" /> Document Management System (DMS) & Archiving Studio
          </h2>
          <p className="text-xs text-slate-500 font-medium">Scanning, Document Enhancement, Physical Folder Indexing & Archival Control (CRPRS Release 2.2)</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button onClick={() => setActiveTab('queue')} className={`px-4 py-2 font-bold rounded-lg transition ${activeTab==='queue'?'bg-blue-900 text-white shadow':'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            Applications Queue ({applications.length})
          </button>
          <button onClick={() => setActiveTab('scanner')} className={`px-4 py-2 font-bold rounded-lg transition ${activeTab==='scanner'?'bg-blue-900 text-white shadow':'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            Scanning Studio
          </button>
          <button onClick={() => setActiveTab('archive')} className={`px-4 py-2 font-bold rounded-lg transition ${activeTab==='archive'?'bg-blue-900 text-white shadow':'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            Physical Archive Storage
          </button>
          <button onClick={() => setActiveTab('checkouts')} className={`px-4 py-2 font-bold rounded-lg transition ${activeTab==='checkouts'?'bg-blue-900 text-white shadow':'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            Folder Check-out Tracker ({checkouts.length})
          </button>
        </div>
      </div>

      {/* TAB 1: Queue */}
      {activeTab === 'queue' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Pending Digitization & Document Attachment Queue
            </h3>
            <button onClick={loadApplications} className="p-1.5 text-slate-500 hover:text-slate-700 rounded hover:bg-slate-100" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                  <th className="p-3">App #</th>
                  <th className="p-3">Application Type</th>
                  <th className="p-3">Parcel UPI</th>
                  <th className="p-3">Applicant Name</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 ? (
                  <tr><td colSpan="6" className="p-6 text-center text-slate-400">No applications waiting for file attachment.</td></tr>
                ) : (
                  applications.map(app => (
                    <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-bold text-blue-900">{app.application_number || app.applicationNumber}</td>
                      <td className="p-3">{(app.application_type || app.applicationType)?.replace(/_/g, ' ')}</td>
                      <td className="p-3 font-mono text-xs">{app.parcel?.parcel_code || app.parcel?.parcelCode || 'N/A'}</td>
                      <td className="p-3 font-medium text-slate-800">{app.applicant_name || app.applicantName}</td>
                      <td className="p-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">{app.status}</span></td>
                      <td className="p-3 text-right space-x-2">
                        <button onClick={() => { setSelectedApp(app); setActiveTab('scanner'); }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-sm">
                          Attach Source Document
                        </button>
                        <button onClick={() => handleFinishAttachment(app.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-sm">
                          Finish Attachment
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

      {/* TAB 2: Scanning Studio */}
      {activeTab === 'scanner' && (
        <div className="grid grid-cols-12 gap-6">
          {/* Left Controls */}
          <div className="col-span-12 lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-2 text-xs flex items-center gap-2">
              <Scan className="w-4 h-4 text-blue-600" /> Scanning Controls & Document Metadata
            </h3>
            
            {selectedApp ? (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs text-blue-900 space-y-1">
                <div className="font-bold">Target App: {selectedApp.application_number || selectedApp.applicationNumber}</div>
                <div>Applicant: {selectedApp.applicant_name || selectedApp.applicantName}</div>
                <div className="text-slate-500 font-mono text-[11px]">Parcel: {selectedApp.parcel?.parcel_code || selectedApp.parcel?.parcelCode || 'N/A'}</div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded text-xs text-amber-800">
                Please select an application from the queue tab first.
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Document Category:</label>
                <select value={selectedDocCategory} onChange={e => setSelectedDocCategory(e.target.value)} className="w-full p-2 border border-slate-300 rounded bg-white">
                  <option value="APPLICANT">Applicant Document (ID, Passport, Driving License)</option>
                  <option value="PARCEL">Parcel / Landholding Document (Title, Contract, Site Plan)</option>
                  <option value="RRR">RRR Document (Mortgage, Court Order, Servitude)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Document Type:</label>
                <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full p-2 border border-slate-300 rounded bg-white">
                  <option value="Kebele ID">Kebele Identification Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Title Certificate">Landholding Title Certificate</option>
                  <option value="Sale Contract">Sale Contract Agreement</option>
                  <option value="Court Injunction">Court Injunction Letter</option>
                  <option value="Mortgage Deed">Mortgage Deed / Loan Contract</option>
                  <option value="Survey Cadastral Plan">Cadastral Survey Plan</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reference Number (Optional - Auto-generated if blank):</label>
                <input type="text" value={refNumber} onChange={e => setRefNumber(e.target.value)} placeholder="e.g. DOC-202609-APP-00001" className="w-full p-2 border border-slate-300 rounded" />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description / Remarks:</label>
                <textarea rows="2" value={description} onChange={e => setDescription(e.target.value)} placeholder="Document verification notes..." className="w-full p-2 border border-slate-300 rounded" />
              </div>

              {/* Image Enhancement Tools */}
              <div className="pt-2">
                <label className="block text-slate-700 font-semibold mb-2">Image Enhancement Tools:</label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button onClick={() => setRotationAngle((rotationAngle + 90) % 360)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-center text-slate-700" title="Rotate Right 90°"><RotateCw className="w-4 h-4 mx-auto"/></button>
                  <button onClick={() => setRotationAngle((rotationAngle - 90 + 360) % 360)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-center text-slate-700" title="Rotate Left 90°"><RotateCcw className="w-4 h-4 mx-auto"/></button>
                  <button onClick={() => setIsFlippedH(!isFlippedH)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-center text-slate-700" title="Mirror Flip Horizontal"><FlipHorizontal className="w-4 h-4 mx-auto"/></button>
                  <button onClick={() => setIsFlippedV(!isFlippedV)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-center text-slate-700" title="Mirror Flip Vertical"><FlipVertical className="w-4 h-4 mx-auto"/></button>
                  <button onClick={() => setZoomLevel(Math.min(zoomLevel + 25, 200))} className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-center text-slate-700" title="Zoom In"><ZoomIn className="w-4 h-4 mx-auto"/></button>
                  <button onClick={() => setZoomLevel(Math.max(zoomLevel - 25, 50))} className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-center text-slate-700" title="Zoom Out"><ZoomOut className="w-4 h-4 mx-auto"/></button>
                  <button onClick={() => { setRotationAngle(0); setIsFlippedH(false); setIsFlippedV(false); setZoomLevel(100); }} className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-center text-slate-700 col-span-2 text-xs font-semibold">Reset View</button>
                </div>
              </div>

              {/* Upload & Scan Trigger Buttons */}
              <div className="pt-3 space-y-2">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf" className="hidden" />
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={simulateScan} className="py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded text-xs flex items-center justify-center gap-1">
                    <Scan className="w-3.5 h-3.5" /> Scan Page
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded text-xs flex items-center justify-center gap-1">
                    <Upload className="w-3.5 h-3.5" /> Load File
                  </button>
                </div>
                <button onClick={handleSaveScannedDocument} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs flex items-center justify-center gap-2 shadow">
                  <Save className="w-4 h-4" /> Save & Archive Document
                </button>
              </div>
            </div>
          </div>

          {/* Right Image Canvas & Saved Documents list */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-center items-center min-h-[420px] overflow-hidden">
              <div 
                className="transition-all duration-300 max-w-full max-h-[380px]"
                style={{
                  transform: `rotate(${rotationAngle}deg) scale(${zoomLevel / 100}) ${isFlippedH ? 'scaleX(-1)' : ''} ${isFlippedV ? 'scaleY(-1)' : ''}`
                }}
              >
                {isPdfPreview ? (
                  <iframe
                    src={scannedImage}
                    title="Loaded PDF document preview"
                    className="w-[min(760px,90vw)] h-[360px] rounded border border-slate-700 bg-white"
                  />
                ) : (
                  <img src={scannedImage} alt="Scanned Document Preview" className="rounded shadow-2xl max-h-[360px] object-contain border border-slate-700" />
                )}
              </div>
              <div className="mt-3 text-slate-400 text-xs font-mono">
                Rotation: {rotationAngle}° | Zoom: {zoomLevel}% | Flip H: {isFlippedH ? 'YES' : 'NO'} | Flip V: {isFlippedV ? 'YES' : 'NO'} {uploadedFile ? `| File: ${uploadedFile.name}` : ''}
              </div>
            </div>

            {/* Saved Documents Table */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" /> Attached Documents ({savedDocs.length})
                </h4>
                {selectedApp && (
                  <button onClick={() => loadDocumentsForApp(selectedApp.id)} className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <th className="p-2">Category</th>
                      <th className="p-2">Document Type</th>
                      <th className="p-2">Reference #</th>
                      <th className="p-2">Storage / Physical</th>
                      <th className="p-2">Date Attached</th>
                      <th className="p-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedDocs.length === 0 ? (
                      <tr><td colSpan="6" className="p-4 text-center text-slate-400">No documents attached yet for this application.</td></tr>
                    ) : (
                      savedDocs.map(d => (
                        <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-2"><span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-semibold text-xs">{d.category}</span></td>
                          <td className="p-2 font-medium">{d.documentType || d.docType}</td>
                          <td className="p-2 font-mono text-slate-800">{d.referenceNumber || d.refNumber}</td>
                          <td className="p-2 text-slate-600 font-mono text-[11px]">{d.physicalStorageLocation || 'DIGITAL ONLY'}</td>
                          <td className="p-2 text-slate-500">{new Date(d.createdAt || d.date || Date.now()).toLocaleDateString()}</td>
                          <td className="p-2 text-right space-x-1.5">
                            <button onClick={() => openDocumentView(d.id)} title="View Document" className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => downloadDocument(d.id)} title="Download Document" className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded">
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleArchiveDocument(d.id)} title="Index to Archive" className="p-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded">
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteDocument(d.id)} title="Delete Document" className="p-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded border border-rose-200">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Archive Management */}
      {activeTab === 'archive' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Archive className="w-5 h-5 text-indigo-600" /> Physical Archive Storage Location Manager
            </h3>
            <p className="text-xs text-slate-500">Configure physical folder locations (Region, City, Wereda, Block, Shelf Number, Cell Number)</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Region Code:</label>
              <input type="text" value={archiveLocation.region} onChange={e => setArchiveLocation({...archiveLocation, region: e.target.value})} className="w-full p-2 border border-slate-300 rounded" />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">City Code:</label>
              <input type="text" value={archiveLocation.city} onChange={e => setArchiveLocation({...archiveLocation, city: e.target.value})} className="w-full p-2 border border-slate-300 rounded" />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Wereda Code:</label>
              <input type="text" value={archiveLocation.wereda} onChange={e => setArchiveLocation({...archiveLocation, wereda: e.target.value})} className="w-full p-2 border border-slate-300 rounded" />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Neighborhood / Block:</label>
              <input type="text" value={archiveLocation.block} onChange={e => setArchiveLocation({...archiveLocation, block: e.target.value})} className="w-full p-2 border border-slate-300 rounded" />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Shelf Number:</label>
              <input type="text" value={archiveLocation.shelfNumber} onChange={e => setArchiveLocation({...archiveLocation, shelfNumber: e.target.value})} className="w-full p-2 border border-slate-300 rounded font-mono" />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Cell / Box Number:</label>
              <input type="text" value={archiveLocation.cellNumber} onChange={e => setArchiveLocation({...archiveLocation, cellNumber: e.target.value})} className="w-full p-2 border border-slate-300 rounded font-mono" />
            </div>
          </div>

          {/* Search documents to apply archive location */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="font-bold text-slate-800 text-xs">Search Document or Parcel to Index</h4>
            <form onSubmit={searchDocumentsForArchive} className="flex gap-2">
              <input 
                type="text" 
                value={archiveSearch} 
                onChange={e => setArchiveSearch(e.target.value)} 
                placeholder="Search by reference number, filename, or location..." 
                className="flex-1 p-2 border border-slate-300 rounded text-xs" 
              />
              <button type="submit" className="px-4 py-2 bg-slate-900 text-white font-bold rounded text-xs flex items-center gap-1">
                <Search className="w-3.5 h-3.5" /> Search
              </button>
            </form>

            {archiveDocs.length > 0 && (
              <div className="overflow-x-auto border border-slate-200 rounded">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="p-2.5">Reference #</th>
                      <th className="p-2.5">Document Type</th>
                      <th className="p-2.5">Application</th>
                      <th className="p-2.5">Parcel UPI</th>
                      <th className="p-2.5">Current Location</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archiveDocs.map(doc => (
                      <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-bold text-blue-900">{doc.referenceNumber}</td>
                        <td className="p-2.5">{doc.documentType}</td>
                        <td className="p-2.5">{doc.application?.applicationNumber || 'N/A'}</td>
                        <td className="p-2.5 font-mono text-xs">{doc.application?.parcel?.parcelCode || 'N/A'}</td>
                        <td className="p-2.5 font-mono text-xs text-slate-600">{doc.physicalStorageLocation || 'NOT INDEXED'}</td>
                        <td className="p-2.5 text-right">
                          <button onClick={() => handleArchiveDocument(doc.id)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs">
                            Apply Location
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Physical Folder Check-out Tracker */}
      {activeTab === 'checkouts' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 text-xs">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FolderCheck className="w-5 h-5 text-blue-700" /> Physical Folder Check-out & Return Management
            </h3>
            <p className="text-xs text-slate-500">Track and register physical archival file folders borrowed by officers or legal investigators</p>
          </div>

          {/* Form to search document to check out */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-800">Check-out Document or Parcel Folder</h4>
            <form onSubmit={searchDocumentsForCheckout} className="flex gap-2">
              <input 
                type="text" 
                value={searchDocQuery} 
                onChange={e => setSearchDocQuery(e.target.value)} 
                placeholder="Search document by reference, file name, or location..." 
                className="flex-1 p-2 border border-slate-300 rounded text-xs bg-white" 
              />
              <button type="submit" className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded text-xs flex items-center gap-1.5 shadow">
                <Search className="w-4 h-4" /> Find Document
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="mt-3 overflow-x-auto border border-slate-200 rounded bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="p-2.5">Reference #</th>
                      <th className="p-2.5">Document Type</th>
                      <th className="p-2.5">Current Location</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map(doc => (
                      <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-bold text-blue-900">{doc.referenceNumber}</td>
                        <td className="p-2.5">{doc.documentType}</td>
                        <td className="p-2.5 font-mono text-xs">{doc.physicalStorageLocation || 'ARCHIVE'}</td>
                        <td className="p-2.5">
                          {doc.checkedOutBy ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded">CHECKED OUT</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">AVAILABLE</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right">
                          {doc.checkedOutBy ? (
                            <button onClick={() => handleReturnFolder(doc.id)} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs">
                              Return
                            </button>
                          ) : (
                            <button onClick={() => handleCheckoutDoc(doc.id)} className="px-3 py-1 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded text-xs">
                              Check Out
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Check-out records table */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-slate-800">Currently Checked-Out Folders & Documents</h4>
              <button onClick={loadCheckouts} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-xs">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh List
              </button>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-3">Reference #</th>
                    <th className="p-3">Document Type</th>
                    <th className="p-3">Application</th>
                    <th className="p-3">Checked Out By</th>
                    <th className="p-3">Checked Out Date</th>
                    <th className="p-3">Location</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {checkouts.length === 0 ? (
                    <tr><td colSpan="7" className="p-6 text-center text-slate-400">No documents or folders currently checked out.</td></tr>
                  ) : (
                    checkouts.map(c => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-blue-900">{c.referenceNumber}</td>
                        <td className="p-3 font-medium">{c.documentType}</td>
                        <td className="p-3">{c.application?.applicationNumber || 'N/A'}</td>
                        <td className="p-3 font-semibold text-slate-800">{c.checkedOutUser?.fullName || c.checkedOutUser?.username || 'Officer'}</td>
                        <td className="p-3 text-slate-500">{new Date(c.checkedOutAt || Date.now()).toLocaleDateString()}</td>
                        <td className="p-3 font-mono text-xs">{c.physicalStorageLocation || 'ARCHIVE'}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => handleReturnFolder(c.id)} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs shadow-sm">
                            Register Return
                          </button>
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
    </div>
  );
}
