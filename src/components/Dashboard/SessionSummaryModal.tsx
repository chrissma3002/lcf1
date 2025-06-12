import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Loader2, Sparkles, Save } from 'lucide-react';
import { aiService } from '../../services/aiService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface SessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionName: string;
}

const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  sessionName,
}) => {
  const { user } = useAuth();
  const [summary, setSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateSummary = async () => {
    if (!user) return;

    setIsGenerating(true);
    try {
      const generatedSummary = await aiService.generateSessionSummary(sessionId, user.id);
      setSummary(generatedSummary);
      setHasGenerated(true);
      toast.success('Session summary generated!');
    } catch (error) {
      toast.error('Failed to generate summary');
      console.error('Summary generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveSummary = () => {
    // In a real implementation, you might want to save this to the database
    // For now, we'll just copy to clipboard
    navigator.clipboard.writeText(summary);
    toast.success('Summary copied to clipboard!');
  };

  const handleClose = () => {
    setSummary('');
    setHasGenerated(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div className="flex items-center">
                <div className="bg-purple-600 rounded-full p-2 mr-3">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">AI Session Summary</h2>
                  <p className="text-slate-400 text-sm">{sessionName}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {!hasGenerated ? (
                <div className="text-center py-12">
                  <div className="bg-purple-600 rounded-full p-4 w-16 h-16 mx-auto mb-6">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Generate AI Summary
                  </h3>
                  <p className="text-slate-400 mb-6 max-w-md mx-auto">
                    Get comprehensive insights about your trading session including performance analysis, 
                    patterns, and recommendations for improvement.
                  </p>
                  <button
                    onClick={generateSummary}
                    disabled={isGenerating}
                    className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating Summary...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Summary
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                    <div className="prose prose-invert max-w-none">
                      <div className="text-slate-100 whitespace-pre-wrap leading-relaxed">
                        {summary}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4">
                    <p className="text-slate-400 text-sm">
                      Summary generated by AI • {new Date().toLocaleDateString()}
                    </p>
                    <button
                      onClick={saveSummary}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Copy to Clipboard
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SessionSummaryModal;