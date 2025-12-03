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
  ChevronRight,
  Sparkles,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore, useIsSuperadmin } from '@/lib/auth';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityDropdown } from './notifications';
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

const sidebarVariants = {
  expanded: { width: 256 },
  collapsed: { width: 80 },
};

const navItemVariants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -10 },
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const isSuperadmin = useIsSuperadmin();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <motion.aside
      initial={false}
      animate={collapsed ? 'collapsed' : 'expanded'}
      variants={sidebarVariants}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'fixed left-0 top-0 z-40 h-screen',
        'bg-zinc-950/80 backdrop-blur-xl',
        'border-r border-zinc-800/50',
        'flex flex-col',
        'hidden lg:flex'
      )}
    >
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-800/50">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Link href="/dashboard" className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow duration-300">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-zinc-100">CDN</h1>
                  <p className="text-[10px] text-zinc-500 font-medium tracking-wider">MANAGER v2.0</p>
                </div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-2 rounded-xl text-zinc-400 hover:text-zinc-100 transition-colors',
            'hover:bg-zinc-800/50',
            collapsed && 'mx-auto'
          )}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </motion.button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navigation.map((item, index) => {
          const isActive = pathname === item.href;
          const isHovered = hoveredItem === item.name;
          
          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              onMouseEnter={() => setHoveredItem(item.name)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Link
                href={item.href}
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                  'group',
                  isActive
                    ? 'text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-100'
                )}
              >
                {/* Active/Hover Background */}
                <AnimatePresence>
                  {(isActive || isHovered) && (
                    <motion.div
                      layoutId="nav-highlight"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        'absolute inset-0 rounded-xl',
                        isActive 
                          ? 'bg-gradient-to-r from-indigo-500/15 to-violet-500/10 border border-indigo-500/20' 
                          : 'bg-zinc-800/50'
                      )}
                    />
                  )}
                </AnimatePresence>

                {/* Active Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-indigo-400 to-violet-500"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}

                <item.icon 
                  size={20} 
                  className={cn(
                    'relative z-10 transition-all duration-200',
                    isActive ? 'text-indigo-400' : 'group-hover:text-zinc-100'
                  )} 
                />
                
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="relative z-10 font-medium text-sm"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Collapsed Tooltip */}
                {collapsed && (
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-800 text-zinc-100 text-sm font-medium rounded-lg border border-zinc-700/50 shadow-xl whitespace-nowrap z-50"
                      >
                        {item.name}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-800" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </Link>
            </motion.div>
          );
        })}

        {/* Admin Section */}
        {isSuperadmin && (
          <>
            <div className="pt-4 pb-2">
              <AnimatePresence>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest"
                  >
                    Administration
                  </motion.p>
                )}
              </AnimatePresence>
              {collapsed && <div className="h-px bg-zinc-800/50 mx-3" />}
            </div>
            
            {adminNavigation.map((item, index) => {
              const isActive = pathname === item.href;
              const isHovered = hoveredItem === item.name;
              
              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (navigation.length + index) * 0.05, duration: 0.3 }}
                  onMouseEnter={() => setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                      'group',
                      isActive
                        ? 'text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-100'
                    )}
                  >
                    <AnimatePresence>
                      {(isActive || isHovered) && (
                        <motion.div
                          layoutId="admin-nav-highlight"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            'absolute inset-0 rounded-xl',
                            isActive 
                              ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/20' 
                              : 'bg-zinc-800/50'
                          )}
                        />
                      )}
                    </AnimatePresence>

                    {isActive && (
                      <motion.div
                        layoutId="admin-active-indicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-amber-400 to-orange-500"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}

                    <item.icon 
                      size={20} 
                      className={cn(
                        'relative z-10 transition-all duration-200',
                        isActive ? 'text-amber-400' : 'group-hover:text-zinc-100'
                      )} 
                    />
                    
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="relative z-10 font-medium text-sm"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {collapsed && isHovered && (
                      <motion.div
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-800 text-zinc-100 text-sm font-medium rounded-lg border border-zinc-700/50 shadow-xl whitespace-nowrap z-50"
                      >
                        {item.name}
                      </motion.div>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </>
        )}
      </nav>

      {/* User Section */}
      <div className="border-t border-zinc-800/50 p-4">
        {/* Notification Button */}
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between mb-4"
            >
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Notifications</span>
              <ActivityDropdown />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center mb-4"
            >
              <ActivityDropdown />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 mb-3"
            >
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
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center mb-3"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl',
            'text-zinc-400 hover:text-red-400',
            'hover:bg-red-500/10 border border-transparent hover:border-red-500/20',
            'transition-all duration-200',
            collapsed && 'justify-center'
          )}
        >
          <LogOut size={18} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-medium text-sm"
              >
                Déconnexion
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.aside>
  );
}
