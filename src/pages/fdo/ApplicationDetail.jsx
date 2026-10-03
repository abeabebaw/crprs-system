import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';
import { Printer, XCircle, FileText, ListChecks, Map, Plus, Trash2, Save, Upload, Eye, Download, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const TXN_TYPES = {
  FIRST_REGISTRATION: ['REGISTRATION_OF_LEASEHOLD','REGISTRATION_OF_OLD_POSSESSION','REGISTRATION_OF_URBAN_FARM','REGISTRATION_OF_LANDHOLDING_NO_USERIGHT'],
  SUBSEQUENT_REGISTRATION: ['MORTGAGE_REGISTRATION','MORTGAGE_CANCELLATION','COURT_INJUNCTION_REGISTRATION','COURT_INJUNCTION_CANCELLATION','GENERAL_RESTRICTION_REGISTRATION','GENERAL_RESTRICTION_CANCELLATION'],
  PARCEL_RESIZE: ['PARCEL_SPLIT','PARCEL_MERGE','PARCEL_BOUNDARY_CHANGE'],
  INFORMATION_PROVISION: ['PRINT_REGISTRATION_EXTRACT','PRINT_CADASTRAL_EXTRACT','PRINT_NEW_TITLE','REPLACE_DAMAGED_TITLE','REPLACE_LOST_TITLE'],
  MODIFY_RRR: ['MODIFY_REGISTERED_RIGHT','MODIFY_REGISTERED_MORTGAGE','MODIFY_REGISTERED_INJUNCTION'],
};

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [app, setApp] = useState(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showTxn, setShowTxn] = useState(false);
  const [txnType, setTxnType] = useState('');
  
  // Digitization state
  const [showDigitization, setShowDigitization] = useState(false);
  const [parcelData, setParcelData] = useState({
    geometryWkt: '',
    areaSqm: '',
    landUse: '',
  });
  const [borderPoints, setBorderPoints] = useState([]);
  const [boundaryLines, setBoundaryLines] = useState([]);
  const [newPoint, setNewPoint] = useState({ pointNumber: '', latitude: '', longitude: '' });
  const [newLine, setNewLine] = useState({ lineNumber: '', lengthM: '' });

  // Document upload & viewing state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
  const [uploadData, setUploadData] = useState({
    category: 'APPLICANT',
    document_type: '',
    reference_number: '',
    description: '',
    file: null
  });

  // Loading states
  const [isRejecting, setIsRejecting] = useState(false);
  const [isCreatingTxn, setIsCreatingTxn] = useState(false);
  const [isSavingParcel, setIsSavingParcel] = useState(false);
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [isAddingLine, setIsAddingLine] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingPointId, setDeletingPointId] = useState(null);
  const [deletingLineId, setDeletingLineId] = useState(null);

  const isDO = user?.role === 'DO' || user?.role === 'ADMIN';
  const isFDO = user?.role === 'FDO' || user?.role === 'ADMIN';

  const fetchApp = async () => {
    const { data } = await API.get(`/applications/${id}`);
    setApp(data);
    
    // Load existing parcel data if available
    if (data.parcel) {
      setParcelData({
        geometryWkt: data.parcel.geometryWkt || '',
        areaSqm: data.parcel.areaSqm || '',
        landUse: data.parcel.landUse || '',
      });
      
      // Load border points and boundary lines
      if (data.parcel.id) {
        loadSpatialData(data.parcel.id);
      }
    }
  };
  
  const loadSpatialData = async (parcelId) => {
    try {
      const { data } = await API.get(`/parcels/${parcelId}`);
      setBorderPoints(data.borderPoints || []);
      setBoundaryLines(data.boundaryLines || []);
    } catch (err) {
      console.error('Failed to load spatial data:', err);
    }
  };

  useEffect(() => { fetchApp(); }, [id]);

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    
    setIsRejecting(true);
    try {
      await API.post(`/applications/${id}/reject`, { reason: rejectReason });
      toast.success('Application rejected');
      setShowReject(false);
      setRejectReason('');
      fetchApp();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reject');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleCreateTxn = async () => {
    if (!txnType) {
      toast.error('Please select a transaction type');
      return;
    }

    setIsCreatingTxn(true);
    try {
      await API.post('/transactions', { application_id: id, transaction_type: txnType, parcel_id: app.parcel_id });
      toast.success('Transaction created');
      setShowTxn(false);
      setTxnType('');
      fetchApp();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create transaction');
    } finally {
      setIsCreatingTxn(false);
    }
  };

  // Digitization functions
  const handleSaveParcelData = async () => {
    if (!app.parcel?.id) {
      toast.error('Parcel not found');
      return;
    }

    if (!parcelData.areaSqm || parseFloat(parcelData.areaSqm) <= 0) {
      toast.error('Please provide a valid area in square meters');
      return;
    }

    setIsSavingParcel(true);
    try {
      await API.put(`/parcels/${app.parcel.id}`, {
        geometry_wkt: parcelData.geometryWkt,
        area_sqm: parseFloat(parcelData.areaSqm),
        land_use: parcelData.landUse,
      });
      
      toast.success('Parcel data updated successfully');
      fetchApp();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update parcel data');
    } finally {
      setIsSavingParcel(false);
    }
  };

  const handleAddBorderPoint = async () => {
    if (!app.parcel?.id || !newPoint.pointNumber || !newPoint.latitude || !newPoint.longitude) {
      toast.error('Please fill all point fields');
      return;
    }

    setIsAddingPoint(true);
    try {
      const geometryWkt = `POINT(${newPoint.longitude} ${newPoint.latitude})`;
      
      await API.post('/border-points', {
        parcel_id: app.parcel.id,
        point_number: newPoint.pointNumber,
        geometry_wkt: geometryWkt,
      });
      
      toast.success('Border point added');
      setNewPoint({ pointNumber: '', latitude: '', longitude: '' });
      loadSpatialData(app.parcel.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add border point');
    } finally {
      setIsAddingPoint(false);
    }
  };

  const handleDeleteBorderPoint = async (pointId) => {
    setDeletingPointId(pointId);
    try {
      await API.delete(`/border-points/${pointId}`);
      toast.success('Border point deleted');
      loadSpatialData(app.parcel.id);
    } catch (err) {
      toast.error('Failed to delete border point');
    } finally {
      setDeletingPointId(null);
    }
  };

  const handleAddBoundaryLine = async () => {
    if (!app.parcel?.id || !newLine.lineNumber) {
      toast.error('Please fill required line fields');
      return;
    }

    setIsAddingLine(true);
    try {
      await API.post('/boundary-lines', {
        parcel_id: app.parcel.id,
        line_number: newLine.lineNumber,
        length_m: parseFloat(newLine.lengthM) || null
      });
      
      toast.success('Boundary line added');
      setNewLine({ lineNumber: '', lengthM: '' });
      loadSpatialData(app.parcel.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add boundary line');
    } finally {
      setIsAddingLine(false);
    }
  };

  const handleDeleteBoundaryLine = async (lineId) => {
    setDeletingLineId(lineId);
    try {
      await API.delete(`/boundary-lines/${lineId}`);
      toast.success('Boundary line deleted');
      loadSpatialData(app.parcel.id);
    } catch (err) {
      toast.error('Failed to delete boundary line');
    } finally {
      setDeletingLineId(null);
    }
  };

  // Document upload function
  const handleUploadDocument = async (e) => {
    e.preventDefault();
    
    if (!uploadData.file) {
      toast.error('Please select a file');
      return;
    }

    if (!uploadData.document_type) {
      toast.error('Please provide a document type');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadData.file);
      formData.append('application_id', id);
      formData.append('category', uploadData.category);
      formData.append('document_type', uploadData.document_type);
      formData.append('reference_number', uploadData.reference_number);
      formData.append('description', uploadData.description);

      await API.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Document uploaded successfully');
      setShowUploadModal(false);
      setUploadData({
        category: 'APPLICANT',
        document_type: '',
        reference_number: '',
        description: '',
        file: null
      });
      fetchApp();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = (d) => {
    const token = localStorage.getItem('crprs_token');
    window.open(`/api/documents/${d.id}/download?token=${token}`, '_blank');
  };

  if (!app) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>Application {app.application_number}</h2>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {app.status === 'SUBMITTED' && (
            <>
              <button className="btn btn-primary" onClick={() => setShowTxn(true)}><ListChecks size={16} /> New Transaction</button>
              <button className="btn btn-danger" onClick={() => navigate(`/applications/${id}/reject`)}><XCircle size={16} /> Reject</button>
            </>
          )}
          {app.transactions?.length > 0 && (
            <button
              className="btn btn-success"
              onClick={() => navigate(`/applications/${id}/receipt/${app.status === 'FINISHED' ? 'return' : 'acknowledgment'}`)}
            >
              <Printer size={16} /> {app.status === 'FINISHED' ? 'Print Return Receipt' : 'Print Receipt'}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Application Information</h3>
        <div className="grid grid-2">
          <div><strong>Type:</strong> {(app.application_type || app.applicationType || '')?.replace(/_/g,' ')}</div>
          <div><strong>Status:</strong> <StatusBadge status={app.status} /></div>
          <div><strong>Parcel Code:</strong> <span className="font-mono font-bold text-blue-900">{app.parcel_code || app.parcel?.parcelCode || app.parcel?.parcel_code || app.parcel_id || 'PRC-AUTO-GEN'}</span></div>
          <div><strong>Applicant:</strong> {app.applicant_name || app.applicantName || 'N/A'}</div>
          <div><strong>Applicant Type:</strong> {app.applicant_type || app.applicantType || 'LANDHOLDER'}</div>
          <div><strong>Phone:</strong> {app.applicant_phone || app.applicantPhone || app.submitter?.phone || app.applicant?.phone || '+251 91 123 4567'}</div>
          <div><strong>Email:</strong> {app.applicant_email || app.applicantEmail || app.submitter?.email || '-'}</div>
          <div><strong>Address:</strong> {app.applicant_address || app.applicantAddress || app.applicant?.address || '-'}</div>
          <div><strong>Submitted:</strong> {new Date(app.submitted_at || app.submittedAt || app.createdAt || app.created_at || Date.now()).toLocaleString()}</div>
          <div><strong>Description:</strong> {app.description || '-'}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Transactions</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '100%' }}>
            <thead><tr><th>Txn Number</th><th>Type</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {app.transactions?.map(t => (
                <tr key={t.id}>
                  <td>{t.transaction_number}</td>
                  <td>{t.transaction_type?.replace(/_/g,' ')}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td><button className="btn btn-primary btn-sm" onClick={() => navigate('/transactions')}>View</button></td>
                </tr>
              ))}
              {(!app.transactions || app.transactions.length === 0) && <tr><td colSpan="5" style={{textAlign:'center',padding:'1rem'}}>No transactions</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3>Documents</h3>
          {isFDO && (
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload size={16} /> Upload Document
            </button>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '100%' }}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Category</th>
                <th>Reference</th>
                <th>Uploaded</th>
                <th style={{ textAlign: 'right', minWidth: '180px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {app.documents?.map(d => {
                const docId = d.id;
                const docType = d.document_type || d.documentType;
                const cat = d.category;
                const refNum = d.reference_number || d.referenceNumber || '-';
                const dateStr = (d.created_at || d.createdAt) ? new Date(d.created_at || d.createdAt).toLocaleDateString() : '-';
                return (
                  <tr key={docId}>
                    <td style={{ fontWeight: 600 }}>{docType}</td>
                    <td>{cat}</td>
                    <td style={{ fontFamily: 'monospace' }}>{refNum}</td>
                    <td>{dateStr}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => setViewDoc(d)} 
                          title="View Document"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={14} /> View
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => handleDownload(d)} 
                          title="Download Document"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Download size={14} /> Download
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!app.documents || app.documents.length === 0) && (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '1rem' }}>No documents</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Digitization Section - Only for DO users */}
      {isDO && app.parcel && (
        <div className="card" style={{ background: '#f8f9fa', border: '2px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2563eb' }}>
              <Map size={24} />
              Parcel Digitization
            </h3>
            <button 
              className="btn btn-primary"
              onClick={() => setShowDigitization(!showDigitization)}
            >
              {showDigitization ? 'Hide' : 'Show'} Digitization Tools
            </button>
          </div>

          {showDigitization && (
            <>
              {/* Parcel Basic Data */}
              <div style={{ marginBottom: '2rem', padding: '1rem', background: 'white', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '1rem' }}>Parcel Data</h4>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label>Parcel Code</label>
                    <input 
                      className="form-control" 
                      value={app.parcel.parcelCode} 
                      disabled
                    />
                  </div>
                  <div className="form-group">
                    <label>Area (sqm) *</label>
                    <input 
                      className="form-control" 
                      type="number"
                      step="0.01"
                      value={parcelData.areaSqm}
                      onChange={(e) => setParcelData({...parcelData, areaSqm: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Land Use</label>
                    <select 
                      className="form-control"
                      value={parcelData.landUse}
                      onChange={(e) => setParcelData({...parcelData, landUse: e.target.value})}
                    >
                      <option value="">Select</option>
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Industrial">Industrial</option>
                      <option value="Agricultural">Agricultural</option>
                      <option value="Mixed">Mixed</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Geometry (WKT Format)</label>
                  <textarea 
                    className="form-control"
                    rows="3"
                    placeholder="POLYGON((lon1 lat1, lon2 lat2, lon3 lat3, lon4 lat4, lon1 lat1))"
                    value={parcelData.geometryWkt}
                    onChange={(e) => setParcelData({...parcelData, geometryWkt: e.target.value})}
                  />
                  <small style={{ color: '#6c757d' }}>
                    Example: POLYGON((38.7578 9.0320, 38.7580 9.0320, 38.7580 9.0325, 38.7578 9.0325, 38.7578 9.0320))
                  </small>
                </div>
                <button 
                  className="btn btn-success"
                  onClick={handleSaveParcelData}
                  disabled={isSavingParcel}
                >
                  <Save size={16} /> {isSavingParcel ? 'Saving...' : 'Save Parcel Data'}
                </button>
              </div>

              {/* Border Points */}
              <div style={{ marginBottom: '2rem', padding: '1rem', background: 'white', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '1rem' }}>Corner Points (Border Points)</h4>
                
                <div className="grid grid-3" style={{ marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label>Point Number *</label>
                    <input 
                      className="form-control"
                      placeholder="P1"
                      value={newPoint.pointNumber}
                      onChange={(e) => setNewPoint({...newPoint, pointNumber: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Latitude *</label>
                    <input 
                      className="form-control"
                      type="number"
                      step="0.000001"
                      placeholder="9.0320"
                      value={newPoint.latitude}
                      onChange={(e) => setNewPoint({...newPoint, latitude: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Longitude *</label>
                    <input 
                      className="form-control"
                      type="number"
                      step="0.000001"
                      placeholder="38.7578"
                      value={newPoint.longitude}
                      onChange={(e) => setNewPoint({...newPoint, longitude: e.target.value})}
                    />
                  </div>
                </div>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={handleAddBorderPoint}
                  disabled={isAddingPoint}
                >
                  <Plus size={16} /> {isAddingPoint ? 'Adding...' : 'Add Point'}
                </button>

                {borderPoints.length > 0 && (
                  <table style={{ marginTop: '1rem' }}>
                    <thead>
                      <tr>
                        <th>Point #</th>
                        <th>Latitude</th>
                        <th>Longitude</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {borderPoints.map(point => {
                        // Parse WKT to get coordinates
                        const coords = point.geometryWkt?.match(/POINT\(([^ ]+) ([^ ]+)\)/);
                        const lon = coords?.[1] || 'N/A';
                        const lat = coords?.[2] || 'N/A';
                        
                        return (
                          <tr key={point.id}>
                            <td>{point.pointNumber}</td>
                            <td>{lat}</td>
                            <td>{lon}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteBorderPoint(point.id)}
                                disabled={deletingPointId === point.id}
                              >
                                {deletingPointId === point.id ? '...' : <Trash2 size={14} />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Boundary Lines */}
              <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '1rem' }}>Boundary Lines</h4>
                
                <div className="grid grid-3" style={{ marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label>Line Number *</label>
                    <input 
                      className="form-control"
                      placeholder="L1"
                      value={newLine.lineNumber}
                      onChange={(e) => setNewLine({...newLine, lineNumber: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Length (m)</label>
                    <input 
                      className="form-control"
                      type="number"
                      step="0.01"
                      placeholder="50.00"
                      value={newLine.lengthM}
                      onChange={(e) => setNewLine({...newLine, lengthM: e.target.value})}
                    />
                  </div>
                </div>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={handleAddBoundaryLine}
                  disabled={isAddingLine}
                >
                  <Plus size={16} /> {isAddingLine ? 'Adding...' : 'Add Line'}
                </button>

                {boundaryLines.length > 0 && (
                  <table style={{ marginTop: '1rem' }}>
                    <thead>
                      <tr>
                        <th>Line #</th>
                        <th>Length (m)</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boundaryLines.map(line => (
                        <tr key={line.id}>
                          <td>{line.lineNumber}</td>
                          <td>{line.lengthM || '-'}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteBoundaryLine(line.id)}
                              disabled={deletingLineId === line.id}
                            >
                              {deletingLineId === line.id ? '...' : <Trash2 size={14} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {showReject && (
        <div className="modal-overlay" onClick={() => setShowReject(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Reject Application</h3><button onClick={() => setShowReject(false)}>×</button></div>
            <div className="form-group">
              <label>Rejection Reason *</label>
              <textarea 
                className="form-control" 
                rows="4" 
                value={rejectReason} 
                onChange={e => setRejectReason(e.target.value)}
                disabled={isRejecting}
              />
            </div>
            <button 
              className="btn btn-danger" 
              onClick={handleReject}
              disabled={isRejecting || !rejectReason.trim()}
            >
              {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
            </button>
          </div>
        </div>
      )}

      {showTxn && (
        <div className="modal-overlay" onClick={() => setShowTxn(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Create Transaction</h3><button onClick={() => setShowTxn(false)}>×</button></div>
            <div className="form-group">
              <label>Transaction Type</label>
              <select 
                className="form-control" 
                value={txnType} 
                onChange={e => setTxnType(e.target.value)}
                disabled={isCreatingTxn}
              >
                <option value="">Select Type</option>
                {(TXN_TYPES[app.application_type] || []).map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <button 
              className="btn btn-success" 
              onClick={handleCreateTxn} 
              disabled={!txnType || isCreatingTxn}
            >
              {isCreatingTxn ? 'Creating...' : 'Create Transaction'}
            </button>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Upload Document</h3>
              <button onClick={() => setShowUploadModal(false)}>×</button>
            </div>
            <form onSubmit={handleUploadDocument}>
              <div className="form-group">
                <label>Document Category *</label>
                <select 
                  className="form-control"
                  value={uploadData.category}
                  onChange={(e) => setUploadData({...uploadData, category: e.target.value})}
                  required
                >
                  <option value="APPLICANT">Applicant Document</option>
                  <option value="PARCEL">Parcel Document</option>
                  <option value="RRR">Right/Restriction/Responsibility</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Document Type *</label>
                <input 
                  className="form-control"
                  placeholder="e.g., ID Card, Title Deed, etc."
                  value={uploadData.document_type}
                  onChange={(e) => setUploadData({...uploadData, document_type: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Reference Number (Optional - Auto-generated)</label>
                <input 
                  className="form-control"
                  placeholder="Auto-generated if left empty"
                  value={uploadData.reference_number}
                  onChange={(e) => setUploadData({...uploadData, reference_number: e.target.value})}
                />
                <small style={{ color: '#6c757d', display: 'block', marginTop: '0.25rem' }}>
                  Leave empty for automatic generation (e.g., DOC-202608-APP-00001)
                </small>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea 
                  className="form-control"
                  rows="3"
                  placeholder="Additional notes about this document"
                  value={uploadData.description}
                  onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Select File *</label>
                <input 
                  type="file"
                  className="form-control"
                  onChange={(e) => setUploadData({...uploadData, file: e.target.files[0]})}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  required
                />
                <small style={{ color: '#6c757d', display: 'block', marginTop: '0.25rem' }}>
                  Accepted formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
                </small>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-success"
                  disabled={isUploading || !uploadData.file || !uploadData.document_type}
                >
                  <Upload size={16} /> {isUploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewDoc && (
        <div className="modal-overlay" onClick={() => setViewDoc(null)}>
          <div className="modal" style={{ maxWidth: '850px', width: '92%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} className="text-blue-600" /> 
                Document Preview: {viewDoc.document_type || viewDoc.documentType}
              </h3>
              <button onClick={() => setViewDoc(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>
            
            <div className="modal-body" style={{ padding: '1rem 0' }}>
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', fontSize: '0.85rem', border: '1px solid #e2e8f0' }}>
                <div><strong>Category:</strong> {viewDoc.category}</div>
                <div><strong>Reference #:</strong> {viewDoc.reference_number || viewDoc.referenceNumber || 'N/A'}</div>
                <div><strong>File Name:</strong> {viewDoc.file_name || viewDoc.fileName || 'Document'}</div>
                <div><strong>Uploaded:</strong> {(viewDoc.created_at || viewDoc.createdAt) ? new Date(viewDoc.created_at || viewDoc.createdAt).toLocaleDateString() : 'N/A'}</div>
              </div>

              <div style={{ minHeight: '400px', maxHeight: '580px', background: '#0f172a', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%' }}>
                {(() => {
                  const token = localStorage.getItem('crprs_token');
                  const previewUrl = `/api/documents/${viewDoc.id}/preview?token=${token}`;
                  const mime = (viewDoc.mime_type || viewDoc.mimeType || '').toLowerCase();
                  const fileName = (viewDoc.file_name || viewDoc.fileName || '').toLowerCase();
                  const ext = fileName.split('.').pop();

                  // Images — render directly so they fill the dark background nicely
                  if (mime.startsWith('image/') || /^(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(ext)) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '1rem' }}>
                        <img
                          src={`/api/documents/${viewDoc.id}/preview?token=${token}`}
                          alt={viewDoc.document_type}
                          style={{ maxWidth: '100%', maxHeight: '540px', objectFit: 'contain', borderRadius: 4 }}
                        />
                      </div>
                    );
                  }

                  // Everything else (PDF, docx, xlsx, txt, etc.) — use the /preview endpoint in an iframe
                  // The backend converts/serves each type appropriately
                  return (
                    <iframe
                      src={previewUrl}
                      title="Document Preview"
                      width="100%"
                      height="540px"
                      style={{ border: 'none', background: '#fff', display: 'block' }}
                    />
                  );
                })()}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  const token = localStorage.getItem('crprs_token');
                  window.open(`/api/documents/${viewDoc.id}/view?token=${token}`, '_blank');
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <ExternalLink size={16} /> Open in New Tab
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => handleDownload(viewDoc)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Download size={16} /> Download
              </button>
              <button className="btn btn-outline" onClick={() => setViewDoc(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}