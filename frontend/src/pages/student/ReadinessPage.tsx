import { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { readinessService, type ReadinessHistoryItem } from '../../services/readinessService';
import type { PlacementReadiness } from '../../types';
import { TrendingUp, Loader2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
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
        <Loader2 className="animate-spin text-purple-500" size={32} />
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
              { label: 'Technical', value: readiness.technical_avg, color: 'text-purple-600' },
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

          {/* History */}
          {history.length > 1 && (
            <GlassCard className="bg-white border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-3">Readiness Trend</h3>
              <div className="flex items-end gap-2 h-24">
                {history.slice(0, 10).reverse().map((h, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-purple-500 to-pink-400 rounded-t"
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
