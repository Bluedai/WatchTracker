import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

const navItems = [
  { path: '/', label: 'Bibliothek' },
  { path: '/suche', label: 'Suche' },
  { path: '/tags', label: 'Tags' },
  { path: '/verlauf', label: 'Verlauf' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center h-14 gap-8">
            <Link to="/" className="text-lg font-bold text-indigo-400 shrink-0">
              WatchTracker
            </Link>
            <div className="flex gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
