import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Ship,
  Code,
  Settings,
  Users,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/sections', icon: FileText, label: 'Sections' },
    { path: '/ships', icon: Ship, label: 'Ship Reports' },
    { path: '/generate', icon: Code, label: 'Generate Wiki' },
  ];

  const adminItems = [
    { path: '/admin', icon: Settings, label: 'Admin' },
    { path: '/users', icon: Users, label: 'Users' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-lcars-panel flex-col border-r border-lcars-orange/30">
        {/* Logo */}
        <div className="p-4 border-b border-lcars-orange/30">
          <Link to="/" className="block">
            <div className="lcars-header px-4 py-2 text-black font-bold">
              SOTFA Builder
            </div>
            <div className="text-lcars-tan text-sm mt-2 px-2">
              Starbase 118
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-lcars-orange text-black'
                      : 'text-lcars-tan hover:bg-lcars-orange/20'
                  }`}
                >
                  <item.icon size={20} />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {isAdmin && (
            <>
              <div className="my-4 border-t border-lcars-orange/30"></div>
              <ul className="space-y-2">
                {adminItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive(item.path)
                          ? 'bg-lcars-blue text-black'
                          : 'text-lcars-blue hover:bg-lcars-blue/20'
                      }`}
                    >
                      <item.icon size={20} />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-lcars-orange/30">
          <div className="text-lcars-tan text-sm mb-2">{user?.displayName}</div>
          <div className="text-xs text-gray-500 mb-3 capitalize">{user?.role.replace('_', ' ')}</div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-lcars-red hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-lcars-panel border-b border-lcars-orange/30 p-4">
        <div className="flex items-center justify-between">
          <span className="text-lcars-orange font-bold">SOTFA Builder</span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-lcars-orange"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/80 pt-16">
          <nav className="bg-lcars-panel h-full p-4">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                      isActive(item.path)
                        ? 'bg-lcars-orange text-black'
                        : 'text-lcars-tan'
                    }`}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </Link>
                </li>
              ))}
              {isAdmin &&
                adminItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                        isActive(item.path)
                          ? 'bg-lcars-blue text-black'
                          : 'text-lcars-blue'
                      }`}
                    >
                      <item.icon size={20} />
                      {item.label}
                    </Link>
                  </li>
                ))}
            </ul>
            <div className="mt-8 pt-4 border-t border-lcars-orange/30">
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 text-lcars-red"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:p-8 p-4 pt-20 md:pt-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
