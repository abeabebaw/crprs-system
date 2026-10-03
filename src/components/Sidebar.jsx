import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, FileText, List, UserCheck, CheckSquare, Users, Settings, Database, Globe, MapPin, ShieldCheck } from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role;

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard & Reports', icon: Home, roles: ['FDO','RO','SRO','ADMIN','DO','GO','SGO'] },
    { path: '/applications', label: 'Applications (FDO)', icon: FileText, roles: ['FDO','ADMIN'] },
    { path: '/transactions', label: 'Transactions Queue', icon: List, roles: ['FDO','RO','SRO','GO','SGO','ADMIN'] },
    { path: '/recs', label: 'RECS GIS Cadastre', icon: MapPin, roles: ['GO','SGO','RO','SRO','ADMIN'] },
    { path: '/do', label: 'DMS & Scanning Studio', icon: FileText, roles: ['DO','ADMIN'] },
    { path: '/ro', label: 'Registration Workbench', icon: UserCheck, roles: ['RO','ADMIN'] },
    { path: '/sro', label: 'SRO Approvals & Titles', icon: CheckSquare, roles: ['SRO','ADMIN'] },
    { path: '/admin/users', label: 'User Management', icon: Users, roles: ['ADMIN'] },
    { path: '/admin/lookups', label: 'Lookup Management', icon: Database, roles: ['ADMIN'] },
    { path: '/admin/required-documents', label: 'Required Documents', icon: Settings, roles: ['ADMIN'] },
    { path: '/admin/audit-logs', label: 'Audit Trail & Monitoring', icon: ShieldCheck, roles: ['FDO','SRO','ADMIN'] },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>CRPRS</h2>
        <p>Cadastre & Real Property Registration System</p>
      </div>
      <ul className="sidebar-menu">
        {menuItems.filter(m => m.roles.includes(role)).map(m => (
          <li key={m.path}>
            <NavLink to={m.path} className={({isActive}) => isActive ? 'active' : ''}>
              <m.icon size={20} /> {m.label}
            </NavLink>
          </li>
        ))}
        <li>
          <a href="/portal" target="_blank" rel="noreferrer">
            <Globe size={20} /> Web Map Portal (Public)
          </a>
        </li>
      </ul>
    </aside>
  );
}