import { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import api from '../../services/api';
import { ShieldAlert, Loader2, AlertTriangle, User, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AntiCheatReport {
  total_flags: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
}

interface FlagDetail {
  id: number;
  type: string;
  severity: string;
  details: Record<string, unknown>;
  flagged_at: string;
}

interface FlaggedInterview {
  interview_id: number;
  interview_type: string;
  student_name: string | null;
  student_email: string | null;
  total_score: number | null;
  date: string | null;
  flags: FlagDetail[];
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
  const [flagged, setFlagged] = useState<FlaggedInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<AntiCheatReport>('/anticheat/report').then((r) => r.data),
      api.get<FlaggedInterview[]>('/anticheat/report/flagged').then((r) => r.data).catch(() => []),
    ]).then(([r, f]) => {
      setReport(r);
      setFlagged(f);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
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
            <p className={`text-sm font-medium ${report.total_flags > 0 ? 'text-red-600' : 'text-green-600'}`}>Total Flags</p>
            <p className="text-4xl font-bold text-gray-900 mt-1">{report.total_flags}</p>
            <p className="text-xs text-gray-500 mt-1">
              {report.total_flags === 0 ? 'No suspicious activity detected' : `${flagged.length} interviews flagged`}
            </p>
          </div>
          <AlertTriangle className={report.total_flags > 0 ? 'text-red-400' : 'text-green-400'} size={48} />
        </div>
      </GlassCard>

      {/* By type + severity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
          <div className="space-y-3">
            {(['high', 'medium', 'low'] as const).map((sev) => {
              const count = report.by_severity[sev] ?? 0;
              return (
                <div key={sev} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${severityColors[sev]}`}>{sev}</span>
                  <span className="text-2xl font-bold text-gray-900">{count}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Flagged Interviews Drill-Down */}
      {flagged.length > 0 && (
        <GlassCard className="bg-white border-gray-100 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Flagged Interviews</h2>
          <div className="space-y-2">
            {flagged.map((item) => {
              const isOpen = expanded === item.interview_id;
              const highCount = item.flags.filter((f) => f.severity === 'high').length;
              return (
                <div key={item.interview_id} className="border border-gray-100 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : item.interview_id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${highCount > 0 ? 'bg-red-100' : 'bg-yellow-100'}`}>
                        <AlertTriangle size={14} className={highCount > 0 ? 'text-red-600' : 'text-yellow-600'} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 capitalize">{item.interview_type} Interview</span>
                          <span className="text-[10px] text-gray-400">#{item.interview_id}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {item.student_name && (
                            <span className="flex items-center gap-1"><User size={10} /> {item.student_name}</span>
                          )}
                          {item.date && <span>{new Date(item.date).toLocaleDateString()}</span>}
                          {item.total_score != null && <span>Score: {item.total_score.toFixed(1)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{item.flags.length} flag{item.flags.length !== 1 ? 's' : ''}</span>
                      {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 space-y-2 border-t border-gray-100 pt-3">
                          {item.flags.map((flag) => (
                            <div key={flag.id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${severityColors[flag.severity] ?? ''}`}>
                                  {flag.severity}
                                </span>
                                <span className="text-xs font-medium text-gray-700">{typeLabels[flag.type] ?? flag.type}</span>
                                <span className="text-[10px] text-gray-400 ml-auto">{new Date(flag.flagged_at).toLocaleString()}</span>
                              </div>
                              {flag.details && (
                                <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                                  {Object.entries(flag.details).map(([k, v]) => (
                                    <p key={k}><span className="font-medium text-gray-500">{k}:</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      <GlassCard className="bg-blue-50 border-blue-200">
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
