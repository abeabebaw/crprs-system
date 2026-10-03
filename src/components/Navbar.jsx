import { useAuth } from '../context/AuthContext';
import { LogOut, User, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav className="navbar">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-slate-800 text-sm">Welcome, {user?.full_name || user?.username}</span>
        <span className="user-role-badge flex items-center gap-1">
          <Shield className="w-3 h-3 text-blue-700" /> {user?.role}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
          <User className="w-3.5 h-3.5 text-slate-500" />
          <span>{user?.email || 'user@crprs.gov.et'}</span>
        </div>
        <button className="btn btn-danger btn-sm flex items-center gap-1" onClick={logout}>
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </div>
    </nav>
  );
}