import { useState, useEffect, useCallback } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import api from '../../services/api';
import { Activity, Brain, Users, AlertTriangle, Loader2, IndianRupee, Zap, Clock, BarChart3, RefreshCw, Database, Globe, Server, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TokenData { total_tokens: number; total_cost_inr: number; openai_calls: number; ollama_calls: number; by_action: Record<string, { tokens: number; cost: number; count: number }>; top_users: Array<{ user_id: number; name: string; email: string; tokens: number; cost: number; count: number }>; daily: Array<{ date: string; tokens: number; cost: number }> }
interface ActivityData { dau: number; wau: number; mau: number; total_signups: number; signups_by_source: Record<string, number>; daily_active: Array<{ date: string; count: number }>; recent: Array<{ user_id: number; action: string; detail: string; created_at: string }> }
interface RevenueData { plan_distribution: Record<string, number>; monthly_revenue_inr: Record<string, number>; total_mrr_inr: number; total_paid_users: number; total_free_users: number; free_to_paid_conversion: number; total_demo_requests: number; demo_to_converted: number }
interface HealthData { total_requests: number; avg_response_ms: number; error_count: number; error_rate: number; errors_by_endpoint: Record<string, number>; slowest_endpoints: Array<{ endpoint: string; avg_ms: number; count: number }>; ollama_success: number; openai_fallback: number; interviews_today: number; response_trend: Array<{ hour: string; avg_ms: number; count: number }> }
interface DbData { version: string; database_name: string; size: string; region: string; host: string; table_count: number; total_rows: number; active_connections: number; provider: string; tables: Array<{ name: string; rows: number; size: string }>; error?: string }
interface InterviewCost { interview_id: number; user_id: number; user_name: string; interview_type: string; difficulty: string; questions_answered: number; total_tokens: number; total_cost_inr: number; api_calls: number; created_at: string | null }
interface InterviewTokenDetail { interview_id: number; total_tokens: number; total_cost_inr: number; question_gen_tokens: number; evaluation_tokens: number; summary_tokens: number; breakdown: Array<{ action: string; question_id: number | null; provider: string; model: string; prompt_tokens: number; completion_tokens: number; total_tokens: number; cost_inr: number; created_at: string | null }> }

const RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  question_gen: { label: 'Question Gen', color: 'bg-blue-100 text-blue-700' },
  evaluation: { label: 'Evaluation', color: 'bg-purple-100 text-purple-700' },
  summary: { label: 'Summary', color: 'bg-emerald-100 text-emerald-700' },
  resume_parse: { label: 'Resume Parse', color: 'bg-orange-100 text-orange-700' },
};

function InterviewCostRow({ ic, isExpanded, detail, detailLoading, onToggle }: {
  ic: InterviewCost;
  isExpanded: boolean;
  detail: InterviewTokenDetail | null;
  detailLoading: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
        <td className="px-2 py-2 text-gray-400">
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </td>
        <td className="px-3 py-2 text-gray-800 font-medium">{ic.user_name}</td>
        <td className="px-3 py-2 capitalize text-gray-600">{ic.interview_type}</td>
        <td className="px-3 py-2 capitalize text-gray-600">{ic.difficulty}</td>
        <td className="px-3 py-2 text-right text-gray-600">{ic.questions_answered}</td>
        <td className="px-3 py-2 text-right text-gray-600">{ic.api_calls}</td>
        <td className="px-3 py-2 text-right text-gray-600">{ic.total_tokens.toLocaleString()}</td>
        <td className="px-3 py-2 text-right font-medium text-amber-600">₹{ic.total_cost_inr.toFixed(3)}</td>
        <td className="px-3 py-2 text-right text-gray-400 text-[10px]">{ic.created_at ? new Date(ic.created_at).toLocaleDateString() : ''}</td>
      </tr>
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan={9} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-indigo-50 px-4 py-3 border-t border-indigo-100">
                  {detailLoading ? (
                    <div className="flex items-center gap-2 text-xs text-indigo-600">
                      <Loader2 className="animate-spin" size={14} /> Loading per-question breakdown...
                    </div>
                  ) : detail ? (
                    <>
                      {/* Summary bar */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-gray-600">Question Gen: <strong>{detail.question_gen_tokens.toLocaleString()}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                          <span className="text-gray-600">Evaluation: <strong>{detail.evaluation_tokens.toLocaleString()}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-gray-600">Summary: <strong>{detail.summary_tokens.toLocaleString()}</strong></span>
                        </div>
                        <div className="text-[10px] text-gray-500 ml-auto">
                          Total: <strong>{detail.total_tokens.toLocaleString()}</strong> tokens, <strong className="text-amber-600">₹{detail.total_cost_inr.toFixed(4)}</strong>
                        </div>
                      </div>

                      {/* Token distribution bar */}
                      {detail.total_tokens > 0 && (
                        <div className="flex h-2 rounded-full overflow-hidden mb-3">
                          {detail.question_gen_tokens > 0 && (
                            <div className="bg-blue-400" style={{ width: `${(detail.question_gen_tokens / detail.total_tokens) * 100}%` }} title={`Question Gen: ${detail.question_gen_tokens}`} />
                          )}
                          {detail.evaluation_tokens > 0 && (
                            <div className="bg-purple-400" style={{ width: `${(detail.evaluation_tokens / detail.total_tokens) * 100}%` }} title={`Evaluation: ${detail.evaluation_tokens}`} />
                          )}
                          {detail.summary_tokens > 0 && (
                            <div className="bg-emerald-400" style={{ width: `${(detail.summary_tokens / detail.total_tokens) * 100}%` }} title={`Summary: ${detail.summary_tokens}`} />
                          )}
                        </div>
                      )}

                      {/* Per-call breakdown table */}
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="text-gray-500">
                            <th className="text-left py-1 px-2 font-medium">Action</th>
                            <th className="text-left py-1 px-2 font-medium">Question</th>
                            <th className="text-left py-1 px-2 font-medium">Provider</th>
                            <th className="text-right py-1 px-2 font-medium">Prompt</th>
                            <th className="text-right py-1 px-2 font-medium">Completion</th>
                            <th className="text-right py-1 px-2 font-medium">Total</th>
                            <th className="text-right py-1 px-2 font-medium">Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-indigo-100">
                          {detail.breakdown.map((b, i) => {
                            const actionMeta = ACTION_LABELS[b.action] ?? { label: b.action, color: 'bg-gray-100 text-gray-700' };
                            return (
                              <tr key={i} className="hover:bg-indigo-100/50">
                                <td className="py-1.5 px-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${actionMeta.color}`}>{actionMeta.label}</span>
                                </td>
                                <td className="py-1.5 px-2 text-gray-600">{b.question_id ? `Q#${b.question_id}` : '—'}</td>
                                <td className="py-1.5 px-2">
                                  <span className={`text-[9px] font-medium ${b.provider === 'openai' ? 'text-purple-600' : 'text-emerald-600'}`}>
                                    {b.provider === 'openai' ? 'OpenAI' : 'Ollama'}
                                  </span>
                                  {b.model && <span className="text-gray-400 ml-1">{b.model}</span>}
                                </td>
                                <td className="py-1.5 px-2 text-right text-gray-600">{b.prompt_tokens.toLocaleString()}</td>
                                <td className="py-1.5 px-2 text-right text-gray-600">{b.completion_tokens.toLocaleString()}</td>
                                <td className="py-1.5 px-2 text-right font-medium text-gray-800">{b.total_tokens.toLocaleString()}</td>
                                <td className="py-1.5 px-2 text-right font-medium text-amber-600">{b.cost_inr > 0 ? `₹${b.cost_inr.toFixed(4)}` : '₹0'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500">No token detail available for this interview.</p>
                  )}
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

export function MonitoringPage() {
  const [tokens, setTokens] = useState<TokenData | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [dbInfo, setDbInfo] = useState<DbData | null>(null);
  const [interviewCosts, setInterviewCosts] = useState<InterviewCost[]>([]);
  const [expandedInterview, setExpandedInterview] = useState<number | null>(null);
  const [interviewDetail, setInterviewDetail] = useState<InterviewTokenDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(() => {
    Promise.all([
      api.get<TokenData>(`/admin/monitoring/tokens?days=${range}`).then((r) => r.data).catch(() => null),
      api.get<ActivityData>(`/admin/monitoring/activity?days=${range}`).then((r) => r.data).catch(() => null),
      api.get<RevenueData>('/admin/monitoring/revenue').then((r) => r.data).catch(() => null),
      api.get<HealthData>('/admin/monitoring/health').then((r) => r.data).catch(() => null),
      api.get<DbData>('/admin/monitoring/database').then((r) => r.data).catch(() => null),
      api.get<InterviewCost[]>(`/admin/monitoring/interview-costs?days=${range}`).then((r) => r.data).catch(() => []),
    ]).then(([t, a, r, h, d, ic]) => {
      setTokens(t); setActivity(a); setRevenue(r); setHealth(h); setDbInfo(d as DbData | null);
      setInterviewCosts(ic as InterviewCost[] ?? []);
      setLastRefresh(new Date());
    }).finally(() => setLoading(false));
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  const costAlert = (tokens?.total_cost_inr ?? 0) > 500;
  const errorAlert = (health?.error_rate ?? 0) > 5;

  return (
    <PageWrapper className="p-0">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-lg"><Activity className="text-violet-600" size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Monitoring</h1>
            <p className="text-gray-500 text-sm">
              Last refreshed: {lastRefresh.toLocaleTimeString()} &middot; Auto-refreshes every 60s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Date range selector */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {RANGES.map((r) => (
              <button key={r.days} onClick={() => { setRange(r.days); setLoading(true); }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${range === r.days ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={() => { setLoading(true); fetchData(); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Alert banners */}
      {costAlert && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle size={16} /> AI cost exceeds ₹500 in the selected period. Review token usage.
        </div>
      )}
      {errorAlert && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle size={16} /> Error rate above 5%. Check platform health section.
        </div>
      )}

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {[
          { label: 'AI Cost', value: `₹${tokens?.total_cost_inr?.toFixed(1) ?? '0'}`, icon: <IndianRupee size={14} />, color: costAlert ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700' },
          { label: 'Tokens Used', value: tokens?.total_tokens?.toLocaleString() ?? '0', icon: <Zap size={14} />, color: 'bg-blue-50 text-blue-700' },
          { label: 'OpenAI Calls', value: String(tokens?.openai_calls ?? 0), icon: <Brain size={14} />, color: 'bg-purple-50 text-purple-700' },
          { label: 'Interviews Today', value: String(health?.interviews_today ?? 0), icon: <Brain size={14} />, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'DAU', value: String(activity?.dau ?? 0), icon: <Users size={14} />, color: 'bg-green-50 text-green-700' },
          { label: 'MAU', value: String(activity?.mau ?? 0), icon: <Users size={14} />, color: 'bg-blue-50 text-blue-700' },
          { label: 'MRR', value: `₹${revenue?.total_mrr_inr?.toLocaleString() ?? '0'}`, icon: <IndianRupee size={14} />, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Error Rate', value: `${health?.error_rate?.toFixed(1) ?? '0'}%`, icon: <AlertTriangle size={14} />, color: errorAlert ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <GlassCard className="bg-white border-gray-100 text-center py-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-1 ${s.color}`}>{s.icon}</div>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
              <p className="text-[10px] text-gray-500">{s.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Token Usage */}
        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Brain size={18} className="text-purple-600" /> AI Token Usage ({range}d)</h2>
          {tokens && tokens.daily.length > 0 ? (
            <>
              <div className="flex items-end gap-1 h-24 mb-3">
                {tokens.daily.map((d, i) => {
                  const maxT = Math.max(...tokens.daily.map((x) => x.tokens), 1);
                  return (
                    <div key={d.date} className="flex-1 group relative">
                      <motion.div className="w-full rounded-t bg-gradient-to-t from-purple-500 to-purple-300 min-h-[2px]"
                        initial={{ height: 0 }} animate={{ height: `${(d.tokens / maxT) * 100}%` }} transition={{ duration: 0.3, delay: i * 0.02 }} />
                      <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap z-10">
                        {new Date(d.date).toLocaleDateString()}: {d.tokens.toLocaleString()} tokens, ₹{d.cost}
                      </div>
                    </div>
                  );
                })}
              </div>
              <h3 className="text-xs font-medium text-gray-600 mb-2">By Action</h3>
              <div className="space-y-1">
                {Object.entries(tokens.by_action).map(([action, data]) => (
                  <div key={action} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1.5">
                    <span className="capitalize text-gray-700">{action.replace('_', ' ')}</span>
                    <div className="flex gap-3 text-gray-500">
                      <span>{data.count} calls</span>
                      <span>{data.tokens.toLocaleString()} tokens</span>
                      <span className="font-medium text-amber-600">₹{data.cost.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-gray-400 text-sm">No AI usage tracked yet. Take an interview to see data.</p>}
        </GlassCard>

        {/* User Activity */}
        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Users size={18} className="text-green-600" /> User Activity</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center bg-green-50 rounded-lg p-2">
              <p className="text-2xl font-bold text-green-700">{activity?.dau ?? 0}</p>
              <p className="text-[10px] text-green-600">Daily Active</p>
            </div>
            <div className="text-center bg-blue-50 rounded-lg p-2">
              <p className="text-2xl font-bold text-blue-700">{activity?.wau ?? 0}</p>
              <p className="text-[10px] text-blue-600">Weekly Active</p>
            </div>
            <div className="text-center bg-indigo-50 rounded-lg p-2">
              <p className="text-2xl font-bold text-indigo-700">{activity?.mau ?? 0}</p>
              <p className="text-[10px] text-indigo-600">Monthly Active</p>
            </div>
          </div>
          {activity && activity.daily_active.length > 0 && (
            <div className="flex items-end gap-1 h-20 mb-3">
              {activity.daily_active.map((d, i) => {
                const maxA = Math.max(...activity.daily_active.map((x) => x.count), 1);
                return (
                  <div key={d.date} className="flex-1 group relative">
                    <motion.div className="w-full rounded-t bg-gradient-to-t from-green-500 to-green-300 min-h-[2px]"
                      initial={{ height: 0 }} animate={{ height: `${(d.count / maxA) * 100}%` }} transition={{ duration: 0.3, delay: i * 0.02 }} />
                    <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap z-10">
                      {new Date(d.date).toLocaleDateString()}: {d.count} users
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {activity && Object.keys(activity.signups_by_source).length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-600 mb-2">Signups ({activity.total_signups} total)</h3>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(activity.signups_by_source).map(([src, count]) => (
                  <span key={src} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-[10px] capitalize">{src}: {count}</span>
                ))}
              </div>
            </div>
          )}
        </GlassCard>

        {/* Revenue */}
        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><IndianRupee size={18} className="text-emerald-600" /> Revenue</h2>
          {revenue ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center bg-emerald-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-emerald-700">₹{revenue.total_mrr_inr.toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-600">Monthly Revenue</p>
                </div>
                <div className="text-center bg-blue-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-blue-700">{revenue.free_to_paid_conversion}%</p>
                  <p className="text-[10px] text-blue-600">Free → Paid</p>
                </div>
              </div>
              <h3 className="text-xs font-medium text-gray-600 mb-2">Plan Distribution</h3>
              <div className="space-y-1.5">
                {Object.entries(revenue.plan_distribution).map(([plan, count]) => {
                  const rev = revenue.monthly_revenue_inr[plan] ?? 0;
                  return (
                    <div key={plan} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1.5">
                      <span className="capitalize font-medium text-gray-700">{plan.replace(/_/g, ' ')}</span>
                      <div className="flex gap-3">
                        <span className="text-gray-500">{count} users</span>
                        {rev > 0 && <span className="font-medium text-emerald-600">₹{rev.toLocaleString()}/mo</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs bg-amber-50 rounded-lg px-3 py-2">
                <span className="text-amber-700">Demo Requests</span>
                <span className="text-amber-700">{revenue.total_demo_requests} total, {revenue.demo_to_converted}% converted</span>
              </div>
            </>
          ) : <p className="text-gray-400 text-sm">No revenue data.</p>}
        </GlassCard>

        {/* Platform Health */}
        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Activity size={18} className={errorAlert ? 'text-red-600' : 'text-green-600'} /> Platform Health (24h)</h2>
          {health ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`text-center rounded-lg p-2 ${errorAlert ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className={`text-2xl font-bold ${errorAlert ? 'text-red-700' : 'text-green-700'}`}>{health.error_rate}%</p>
                  <p className="text-[10px] text-gray-600">Error Rate</p>
                </div>
                <div className="text-center bg-blue-50 rounded-lg p-2">
                  <p className={`text-2xl font-bold ${health.avg_response_ms > 2000 ? 'text-amber-700' : 'text-blue-700'}`}>{health.avg_response_ms}ms</p>
                  <p className="text-[10px] text-blue-600">Avg Response</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center bg-emerald-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-emerald-700">{health.ollama_success}</p>
                  <p className="text-[10px] text-emerald-600">Ollama Success</p>
                </div>
                <div className="text-center bg-purple-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-purple-700">{health.openai_fallback}</p>
                  <p className="text-[10px] text-purple-600">OpenAI Fallback</p>
                </div>
              </div>

              {/* Response Time Trend */}
              {health.response_trend && health.response_trend.length > 0 && (
                <div className="mb-3">
                  <h3 className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1"><Clock size={10} /> Response Time Trend</h3>
                  <div className="flex items-end gap-0.5 h-16">
                    {health.response_trend.map((h, i) => {
                      const maxMs = Math.max(...health.response_trend.map((x) => x.avg_ms), 1);
                      const isHigh = h.avg_ms > 2000;
                      return (
                        <div key={i} className="flex-1 group relative">
                          <motion.div className={`w-full rounded-t min-h-[2px] ${isHigh ? 'bg-amber-400' : 'bg-blue-400'}`}
                            initial={{ height: 0 }} animate={{ height: `${(h.avg_ms / maxMs) * 100}%` }} transition={{ duration: 0.2 }} />
                          <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap z-10">
                            {h.avg_ms}ms avg, {h.count} requests
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {health.slowest_endpoints.length > 0 && (
                <>
                  <h3 className="text-xs font-medium text-gray-600 mb-2">Slowest Endpoints</h3>
                  <div className="space-y-1">
                    {health.slowest_endpoints.slice(0, 5).map((ep) => (
                      <div key={ep.endpoint} className="flex items-center justify-between text-[10px] bg-gray-50 rounded px-2 py-1.5">
                        <span className="text-gray-700 font-mono truncate max-w-[200px]">{ep.endpoint}</span>
                        <div className="flex gap-2 text-gray-500">
                          <span className={`flex items-center gap-0.5 ${ep.avg_ms > 2000 ? 'text-amber-600 font-medium' : ''}`}><Clock size={8} /> {ep.avg_ms}ms</span>
                          <span>{ep.count}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : <p className="text-gray-400 text-sm">No health data.</p>}
        </GlassCard>
      </div>

      {/* Database Stats */}
      {dbInfo && (
        <GlassCard className="bg-white border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Database size={18} className="text-blue-600" /> Database</h2>
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${dbInfo.error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              <span className={`w-2 h-2 rounded-full ${dbInfo.error ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
              {dbInfo.error ? 'Offline' : 'Online'}
            </span>
          </div>
          {dbInfo.error ? (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <p className="font-medium">Database connection failed</p>
              <p className="text-xs text-red-500 mt-1">{dbInfo.error}</p>
            </div>
          ) : (
          <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
            <div className="text-center bg-blue-50 rounded-lg p-2.5">
              <Server size={14} className="text-blue-600 mx-auto mb-1" />
              <p className="text-sm font-bold text-blue-700">{dbInfo.provider}</p>
              <p className="text-[10px] text-blue-500">Provider</p>
            </div>
            <div className="text-center bg-emerald-50 rounded-lg p-2.5">
              <Database size={14} className="text-emerald-600 mx-auto mb-1" />
              <p className="text-sm font-bold text-emerald-700">{dbInfo.size}</p>
              <p className="text-[10px] text-emerald-500">Storage Used</p>
            </div>
            <div className="text-center bg-indigo-50 rounded-lg p-2.5">
              <Globe size={14} className="text-indigo-600 mx-auto mb-1" />
              <p className="text-sm font-bold text-indigo-700">{dbInfo.region}</p>
              <p className="text-[10px] text-indigo-500">Region</p>
            </div>
            <div className="text-center bg-orange-50 rounded-lg p-2.5">
              <p className="text-sm font-bold text-orange-700">{dbInfo.table_count}</p>
              <p className="text-[10px] text-orange-500">Tables</p>
            </div>
            <div className="text-center bg-green-50 rounded-lg p-2.5">
              <p className="text-sm font-bold text-green-700">{dbInfo.total_rows.toLocaleString()}</p>
              <p className="text-[10px] text-green-500">Total Rows</p>
            </div>
            <div className="text-center bg-purple-50 rounded-lg p-2.5">
              <p className="text-sm font-bold text-purple-700">{dbInfo.active_connections}</p>
              <p className="text-[10px] text-purple-500">Connections</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <span>Version: <strong className="text-gray-700">{dbInfo.version}</strong></span>
            <span>DB: <strong className="text-gray-700">{dbInfo.database_name}</strong></span>
            <span className="font-mono text-[10px] text-gray-400">{dbInfo.host}</span>
          </div>
          {dbInfo.tables.length > 0 && (
            <details>
              <summary className="text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-800">Table Details ({dbInfo.tables.length} tables)</summary>
              <div className="mt-2 max-h-[200px] overflow-y-auto">
                <table className="w-full text-[10px]">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1 font-medium text-gray-500">Table</th>
                      <th className="text-right px-2 py-1 font-medium text-gray-500">Rows</th>
                      <th className="text-right px-2 py-1 font-medium text-gray-500">Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dbInfo.tables.map((t) => (
                      <tr key={t.name} className="hover:bg-gray-50">
                        <td className="px-2 py-1 font-mono text-gray-700">{t.name}</td>
                        <td className="px-2 py-1 text-right text-gray-600">{t.rows.toLocaleString()}</td>
                        <td className="px-2 py-1 text-right text-gray-500">{t.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
          </>
          )}
        </GlassCard>
      )}

      {/* Top Token Consumers with names */}
      {tokens && tokens.top_users.length > 0 && (
        <GlassCard className="bg-white border-gray-100 mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><BarChart3 size={18} className="text-amber-600" /> Top Token Consumers</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">User</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">API Calls</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Tokens</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Cost (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tokens.top_users.map((u) => (
                  <tr key={u.user_id}>
                    <td className="px-3 py-2">
                      <p className="text-gray-800 font-medium">{u.name}</p>
                      <p className="text-[10px] text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">{u.count}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{u.tokens.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-medium text-amber-600">₹{u.cost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Per-Interview Token Costs */}
      {interviewCosts.length > 0 && (
        <GlassCard className="bg-white border-gray-100 mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Brain size={18} className="text-indigo-600" /> Per-Interview Token Cost ({range}d)</h2>
          <p className="text-xs text-gray-500 mb-3">Click any row to see per-question token breakdown.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-6 px-2 py-2"></th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Candidate</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Type</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Difficulty</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Questions</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">API Calls</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Tokens</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Cost (₹)</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {interviewCosts.map((ic) => {
                  const isExpanded = expandedInterview === ic.interview_id;
                  return (
                    <InterviewCostRow
                      key={ic.interview_id}
                      ic={ic}
                      isExpanded={isExpanded}
                      detail={isExpanded ? interviewDetail : null}
                      detailLoading={isExpanded && detailLoading}
                      onToggle={() => {
                        if (isExpanded) {
                          setExpandedInterview(null);
                          setInterviewDetail(null);
                        } else {
                          setExpandedInterview(ic.interview_id);
                          setDetailLoading(true);
                          setInterviewDetail(null);
                          api.get<InterviewTokenDetail>(`/admin/monitoring/interview/${ic.interview_id}/tokens`)
                            .then((r) => setInterviewDetail(r.data))
                            .catch(() => setInterviewDetail(null))
                            .finally(() => setDetailLoading(false));
                        }
                      }}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-[10px] text-gray-400 flex items-center justify-between">
            <span>Showing top 50 interviews by token usage</span>
            <span>Total: {interviewCosts.reduce((s, c) => s + c.total_tokens, 0).toLocaleString()} tokens, ₹{interviewCosts.reduce((s, c) => s + c.total_cost_inr, 0).toFixed(2)}</span>
          </div>
        </GlassCard>
      )}

      {/* Recent Activity Feed */}
      {activity && activity.recent.length > 0 && (
        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Activity size={18} className="text-blue-600" /> Recent Activity</h2>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {activity.recent.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${a.action === 'login' ? 'bg-emerald-400' : a.action === 'signup' ? 'bg-blue-400' : 'bg-gray-400'}`} />
                  <span className="text-gray-800">User #{a.user_id}</span>
                  <span className="font-medium text-gray-700 capitalize">{a.action}</span>
                  {a.detail && <span className="text-gray-400 capitalize">{a.detail}</span>}
                </div>
                <span className="text-[10px] text-gray-400">{a.created_at ? new Date(a.created_at).toLocaleString() : ''}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </PageWrapper>
  );
}
