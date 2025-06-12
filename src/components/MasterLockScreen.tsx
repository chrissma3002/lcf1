import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface MasterLockScreenProps {
  onUnlock: () => void;
}

const MasterLockScreen: React.FC<MasterLockScreenProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'whyareyougay') {
      onUnlock();
      toast.success('Access granted');
    } else {
      setIsShaking(true);
      toast.error('Invalid master key');
      setTimeout(() => setIsShaking(false), 500);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-6"
          >
            <TrendingUp className="w-10 h-10 text-white" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-3xl font-bold text-white mb-2"
          >
            Laxmi Chit Fund
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-slate-400"
          >
            Secure Trading Analytics Platform
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className={`bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700 ${
            isShaking ? 'animate-pulse' : ''
          }`}
        >
          <div className="text-center mb-6">
            <Lock className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-white mb-2">Master Key Required</h2>
            <p className="text-slate-400 text-sm">Enter your master key to access the platform</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter master key"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                autoFocus
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
              Unlock Platform
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default MasterLockScreen;