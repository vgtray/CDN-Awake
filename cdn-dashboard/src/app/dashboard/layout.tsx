'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { useAuthStore } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, loadSession } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadSession();
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 relative overflow-hidden">
        {/* Background grain */}
        <div className="grain" />
        
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent rounded-full blur-3xl animate-float" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-violet-500/10 via-transparent to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
        </div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex flex-col items-center gap-4"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 rounded-2xl border-2 border-indigo-500/30 border-t-indigo-500 flex items-center justify-center"
            >
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </motion.div>
            <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-xl" />
          </div>
          <p className="text-zinc-500 text-sm font-medium">Chargement...</p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 relative">
      {/* Background grain texture */}
      <div className="grain" />
      
      {/* Subtle background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>
      
      <Sidebar />
      
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'transition-all duration-300',
            'ml-64 min-h-screen relative z-10'
          )}
        >
          <div className="p-8">
            {children}
          </div>
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
