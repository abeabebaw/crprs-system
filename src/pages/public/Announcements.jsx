import { useState, useEffect } from 'react';
import API from '../../api/client';
import { Newspaper, Calendar, Tag, ArrowLeft } from 'lucide-react';

export default function PublicAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/public/announcements')
      .then(({ data }) => setAnnouncements(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error fetching announcements:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <nav className="bg-blue-950 text-white px-6 py-4 shadow-md flex justify-between items-center">
        <a href="/portal" className="text-lg font-bold text-amber-400 flex items-center gap-2">
          CRPRS National Real Property Portal
        </a>
        <a href="/portal" className="text-xs bg-blue-900 hover:bg-blue-800 px-3 py-1.5 rounded text-white flex items-center gap-1 transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Portal
        </a>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Newspaper className="w-7 h-7 text-blue-600" /> Public Announcements & Cadastral Gazettes
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Official announcements, boundary notices, and registration publications issued by the Real Property Registration Agency.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            No public announcements currently published.
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map(a => (
              <div key={a.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{a.title}</h3>
                    {a.title_am && (
                      <div className="text-sm font-medium text-slate-600 font-sans mt-0.5">{a.title_am}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 font-semibold rounded flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {a.category || 'NOTICE'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {a.content}
                </p>

                <div className="pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  Published: {new Date(a.published_at || a.createdAt || Date.now()).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}