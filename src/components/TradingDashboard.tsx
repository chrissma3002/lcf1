import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  LogOut, 
  Download, 
  Upload, 
  Activity,
  DollarSign,
  TrendingUp,
  Target,
  BarChart3,
  PieChart,
  Trash2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { tradingService } from '../services/tradingService';
import { TradingSession, Trade, SessionStats } from '../types';
import { calculateSessionStats, formatCurrency, formatPercentage } from '../utils/calculations';
import { exportToJSON, exportToExcel, importFromJSON } from '../utils/exportUtils';
import SessionCard from './Dashboard/SessionCard';
import StatsCard from './Dashboard/StatsCard';
import TradeForm from './Dashboard/TradeForm';
import TradesList from './Dashboard/TradesList';
import EnhancedPerformanceChart from './Dashboard/EnhancedPerformanceChart';
import ChatInterface from './AI/ChatInterface';
import SessionSummaryModal from './Dashboard/SessionSummaryModal';
import toast from 'react-hot-toast';

const TradingDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const [sessions, setSessions] = useState<TradingSession[]>([]);
  const [currentSession, setCurrentSession] = useState<TradingSession | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<SessionStats>({
    totalTrades: 0,
    winRate: 0,
    currentCapital: 0,
    netProfitLoss: 0,
    netProfitLossPercentage: 0,
    totalMarginUsed: 0,
    averageROI: 0,
    winningTrades: 0,
    losingTrades: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionCapital, setNewSessionCapital] = useState('');
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  useEffect(() => {
    if (currentSession) {
      loadTrades();
    }
  }, [currentSession]);

  useEffect(() => {
    if (currentSession) {
      const newStats = calculateSessionStats(trades, currentSession.initial_capital);
      setStats(newStats);
      
      // Update session capital if it differs
      if (newStats.currentCapital !== currentSession.current_capital) {
        updateSessionCapital(newStats.currentCapital);
      }
    }
  }, [trades, currentSession]);

  const loadSessions = async () => {
    try {
      const sessionsData = await tradingService.getSessions(user!.id);
      setSessions(sessionsData);
      if (sessionsData.length > 0 && !currentSession) {
        setCurrentSession(sessionsData[0]);
      }
    } catch (error) {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadTrades = async () => {
    if (!currentSession) return;
    
    try {
      const tradesData = await tradingService.getTrades(currentSession.id);
      setTrades(tradesData);
    } catch (error) {
      toast.error('Failed to load trades');
    }
  };

  const updateSessionCapital = async (newCapital: number) => {
    if (!currentSession) return;
    
    try {
      await tradingService.updateSessionCapital(currentSession.id, newCapital);
      setCurrentSession({ ...currentSession, current_capital: newCapital });
      
      // Update sessions list
      setSessions(sessions.map(session => 
        session.id === currentSession.id 
          ? { ...session, current_capital: newCapital }
          : session
      ));
    } catch (error) {
      console.error('Failed to update session capital:', error);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const newSession = await tradingService.createSession(
        user!.id,
        newSessionName,
        Number(newSessionCapital)
      );
      
      setSessions([newSession, ...sessions]);
      setCurrentSession(newSession);
      setNewSessionName('');
      setNewSessionCapital('');
      setShowNewSessionForm(false);
      
      toast.success('Session created successfully');
    } catch (error) {
      toast.error('Failed to create session');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }
    
    if (!confirm('This will permanently delete all trades in this session. Are you absolutely sure?')) {
      return;
    }
    
    if (!confirm('Final confirmation: This action is irreversible. Delete session?')) {
      return;
    }

    try {
      await tradingService.deleteSession(sessionId);
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(updatedSessions);
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(updatedSessions.length > 0 ? updatedSessions[0] : null);
        setTrades([]);
      }
      
      toast.success('Session deleted successfully');
    } catch (error) {
      toast.error('Failed to delete session');
    }
  };

  const handleAddTrade = async (trade: Omit<Trade, 'id' | 'created_at'>) => {
    try {
      const newTrade = await tradingService.addTrade(trade);
      setTrades([newTrade, ...trades]);
    } catch (error) {
      toast.error('Failed to add trade');
    }
  };

  const handleDeleteTrade = async (tradeId: string) => {
    if (!confirm('Are you sure you want to delete this trade?')) {
      return;
    }

    try {
      await tradingService.deleteTrade(tradeId);
      setTrades(trades.filter(t => t.id !== tradeId));
      toast.success('Trade deleted successfully');
    } catch (error) {
      toast.error('Failed to delete trade');
    }
  };

  const handleExportJSON = () => {
    if (!currentSession) return;
    exportToJSON(currentSession, trades, stats);
    toast.success('Session exported to JSON');
  };

  const handleExportExcel = () => {
    if (!currentSession) return;
    exportToExcel(currentSession, trades, stats);
    toast.success('Session exported to Excel');
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importData = await importFromJSON(file);
      
      // Create new session from imported data
      const newSession = await tradingService.createSession(
        user!.id,
        `${importData.session.name} (Imported)`,
        importData.session.initial_capital
      );

      // Add all trades
      for (const tradeData of importData.trades) {
        await tradingService.addTrade({
          session_id: newSession.id,
          margin: tradeData.margin,
          roi: tradeData.roi,
          entry_side: tradeData.entry_side,
          profit_loss: tradeData.profit_loss,
          comments: tradeData.comments,
        });
      }

      // Refresh sessions
      await loadSessions();
      setCurrentSession(newSession);
      
      toast.success('Session imported successfully');
    } catch (error) {
      toast.error('Failed to import session');
    }

    // Reset file input
    event.target.value = '';
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Failed to sign out');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-blue-600 rounded-full p-2 mr-4">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Laxmi Chit Fund</h1>
                <p className="text-slate-400 text-sm">Analytics Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-slate-300">Welcome, {user?.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Session Controls */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Sessions</h2>
                <button
                  onClick={() => setShowNewSessionForm(true)}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {showNewSessionForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  onSubmit={handleCreateSession}
                  className="mb-4 space-y-3"
                >
                  <input
                    type="text"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    placeholder="Session name"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="number"
                    value={newSessionCapital}
                    onChange={(e) => setNewSessionCapital(e.target.value)}
                    placeholder="Initial capital"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                    required
                  />
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewSessionForm(false)}
                      className="flex-1 bg-slate-600 text-white py-2 rounded-lg text-sm hover:bg-slate-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.form>
              )}

              <div className="space-y-3">
                {sessions.map((session) => {
                  const sessionStats = calculateSessionStats(
                    currentSession?.id === session.id ? trades : [], 
                    session.initial_capital
                  );
                  
                  return (
                    <SessionCard
                      key={session.id}
                      session={session}
                      stats={sessionStats}
                      isActive={currentSession?.id === session.id}
                      onClick={() => setCurrentSession(session)}
                      onDelete={() => handleDeleteSession(session.id)}
                    />
                  );
                })}
              </div>
            </div>

            {/* AI Summary */}
            {currentSession && (
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">AI Insights</h3>
                <button
                  onClick={() => setShowSummaryModal(true)}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Session Summary
                </button>
              </div>
            )}

            {/* Export/Import */}
            {currentSession && (
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Data Management</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleExportJSON}
                    className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export JSON
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="w-full flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Excel
                  </button>
                  <label className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Import JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportJSON}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {currentSession ? (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatsCard
                    title="Total Trades"
                    value={stats.totalTrades.toString()}
                    icon={BarChart3}
                    iconColor="text-blue-400"
                    bgColor="bg-blue-500/10"
                  />
                  <StatsCard
                    title="Win Rate"
                    value={`${stats.winRate.toFixed(1)}%`}
                    change={`${stats.winningTrades}W / ${stats.losingTrades}L`}
                    icon={Target}
                    iconColor="text-green-400"
                    bgColor="bg-green-500/10"
                  />
                  <StatsCard
                    title="Current Capital"
                    value={formatCurrency(stats.currentCapital)}
                    change={formatPercentage(stats.netProfitLossPercentage)}
                    changeColor={stats.netProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}
                    icon={DollarSign}
                    iconColor="text-yellow-400"
                    bgColor="bg-yellow-500/10"
                  />
                  <StatsCard
                    title="Average ROI"
                    value={`${stats.averageROI.toFixed(2)}%`}
                    change={formatCurrency(stats.totalMarginUsed)}
                    icon={TrendingUp}
                    iconColor="text-purple-400"
                    bgColor="bg-purple-500/10"
                  />
                </div>

                {/* Enhanced Charts */}
                <EnhancedPerformanceChart trades={trades} initialCapital={currentSession.initial_capital} />

                {/* Trade Form and List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <TradeForm
                    onAddTrade={handleAddTrade}
                    sessionId={currentSession.id}
                  />
                  <div className="lg:col-span-1">
                    <TradesList
                      trades={trades}
                      onDeleteTrade={handleDeleteTrade}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <PieChart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-400 mb-2">No Trading Session Selected</h3>
                <p className="text-slate-500 mb-6">Create a new session to start tracking your trades</p>
                <button
                  onClick={() => setShowNewSessionForm(true)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create First Session
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Chat Interface */}
      <ChatInterface currentSessionId={currentSession?.id} />

      {/* Session Summary Modal */}
      {currentSession && (
        <SessionSummaryModal
          isOpen={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
          sessionId={currentSession.id}
          sessionName={currentSession.name}
        />
      )}
    </div>
  );
};

export default TradingDashboard;