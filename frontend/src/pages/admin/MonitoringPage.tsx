import { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import api from '../../services/api';
import { Activity, Brain, Users, AlertTriangle, Loader2, IndianRupee, Zap, Clock, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface TokenData { total_tokens: number; total_cost_inr: number; openai_calls: number; ollama_calls: number; by_action: Record<string, { tokens: number; cost: number; count: number }>; top_users: Array<{ user_id: number; tokens: number; cost: number; count: number }>; daily: Array<{ date: string; tokens: number; cost: number }> }
interface ActivityData { dau: number; wau: number; mau: number; signups_by_source: Record<string, number>; daily_active: Array<{ date: string; count: number }>; recent: Array<{ user_id: number; action: string; detail: string; created_at: string }> }
interface RevenueData { plan_distribution: Record<string, number>; monthly_revenue_inr: Record<string, number>; total_mrr_inr: number; total_paid_users: number; total_free_users: number; free_to_paid_conversion: number; total_demo_requests: number; demo_to_converted: number }
interface HealthData { total_requests: number; avg_response_ms: number; error_count: number; error_rate: number; errors_by_endpoint: Record<string, number>; slowest_endpoints: Array<{ endpoint: string; avg_ms: number; count: number }>; ollama_success: number; openai_fallback: number }

export function MonitoringPage() {
  const [tokens, setTokens] = useState<TokenData | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<TokenData>('/admin/monitoring/tokens').then((r) => r.data).catch(() => null),
      api.get<ActivityData>('/admin/monitoring/activity').then((r) => r.data).catch(() => null),
      api.get<RevenueData>('/admin/monitoring/revenue').then((r) => r.data).catch(() => null),
      api.get<HealthData>('/admin/monitoring/health').then((r) => r.data).catch(() => null),
    ]).then(([t, a, r, h]) => {
      setTokens(t); setActivity(a); setRevenue(r); setHealth(h);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-violet-100 rounded-lg"><Activity className="text-violet-600" size={24} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Monitoring</h1>
          <p className="text-gray-500 text-sm">Token usage, user activity, revenue, and platform health</p>
        </div>
      </div>

      {/* ===== Top Stats Row ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {[
          { label: 'AI Cost', value: `₹${tokens?.total_cost_inr?.toFixed(1) ?? '0'}`, icon: <IndianRupee size={14} />, color: 'bg-amber-50 text-amber-700' },
          { label: 'Tokens Used', value: tokens?.total_tokens?.toLocaleString() ?? '0', icon: <Zap size={14} />, color: 'bg-blue-50 text-blue-700' },
          { label: 'OpenAI Calls', value: String(tokens?.openai_calls ?? 0), icon: <Brain size={14} />, color: 'bg-purple-50 text-purple-700' },
          { label: 'Ollama Calls', value: String(tokens?.ollama_calls ?? 0), icon: <Brain size={14} />, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'DAU', value: String(activity?.dau ?? 0), icon: <Users size={14} />, color: 'bg-green-50 text-green-700' },
          { label: 'MAU', value: String(activity?.mau ?? 0), icon: <Users size={14} />, color: 'bg-blue-50 text-blue-700' },
          { label: 'MRR', value: `₹${revenue?.total_mrr_inr?.toLocaleString() ?? '0'}`, icon: <IndianRupee size={14} />, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Error Rate', value: `${health?.error_rate?.toFixed(1) ?? '0'}%`, icon: <AlertTriangle size={14} />, color: health && health.error_rate > 5 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard className="bg-white border-gray-100 text-center py-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-1 ${s.color}`}>{s.icon}</div>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
              <p className="text-[10px] text-gray-500">{s.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* ===== Token Usage ===== */}
        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Brain size={18} className="text-purple-600" /> AI Token Usage (30 days)</h2>
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
                        {d.date}: {d.tokens.toLocaleString()} tokens, ₹{d.cost}
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
          ) : <p className="text-gray-400 text-sm">No AI usage tracked yet.</p>}
        </GlassCard>

        {/* ===== User Activity ===== */}
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
                      {d.date}: {d.count} users
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {activity && Object.keys(activity.signups_by_source).length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-600 mb-2">Signups by Role</h3>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(activity.signups_by_source).map(([src, count]) => (
                  <span key={src} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-[10px] capitalize">{src}: {count}</span>
                ))}
              </div>
            </div>
          )}
        </GlassCard>

        {/* ===== Revenue ===== */}
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
                      <span className="capitalize font-medium text-gray-700">{plan.replace('_', ' ')}</span>
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

        {/* ===== Platform Health ===== */}
        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Activity size={18} className="text-red-600" /> Platform Health (24h)</h2>
          {health ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`text-center rounded-lg p-2 ${health.error_rate > 5 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className={`text-2xl font-bold ${health.error_rate > 5 ? 'text-red-700' : 'text-green-700'}`}>{health.error_rate}%</p>
                  <p className="text-[10px] text-gray-600">Error Rate</p>
                </div>
                <div className="text-center bg-blue-50 rounded-lg p-2">
                  <p className="text-2xl font-bold text-blue-700">{health.avg_response_ms}ms</p>
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
              {health.slowest_endpoints.length > 0 && (
                <>
                  <h3 className="text-xs font-medium text-gray-600 mb-2">Slowest Endpoints</h3>
                  <div className="space-y-1">
                    {health.slowest_endpoints.slice(0, 5).map((ep) => (
                      <div key={ep.endpoint} className="flex items-center justify-between text-[10px] bg-gray-50 rounded px-2 py-1.5">
                        <span className="text-gray-700 font-mono truncate max-w-[200px]">{ep.endpoint}</span>
                        <div className="flex gap-2 text-gray-500">
                          <span className="flex items-center gap-0.5"><Clock size={8} /> {ep.avg_ms}ms</span>
                          <span>{ep.count}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {Object.keys(health.errors_by_endpoint).length > 0 && (
                <>
                  <h3 className="text-xs font-medium text-red-600 mt-3 mb-2">Errors by Endpoint</h3>
                  <div className="space-y-1">
                    {Object.entries(health.errors_by_endpoint).slice(0, 5).map(([ep, count]) => (
                      <div key={ep} className="flex items-center justify-between text-[10px] bg-red-50 rounded px-2 py-1.5">
                        <span className="text-red-700 font-mono truncate max-w-[200px]">{ep}</span>
                        <span className="text-red-600 font-medium">{count} errors</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : <p className="text-gray-400 text-sm">No health data.</p>}
        </GlassCard>
      </div>

      {/* ===== Top Token Consumers ===== */}
      {tokens && tokens.top_users.length > 0 && (
        <GlassCard className="bg-white border-gray-100 mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><BarChart3 size={18} className="text-amber-600" /> Top Token Consumers</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">User ID</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">API Calls</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Tokens</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Cost (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tokens.top_users.map((u) => (
                  <tr key={u.user_id}>
                    <td className="px-3 py-2 text-gray-800">User #{u.user_id}</td>
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

      {/* ===== Recent Activity Feed ===== */}
      {activity && activity.recent.length > 0 && (
        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Activity size={18} className="text-blue-600" /> Recent Activity</h2>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {activity.recent.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-gray-800">User #{a.user_id}</span>
                  <span className="font-medium text-gray-700 capitalize">{a.action}</span>
                  {a.detail && <span className="text-gray-400">{a.detail}</span>}
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
