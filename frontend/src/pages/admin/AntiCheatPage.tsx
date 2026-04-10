import { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import api from '../../services/api';
import { ShieldAlert, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface AntiCheatReport {
  total_flags: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
}

const severityColors: Record<string, string> = {
  low: 'bg-yellow-100 text-yellow-700',
  medium: 'bg-orange-100 text-orange-700',
  high: 'bg-red-100 text-red-700',
};

const typeLabels: Record<string, string> = {
  similarity: 'Answer Similarity',
  pattern: 'Repeated Patterns',
  attempt_limit: 'Attempt Limit',
};

export function AntiCheatPage() {
  const [report, setReport] = useState<AntiCheatReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AntiCheatReport>('/anticheat/report')
      .then((r) => setReport(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" size={32} /></PageWrapper>;
  }

  if (!report) {
    return <PageWrapper><p className="text-red-500">Failed to load report.</p></PageWrapper>;
  }

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-100 rounded-lg"><ShieldAlert className="text-red-600" size={24} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Anti-Cheat Report</h1>
          <p className="text-gray-500 text-sm">Platform-wide cheating detection metrics</p>
        </div>
      </div>

      {/* Total flags */}
      <GlassCard className={`mb-6 ${report.total_flags > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${report.total_flags > 0 ? 'text-red-600' : 'text-green-600'}`}>
              Total Flags
            </p>
            <p className="text-4xl font-bold text-gray-900 mt-1">{report.total_flags}</p>
            <p className="text-xs text-gray-500 mt-1">
              {report.total_flags === 0 ? 'No suspicious activity detected' : 'Review flagged interviews below'}
            </p>
          </div>
          <AlertTriangle className={report.total_flags > 0 ? 'text-red-400' : 'text-green-400'} size={48} />
        </div>
      </GlassCard>

      {/* By type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Flags by Type</h2>
          {Object.keys(report.by_type).length === 0 ? (
            <p className="text-gray-400 text-sm">No flags recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(report.by_type).map(([type, count]) => {
                const max = Math.max(...Object.values(report.by_type), 1);
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{typeLabels[type] ?? type}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <motion.div
                        className="h-3 rounded-full bg-gradient-to-r from-red-400 to-orange-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / max) * 100}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Flags by Severity</h2>
          {Object.keys(report.by_severity).length === 0 ? (
            <p className="text-gray-400 text-sm">No flags recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {(['high', 'medium', 'low'] as const).map((sev) => {
                const count = report.by_severity[sev] ?? 0;
                return (
                  <div key={sev} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${severityColors[sev]}`}>
                      {sev}
                    </span>
                    <span className="text-2xl font-bold text-gray-900">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard className="bg-blue-50 border-blue-200 mt-6">
        <h3 className="text-sm font-semibold text-blue-700 mb-2">How Anti-Cheat Works</h3>
        <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
          <li>Automatically runs after every interview evaluation</li>
          <li>Detects answer similarity (75%+ threshold)</li>
          <li>Detects repeated patterns (uniform lengths, internal repetition, very short answers)</li>
          <li>Limits attempts to 5 per interview type per student</li>
        </ul>
      </GlassCard>
    </PageWrapper>
  );
}
