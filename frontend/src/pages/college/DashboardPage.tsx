import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { collegeService, collegeScheduleActions, type CollegeProfile, type CollegeAnalytics, type CollegeSchedule } from '../../services/collegeService';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Users, Brain, TrendingUp, BarChart3, Loader2, ChevronRight, CheckCircle, AlertCircle, Settings, Calendar, Building2, Clock, ThumbsUp, ThumbsDown, Star, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export function CollegeDashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CollegeProfile | null>(null);
  const [analytics, setAnalytics] = useState<CollegeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [schedules, setSchedules] = useState<CollegeSchedule[]>([]);
  const [activities, setActivities] = useState<Array<{ id: number; event_type: string; actor_name: string; description: string; created_at: string }>>([]);
  const [collegeName, setCollegeName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    collegeService.getProfile().then((p) => {
      setProfile(p);
      if (!p.college_name) {
        setNeedsSetup(true);
      } else {
        return Promise.all([
          collegeService.getAnalytics().then(setAnalytics),
          collegeService.getSchedules().then((s) => setSchedules(s.slice(0, 10))).catch(() => {}),
          collegeService.getActivity().then((a) => setActivities(a.slice(0, 10))).catch(() => {}),
        ]);
      }
    }).catch(() => setNeedsSetup(true)).finally(() => setLoading(false));
  }, []);

  const handleSetup = async () => {
    if (!collegeName.trim()) return;
    setSaving(true);
    try {
      await collegeService.updateProfile(collegeName.trim());
      const p = await collegeService.getProfile();
      setProfile(p);
      const a = await collegeService.getAnalytics();
      setAnalytics(a);
      setNeedsSetup(false);
    } catch { /* error */ } finally { setSaving(false); }
  };

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  if (needsSetup) {
    return (
      <PageWrapper className="p-0">
        <GlassCard className="bg-white border-gray-100 max-w-lg mx-auto mt-12 text-center">
          <GraduationCap className="text-emerald-500 mx-auto mb-4" size={48} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome, Placement Officer</h1>
          <p className="text-gray-500 text-sm mb-6">Set your college name to get started. This will scope your view to students from your college.</p>
          <div className="max-w-sm mx-auto space-y-4">
            <AnimatedInput
              label="College Name"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              placeholder="e.g. IIT Madras, NIT Trichy"
              required
            />
            <GradientButton onClick={() => void handleSetup()} disabled={saving || !collegeName.trim()} className="w-full">
              {saving ? <Loader2 className="animate-spin" size={16} /> : 'Set College & Continue'}
            </GradientButton>
          </div>
        </GlassCard>
      </PageWrapper>
    );
  }

  const rs = analytics?.readiness_summary;

  return (
    <PageWrapper className="p-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">College Dashboard</h1>
        <p className="text-gray-500 mt-1">
          {profile?.college_name} &middot; Welcome, {user?.full_name ?? 'Placement Officer'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Candidates', value: analytics?.total_students ?? 0, icon: <Users className="text-emerald-500" size={20} />, color: 'bg-emerald-50', link: '/college/students' },
          { label: 'Interviews', value: analytics?.total_interviews ?? 0, icon: <Brain className="text-blue-500" size={20} />, color: 'bg-blue-50', link: '/college/analytics' },
          { label: 'Avg Score', value: `${analytics?.avg_score?.toFixed(1) ?? '0'}/10`, icon: <BarChart3 className="text-orange-500" size={20} />, color: 'bg-orange-50', link: '/college/analytics' },
          { label: 'Placement Rate', value: `${analytics?.placement_rate?.toFixed(0) ?? 0}%`, icon: <TrendingUp className="text-green-500" size={20} />, color: 'bg-green-50', link: '/college/placements' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Link to={stat.link}>
              <GlassCard className="bg-white border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Readiness summary */}
        <GlassCard className="bg-white border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Readiness Overview</h2>
            <Link to="/college/placements" className="text-xs text-emerald-600 hover:underline flex items-center gap-0.5">
              Details <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="flex items-center gap-2 text-sm text-green-700"><CheckCircle size={16} /> Placement Ready</span>
              <span className="text-xl font-bold text-green-700">{rs?.ready ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="flex items-center gap-2 text-sm text-yellow-700"><AlertCircle size={16} /> Almost There</span>
              <span className="text-xl font-bold text-yellow-700">{rs?.maybe ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={16} /> Needs Improvement</span>
              <span className="text-xl font-bold text-red-600">{rs?.not_ready ?? 0}</span>
            </div>
          </div>
        </GlassCard>

        {/* Quick actions */}
        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/college/students" className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors">
              <Users size={16} className="text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Student Roster</span>
            </Link>
            <Link to="/college/analytics" className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
              <BarChart3 size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Analytics</span>
            </Link>
            <Link to="/college/placements" className="flex items-center gap-2 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
              <TrendingUp size={16} className="text-green-600" />
              <span className="text-sm font-medium text-green-700">Placements</span>
            </Link>
            <button
              onClick={() => setNeedsSetup(true)}
              className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
            >
              <Settings size={16} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Change College</span>
            </button>
          </div>
        </GlassCard>
      </div>

      {/* Upcoming Company Interviews */}
      {schedules.length > 0 && (
        <GlassCard className="bg-white border-gray-100 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-500" /> Company Interview Schedules
            </h2>
          </div>
          <div className="space-y-3">
            {schedules.map((s) => {
              const statusColor: Record<string, string> = {
                scheduled: 'bg-blue-100 text-blue-700',
                rescheduled: 'bg-yellow-100 text-yellow-700',
                completed: 'bg-green-100 text-green-700',
                cancelled: 'bg-red-100 text-red-700',
              };
              const approvalColor: Record<string, string> = {
                pending: 'bg-amber-100 text-amber-700',
                approved: 'bg-green-100 text-green-700',
                declined: 'bg-red-100 text-red-700',
              };
              const isPending = s.college_approval === 'pending';
              return (
                <div key={s.id} className={`rounded-lg px-4 py-3 ${isPending ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPending ? 'bg-amber-100' : 'bg-indigo-100'}`}>
                        <Calendar size={14} className={isPending ? 'text-amber-600' : 'text-indigo-600'} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.student_name || s.candidate_name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Building2 size={10} /> {s.company_name}</span>
                          {s.interview_type && <span className="capitalize">{s.interview_type.replace('_', ' ')}</span>}
                          {s.scheduled_at && (
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(s.scheduled_at).toLocaleDateString()} {new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusColor[s.status] ?? 'bg-gray-100'}`}>
                        {s.status}
                      </span>
                      {s.college_approval !== 'not_required' && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${approvalColor[s.college_approval] ?? 'bg-gray-100'}`}>
                          {s.college_approval}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Approval actions */}
                  {isPending && (
                    <div className="flex items-center gap-2 mt-2 ml-11">
                      <button
                        onClick={async () => {
                          await collegeScheduleActions.approve(s.id);
                          setSchedules((prev) => prev.map((sc) => sc.id === s.id ? { ...sc, college_approval: 'approved' } : sc));
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700"
                      >
                        <ThumbsUp size={12} /> Approve
                      </button>
                      <button
                        onClick={async () => {
                          const reason = prompt('Reason for declining (optional):');
                          await collegeScheduleActions.decline(s.id, reason ?? '');
                          setSchedules((prev) => prev.map((sc) => sc.id === s.id ? { ...sc, college_approval: 'declined' } : sc));
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-lg hover:bg-red-200"
                      >
                        <ThumbsDown size={12} /> Decline
                      </button>
                    </div>
                  )}

                  {/* Company feedback */}
                  {s.feedback_rating && (
                    <div className="mt-2 ml-11 bg-white rounded-lg p-2 border border-gray-100">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-gray-700">Company Feedback:</span>
                        <span className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: s.feedback_rating }).map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                        </span>
                        {s.feedback_outcome && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                            s.feedback_outcome === 'hire' ? 'bg-green-100 text-green-700' :
                            s.feedback_outcome === 'next_round' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>{s.feedback_outcome.replace('_', ' ')}</span>
                        )}
                      </div>
                      {s.feedback_notes && <p className="text-xs text-gray-500 mt-1">{s.feedback_notes}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
      {/* Activity Feed */}
      {activities.length > 0 && (
        <GlassCard className="bg-white border-gray-100 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-emerald-500" /> Recent Activity
          </h2>
          <div className="space-y-3">
            {activities.map((a) => {
              const eventIcons: Record<string, string> = {
                scheduled: 'bg-blue-100 text-blue-600',
                approved: 'bg-green-100 text-green-600',
                declined: 'bg-red-100 text-red-600',
                feedback: 'bg-amber-100 text-amber-600',
                hired: 'bg-emerald-100 text-emerald-600',
                recommended: 'bg-indigo-100 text-indigo-600',
              };
              return (
                <div key={a.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${eventIcons[a.event_type]?.split(' ')[0] ?? 'bg-gray-200'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{a.description}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                      {a.actor_name && <span>{a.actor_name}</span>}
                      {a.created_at && <span>{new Date(a.created_at).toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </PageWrapper>
  );
}
