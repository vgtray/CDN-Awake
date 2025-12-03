'use client';

import { useState, useEffect } from 'react';
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
  Menu,
  X,
  Sparkles,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore, useIsSuperadmin } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { useActivityStore } from '@/lib/notifications';

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

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const isSuperadmin = useIsSuperadmin();
  const { unreadCount } = useActivityStore();

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="flex items-center justify-between h-full px-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-zinc-100">CDN</h1>
            </div>
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Notifications indicator */}
            <button className="relative p-2 text-zinc-400 hover:text-zinc-100 transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Menu toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />

            {/* Slide-out menu */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed top-16 right-0 bottom-0 z-50 w-72 bg-zinc-950/95 backdrop-blur-xl border-l border-zinc-800/50 overflow-y-auto"
            >
              <nav className="p-4 space-y-1">
                {/* User Info */}
                <div className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {user?.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{user?.username}</p>
                    <p className={cn(
                      'text-[10px] font-semibold tracking-wide uppercase',
                      user?.role === 'superadmin' ? 'text-amber-400' : 'text-indigo-400'
                    )}>
                      {user?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                    </p>
                  </div>
                </div>

                {/* Main Navigation */}
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                        isActive
                          ? 'bg-gradient-to-r from-indigo-500/15 to-violet-500/10 border border-indigo-500/20 text-zinc-100'
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                      )}
                    >
                      <item.icon className={cn('w-5 h-5', isActive && 'text-indigo-400')} />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}

                {/* Admin Section */}
                {isSuperadmin && (
                  <>
                    <div className="pt-4 pb-2">
                      <p className="px-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                        Administration
                      </p>
                    </div>
                    
                    {adminNavigation.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                            isActive
                              ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/20 text-zinc-100'
                              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                          )}
                        >
                          <item.icon className={cn('w-5 h-5', isActive && 'text-amber-400')} />
                          <span className="font-medium">{item.name}</span>
                        </Link>
                      );
                    })}
                  </>
                )}

                {/* Logout */}
                <div className="pt-4">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Déconnexion</span>
                  </button>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
