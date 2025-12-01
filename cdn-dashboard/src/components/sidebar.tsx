'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Files, 
  Key, 
  Users, 
  Settings, 
  LogOut,
  Shield,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore, useIsSuperadmin } from '@/lib/auth';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Fichiers', href: '/dashboard/files', icon: Files },
  { name: 'Tokens', href: '/dashboard/tokens', icon: Key },
  { name: 'Logs', href: '/dashboard/logs', icon: Activity },
];

const adminNavigation = [
  { name: 'Utilisateurs', href: '/dashboard/users', icon: Users },
  { name: 'Clés API', href: '/dashboard/api-keys', icon: Shield },
  { name: 'Paramètres', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const isSuperadmin = useIsSuperadmin();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out',
        'bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800',
        'border-r border-gray-800',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-800">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">CDN Manager</h1>
              <p className="text-xs text-gray-500">v2.0</p>
            </div>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                'group relative',
                isActive
                  ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border border-indigo-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              )}
            >
              <item.icon size={20} className={cn(isActive && 'text-indigo-400')} />
              {!collapsed && <span className="font-medium">{item.name}</span>}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}

        {/* Admin Section */}
        {isSuperadmin && (
          <>
            <div className="pt-4 pb-2">
              {!collapsed && (
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Administration
                </p>
              )}
            </div>
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                    'group relative',
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-white border border-amber-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  )}
                >
                  <item.icon size={20} className={cn(isActive && 'text-amber-400')} />
                  {!collapsed && <span className="font-medium">{item.name}</span>}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User Info */}
      <div className="border-t border-gray-800 p-4">
        {!collapsed ? (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-semibold">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.username}</p>
              <p className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full inline-block',
                user?.role === 'superadmin' 
                  ? 'bg-amber-500/20 text-amber-400' 
                  : 'bg-blue-500/20 text-blue-400'
              )}>
                {user?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-semibold">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl',
            'text-red-400 hover:text-white hover:bg-red-500/20 transition-all duration-200',
            collapsed && 'justify-center'
          )}
        >
          <LogOut size={20} />
          {!collapsed && <span className="font-medium">Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
