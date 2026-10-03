import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';


// FDO
import ApplicationList from './pages/fdo/ApplicationList';
import ApplicationForm from './pages/fdo/ApplicationForm';
import ApplicationDetail from './pages/fdo/ApplicationDetail';
import ApplicationReject from './pages/fdo/ApplicationReject';
import ApplicationReceipt from './pages/fdo/ApplicationReceipt';
import TransactionList from './pages/fdo/TransactionList';


import RECSPanel from './pages/gis/RECSPanel';
import DOPanel from './pages/do/DOPanel';

import ROPanel from './pages/ro/ROPanel';


import SROPanel from './pages/sro/SROPanel';


import UserManagement from './pages/admin/UserManagement';
import LookupManagement from './pages/admin/LookupManagement';
import RequiredDocuments from './pages/admin/RequiredDocument';
import BusinessRule from './pages/admin/BusinessRule';
import Configuration from './pages/admin/Configuration';
import AuditLogs from './pages/admin/AuditLogs';

// Reports
import Dashboard from './pages/reports/Dashboard';

// Public
import PublicHome from './pages/public/Home';
import PublicApplicationStatus from './pages/public/ApplicationStatus';
import PublicAnnouncements from './pages/public/Announcements';

export default function App() {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/portal" element={<PublicHome />} />
      <Route path="/portal/announcements" element={<PublicAnnouncements />} />
      <Route path="/portal/application-status" element={<PublicApplicationStatus />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* FDO Routes */}
        <Route path="applications" element={<ProtectedRoute roles={['FDO','ADMIN']}><ApplicationList /></ProtectedRoute>} />
        <Route path="applications/new" element={<ProtectedRoute roles={['FDO','ADMIN']}><ApplicationForm /></ProtectedRoute>} />
        <Route path="applications/:id/edit" element={<ProtectedRoute roles={['FDO','ADMIN']}><ApplicationForm /></ProtectedRoute>} />
        <Route path="applications/:id/reject" element={<ProtectedRoute roles={['FDO','ADMIN']}><ApplicationReject /></ProtectedRoute>} />
        <Route path="applications/:id/receipt/:type" element={<ProtectedRoute roles={['FDO','ADMIN']}><ApplicationReceipt /></ProtectedRoute>} />
        <Route path="applications/:id" element={<ProtectedRoute roles={['FDO','DO','RO','SRO','ADMIN']}><ApplicationDetail /></ProtectedRoute>} />
        <Route path="transactions" element={<ProtectedRoute roles={['FDO','RO','SRO','GO','SGO','ADMIN']}><TransactionList /></ProtectedRoute>} />
        
        {/* RECS GIS Cadastre Route */}
        <Route path="recs" element={<ProtectedRoute roles={['GO','SGO','RO','SRO','ADMIN']}><RECSPanel /></ProtectedRoute>} />

        {/* DO Routes */}
        <Route path="do" element={<ProtectedRoute roles={['DO','ADMIN']}><DOPanel /></ProtectedRoute>} />
        
        {/* RO Routes */}
        <Route path="ro" element={<ProtectedRoute roles={['RO','ADMIN']}><ROPanel /></ProtectedRoute>} />
        
        {/* SRO Routes */}
        <Route path="sro" element={<ProtectedRoute roles={['SRO','ADMIN']}><SROPanel /></ProtectedRoute>} />
        
        {/* Admin Routes */}
        <Route path="admin/users" element={<ProtectedRoute roles={['ADMIN']}><UserManagement /></ProtectedRoute>} />
        <Route path="admin/lookups" element={<ProtectedRoute roles={['ADMIN']}><LookupManagement /></ProtectedRoute>} />
        <Route path="admin/required-documents" element={<ProtectedRoute roles={['ADMIN']}><RequiredDocuments /></ProtectedRoute>} />
        <Route path="admin/business-rules" element={<ProtectedRoute roles={['ADMIN']}><BusinessRule /></ProtectedRoute>} />
        <Route path="admin/configurations" element={<ProtectedRoute roles={['ADMIN']}><Configuration /></ProtectedRoute>} />
        <Route path="admin/audit-logs" element={<ProtectedRoute roles={['ADMIN','FDO','SRO','RO','GO','SGO']}><AuditLogs /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}