import React, { useState } from 'react';
import { Sparkles, X, ArrowRight, Search, ShieldCheck } from 'lucide-react';
import { LocalBusinessAssistant, type AssistantAnswer } from '../../services/assistant';
import type { NavigationTab } from '../../types';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);

  if (!isOpen) return null;

  const handleAsk = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await LocalBusinessAssistant.answerQuery(text);
      setAnswer(res);
      setQuery(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Factory Intelligence Assistant</h3>
              <p className="text-[11px] text-slate-400">
                100% Free • Local Calculations • No API Key or Cloud Fee
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-lg p-1 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Search Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(query);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about sales, overdue invoices, profit, stock..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Ask
            </button>
          </form>

          {/* Quick Predefined Questions */}
          {!answer && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Instant Factory Insights:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {LocalBusinessAssistant.getSuggestedQuestions().map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAsk(q)}
                    className="text-left text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200/80 transition cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Answer Display */}
          {answer && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="bg-slate-900 rounded-xl p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                    {answer.category}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Exact Local Calculation</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-100 leading-relaxed">
                  {answer.summary}
                </p>
              </div>

              {/* Breakdown Rows */}
              {answer.details.length > 0 && (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-slate-50/50">
                  {answer.details.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 flex items-start justify-between gap-3 text-xs ${
                        item.highlight ? 'bg-amber-50/70 border-l-4 border-l-amber-500' : ''
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{item.label}</p>
                        {item.secondary && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.secondary}</p>
                        )}
                      </div>
                      <span className="font-bold text-slate-900 shrink-0 text-right">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Button */}
              {answer.actionTab && (
                <div className="pt-2 flex justify-between items-center">
                  <button
                    onClick={() => setAnswer(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    ← Ask another question
                  </button>
                  <button
                    onClick={() => {
                      onNavigate(answer.actionTab as NavigationTab);
                      onClose();
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition cursor-pointer"
                  >
                    <span>View in {answer.actionTab.replace('_', ' ').toUpperCase()}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Privacy & Zero-cost Notice Footer */}
        <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
          <span>Zero external cloud transmission. 100% private.</span>
          <span className="font-mono">Puma Art Printers ERP v1.0</span>
        </div>
      </div>
    </div>
  );
};
