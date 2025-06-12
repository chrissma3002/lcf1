import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calculator } from 'lucide-react';
import { Trade } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import toast from 'react-hot-toast';

interface TradeFormProps {
  onAddTrade: (trade: Omit<Trade, 'id' | 'created_at'>) => void;
  sessionId: string;
}

const TradeForm: React.FC<TradeFormProps> = ({ onAddTrade, sessionId }) => {
  const [margin, setMargin] = useState('');
  const [roiAmount, setRoiAmount] = useState('');
  const [entrySide, setEntrySide] = useState<'Long' | 'Short'>('Long');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  // Calculate ROI percentage from dollar amount
  const roiPercentage = margin && roiAmount ? (Number(roiAmount) / Number(margin)) * 100 : 0;
  const profitLoss = roiAmount ? Number(roiAmount) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!margin || !roiAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const trade: Omit<Trade, 'id' | 'created_at'> = {
        session_id: sessionId,
        margin: Number(margin),
        roi: roiPercentage, // Store calculated percentage for consistency
        entry_side: entrySide,
        profit_loss: profitLoss, // Use the dollar amount directly
        comments: comments.trim() || undefined,
      };

      await onAddTrade(trade);
      
      // Reset form
      setMargin('');
      setRoiAmount('');
      setEntrySide('Long');
      setComments('');
      
      toast.success('Trade added successfully');
    } catch (error) {
      toast.error('Failed to add trade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800 rounded-xl p-6 border border-slate-700"
    >
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
        <Plus className="w-5 h-5 mr-2" />
        Add New Trade
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Margin (USD)
            </label>
            <input
              type="number"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter margin amount"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              ROI Amount (USD)
            </label>
            <input
              type="number"
              value={roiAmount}
              onChange={(e) => setRoiAmount(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter profit/loss amount"
              step="0.01"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Entry Side
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="Long"
                checked={entrySide === 'Long'}
                onChange={(e) => setEntrySide(e.target.value as 'Long' | 'Short')}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-300">Long</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="Short"
                checked={entrySide === 'Short'}
                onChange={(e) => setEntrySide(e.target.value as 'Long' | 'Short')}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-300">Short</span>
            </label>
          </div>
        </div>

        {margin && roiAmount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-700 rounded-lg p-4 border border-slate-600"
          >
            <div className="flex items-center text-slate-300 mb-2">
              <Calculator className="w-4 h-4 mr-2" />
              Calculated Metrics
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">ROI Percentage</p>
                <p className="text-lg font-bold text-blue-400">
                  {roiPercentage.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">P/L Amount</p>
                <p className={`text-lg font-bold ${profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(profitLoss)}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Comments (Optional)
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
            placeholder="Add notes about this trade..."
            rows={3}
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Plus className="w-5 h-5 mr-2" />
              Add Trade
            </>
          )}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default TradeForm;