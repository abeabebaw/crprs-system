import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Shield, Lock, User, Compass, ArrowRight } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Authentication successful! Welcome to CRPRS');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl p-8 z-10 space-y-6">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-900/50 border border-blue-700/50 rounded-2xl text-amber-400 mb-1">
            <Compass className="w-8 h-8 animate-spin-slow" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">LOGIN TO NCRPRS</h1>
          <p className="text-xs text-slate-400">National Cadastre & Real Property Registration System</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-lg flex justify-center items-center gap-2 transition"
          >
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Login Bar */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          <div className="text-[10px] text-slate-400 font-semibold uppercase text-center tracking-wider">Quick Demo Logins</div>
          <div className="grid grid-cols-4 gap-1.5 text-[10px]">
            <button onClick={() => handleQuickLogin('fdo', 'fdo123')} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded text-center font-bold">FDO</button>
            <button onClick={() => handleQuickLogin('do', 'do123')} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded text-center font-bold">DO</button>
            <button onClick={() => handleQuickLogin('ro', 'ro123')} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded text-center font-bold">RO</button>
            <button onClick={() => handleQuickLogin('sro', 'sro123')} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-purple-400 rounded text-center font-bold">SRO</button>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <button onClick={() => handleQuickLogin('admin', 'admin123')} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded text-center font-bold">Admin</button>
            <button onClick={() => handleQuickLogin('go', 'go123')} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded text-center font-bold">GIS (GO)</button>
          </div>
        </div>
      </div>
    </div>
  );
}