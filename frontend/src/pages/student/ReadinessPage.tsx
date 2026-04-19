import { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { readinessService, type ReadinessHistoryItem } from '../../services/readinessService';
import type { PlacementReadiness } from '../../types';
import { TrendingUp, Loader2, RefreshCw, AlertCircle, CheckCircle, Lightbulb, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const recColors: Record<string, string> = {
  YES: 'bg-green-100 text-green-700',
  MAYBE: 'bg-yellow-100 text-yellow-700',
  NO: 'bg-red-100 text-red-700',
};

export function ReadinessPage() {
  const [readiness, setReadiness] = useState<PlacementReadiness | null>(null);
  const [history, setHistory] = useState<ReadinessHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    Promise.all([
      readinessService.get().catch(() => null),
      readinessService.history().catch(() => []),
    ]).then(([r, h]) => {
      setReadiness(r);
      setHistory(h);
    }).finally(() => setLoading(false));
  }, []);

  const handleRecalculate = async () => {
    setCalculating(true);
    try {
      const r = await readinessService.calculate();
      setReadiness(r);
      const h = await readinessService.history();
      setHistory(h);
    } catch {
      // No interviews yet
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper className="flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <TrendingUp className="text-green-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Placement Readiness</h1>
            <p className="text-gray-500 text-sm">Your interview readiness score</p>
          </div>
        </div>
        <GradientButton variant="outline" size="sm" onClick={() => void handleRecalculate()} disabled={calculating}>
          {calculating ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
        </GradientButton>
      </div>

      {!readiness ? (
        <GlassCard className="bg-white border-gray-100 text-center py-12">
          <AlertCircle className="text-gray-300 mx-auto mb-3" size={48} />
          <p className="text-gray-500 mb-4">No readiness score yet. Complete and evaluate some interviews first.</p>
          <GradientButton onClick={() => void handleRecalculate()} disabled={calculating}>
            {calculating ? 'Calculating...' : 'Calculate Readiness'}
          </GradientButton>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {/* Main score */}
          <GlassCard className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200 text-center">
            <p className="text-sm text-green-600 font-medium mb-1">Overall Readiness</p>
            <p className="text-6xl font-bold text-gray-900">{readiness.overall_readiness_percent.toFixed(0)}%</p>
            {readiness.recommendation && (
              <span className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium ${recColors[readiness.recommendation] ?? ''}`}>
                {readiness.recommendation === 'YES' ? 'Placement Ready' : readiness.recommendation === 'MAYBE' ? 'Almost There' : 'Needs Improvement'}
              </span>
            )}
          </GlassCard>

          {/* Dimension averages */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Communication', value: readiness.communication_avg, color: 'text-blue-600' },
              { label: 'Technical', value: readiness.technical_avg, color: 'text-emerald-600' },
              { label: 'Confidence', value: readiness.confidence_avg, color: 'text-green-600' },
              { label: 'Structure', value: readiness.structure_avg, color: 'text-orange-600' },
            ].map((dim) => (
              <GlassCard key={dim.label} className="bg-white border-gray-100 text-center">
                <p className={`text-2xl font-bold ${dim.color}`}>{dim.value.toFixed(1)}</p>
                <p className="text-xs text-gray-500 mt-1">{dim.label}</p>
              </GlassCard>
            ))}
          </div>

          {/* Weak & Strong areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassCard className="bg-white border-gray-100">
              <h3 className="font-semibold text-red-600 text-sm mb-2 flex items-center gap-1"><AlertCircle size={14} /> Weak Areas</h3>
              {readiness.weak_areas.length > 0 ? (
                <ul className="space-y-1">{readiness.weak_areas.map((a) => <li key={a} className="text-sm text-gray-600 capitalize">{a}</li>)}</ul>
              ) : <p className="text-sm text-gray-400">None detected</p>}
            </GlassCard>
            <GlassCard className="bg-white border-gray-100">
              <h3 className="font-semibold text-green-600 text-sm mb-2 flex items-center gap-1"><CheckCircle size={14} /> Strong Areas</h3>
              {readiness.strong_areas.length > 0 ? (
                <ul className="space-y-1">{readiness.strong_areas.map((a) => <li key={a} className="text-sm text-gray-600 capitalize">{a}</li>)}</ul>
              ) : <p className="text-sm text-gray-400">Complete more interviews to identify</p>}
            </GlassCard>
          </div>

          {/* Action Items */}
          {readiness.weak_areas.length > 0 && (
            <GlassCard className="bg-amber-50 border-amber-200">
              <h3 className="font-semibold text-amber-800 text-sm mb-3 flex items-center gap-1.5">
                <Lightbulb size={16} className="text-amber-500" /> What to Do Next
              </h3>
              <div className="space-y-2">
                {readiness.weak_areas.map((area) => {
                  const suggestions: Record<string, { tip: string; interview: string; learn: string }> = {
                    communication: {
                      tip: 'Practice articulating your thoughts clearly. Use simpler sentences and pause before answering.',
                      interview: 'Take an HR interview to practice communication',
                      learn: 'Try the "Communication Clarity" module',
                    },
                    technical: {
                      tip: 'Review core concepts in your field. Focus on explaining your thought process, not just the answer.',
                      interview: 'Take a Technical interview to sharpen skills',
                      learn: 'Try the "Technical Interview Prep" module',
                    },
                    confidence: {
                      tip: 'Prepare 5 strong stories from your experience. Practice power posing before interviews.',
                      interview: 'Take a Behavioral interview to build confidence',
                      learn: 'Try the "Building Confidence" module',
                    },
                    structure: {
                      tip: 'Use the STAR method (Situation, Task, Action, Result) to organize your answers.',
                      interview: 'Take an HR interview and focus on structure',
                      learn: 'Try the "STAR Method Mastery" module',
                    },
                  };
                  const s = suggestions[area];
                  if (!s) return null;
                  return (
                    <div key={area} className="bg-white/70 rounded-lg p-3 border border-amber-100">
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1 capitalize">{area}</p>
                      <p className="text-sm text-gray-700 mb-2">{s.tip}</p>
                      <div className="flex flex-wrap gap-2">
                        <Link to="/student/interviews" className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full hover:bg-emerald-100">
                          <ArrowRight size={10} /> {s.interview}
                        </Link>
                        <Link to="/student/learn" className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-full hover:bg-blue-100">
                          <ArrowRight size={10} /> {s.learn}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}

          {/* History */}
          {history.length > 1 && (
            <GlassCard className="bg-white border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-3">Readiness Trend</h3>
              <div className="flex items-end gap-2 h-24">
                {history.slice(0, 10).reverse().map((h, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t"
                    initial={{ height: 0 }}
                    animate={{ height: `${h.readiness_percent}%` }}
                    transition={{ delay: i * 0.1 }}
                    title={`${h.readiness_percent.toFixed(0)}%`}
                  />
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
