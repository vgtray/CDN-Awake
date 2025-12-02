'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, User, Lock, Loader2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loadSession } = useAuthStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupData, setSetupData] = useState({
    username: '',
    email: '',
    password: '',
    setupKey: '',
  });

  useEffect(() => {
    loadSession();
    checkSetup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const checkSetup = async () => {
    try {
      const response = await api.checkSetup();
      setNeedsSetup(response.data?.needsSetup || false);
    } catch {
      // Ignore errors
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        toast.success('Connexion réussie!');
        router.push('/dashboard');
      } else {
        toast.error('Identifiants incorrects');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.setup(setupData);
      if (response.success) {
        toast.success('Compte admin créé! Connectez-vous maintenant.');
        setNeedsSetup(false);
      } else {
        toast.error(response.message || 'Erreur lors de la création');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
      {/* Grain texture */}
      <div className="grain" />
      
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          animate={{ 
            x: [0, 30, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-3xl" 
        />
        <motion.div 
          animate={{ 
            x: [0, -30, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-violet-500/10 blur-3xl" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-3xl" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="relative inline-flex items-center justify-center mb-4">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 blur-xl opacity-40" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">CDN Manager</h1>
          <p className="text-zinc-500">
            {needsSetup ? 'Configuration initiale' : 'Connectez-vous pour continuer'}
          </p>
        </motion.div>

        {/* Form Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-8 shadow-2xl shadow-black/20"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-zinc-800/20 to-transparent opacity-50 pointer-events-none" />
          
          {needsSetup ? (
            // Setup Form
            <form onSubmit={handleSetup} className="space-y-5 relative z-10">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Nom d&apos;utilisateur</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="text"
                    value={setupData.username}
                    onChange={(e) => setSetupData({ ...setupData, username: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                    placeholder="admin"
                    required
                    minLength={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Email</label>
                <input
                  type="email"
                  value={setupData.email}
                  onChange={(e) => setSetupData({ ...setupData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Mot de passe</label>
                <input
                  type="password"
                  value={setupData.password}
                  onChange={(e) => setSetupData({ ...setupData, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Clé de configuration</label>
                <input
                  type="password"
                  value={setupData.setupKey}
                  onChange={(e) => setSetupData({ ...setupData, setupKey: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  placeholder="ADMIN_SETUP_KEY"
                  required
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="relative w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 overflow-hidden group"
              >
                <span className="relative z-10">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'Créer le compte admin'
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            </form>
          ) : (
            // Login Form
            <form onSubmit={handleLogin} className="space-y-5 relative z-10">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Nom d&apos;utilisateur</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                    placeholder="Entrez votre nom d'utilisateur"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Mot de passe</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="relative w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 overflow-hidden group"
              >
                <span className="relative z-10">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'Se connecter'
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            </form>
          )}
        </motion.div>

        {/* Footer */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-zinc-600 text-sm mt-6"
        >
          CDN Manager v2.0 • Propulsé par Next.js
        </motion.p>
      </motion.div>
    </div>
  );
}
