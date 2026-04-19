import { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { useAuth } from '../../context/AuthContext';
import { Users, Heart, Briefcase, BarChart3, Loader2, ChevronRight, Calendar, Clock, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface CompanyStats {
  available_talent_pool: number;
  total_shortlisted: number;
  hired: number;
  shortlisted: number;
}

interface ShortlistItem {
  id: number;
  talent_profile_id: number;
  shortlisted_at: string | null;
  notes: string | null;
  status: string;
}

export function CompanyDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [shortlist, setShortlist] = useState<ShortlistItem[]>([]);
  const [jobCount, setJobCount] = useState(0);
  const [upcomingInterviews, setUpcomingInterviews] = useState<Array<{ id: number; candidate_name: string; scheduled_at: string; interview_type: string | null; status: string }>>([]);
  const [recommendations, setRecommendations] = useState<Array<{ id: number; student_name: string; student_college: string; candidate_code: string | null; recommended_by: string; message: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<CompanyStats>('/analytics/company').then((r) => r.data).catch(() => null),
      api.get<ShortlistItem[]>('/talents/shortlist').then((r) => r.data).catch(() => []),
      api.get<{ id: number }[]>('/jobs').then((r) => r.data).catch(() => []),
      api.get<{ schedules: Array<{ id: number; candidate_name: string; scheduled_at: string; interview_type: string | null; status: string }> }>('/schedules?status=scheduled').then((r) => r.data.schedules).catch(() => []),
      api.get<Array<{ id: number; student_name: string; student_college: string; candidate_code: string | null; recommended_by: string; message: string; created_at: string }>>('/talents/recommendations/received').then((r) => r.data).catch(() => []),
    ]).then(([s, sl, jobs, sched, recs]) => {
      setStats(s);
      setShortlist(sl.slice(0, 5));
      setJobCount(Array.isArray(jobs) ? jobs.length : 0);
      setUpcomingInterviews(sched.slice(0, 5));
      setRecommendations(recs.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  const statCards = [
    { label: 'Available Talent', value: stats?.available_talent_pool ?? 0, icon: <Users className="text-emerald-500" />, color: 'bg-emerald-50', link: '/company/talents' },
    { label: 'Shortlisted', value: stats?.total_shortlisted ?? 0, icon: <Heart className="text-pink-500" />, color: 'bg-pink-50', link: '/company/shortlist' },
    { label: 'Active Jobs', value: jobCount, icon: <Briefcase className="text-blue-500" />, color: 'bg-blue-50', link: '/company/jobs' },
    { label: 'Hired', value: stats?.hired ?? 0, icon: <BarChart3 className="text-green-500" />, color: 'bg-green-50', link: '/company/analytics' },
  ];

  const statusColors: Record<string, string> = {
    shortlisted: 'bg-blue-100 text-blue-700',
    contacted: 'bg-yellow-100 text-yellow-700',
    hired: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <PageWrapper className="p-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Company Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome, {user?.full_name ?? 'Company'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Link key={stat.label} to={stat.link}>
            <GlassCard className="bg-white border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link to="/company/talents">
              <GradientButton className="w-full">Browse Talent Pool</GradientButton>
            </Link>
            <Link to="/company/jobs">
              <GradientButton variant="outline" className="w-full">Post a Job Role</GradientButton>
            </Link>
          </div>
        </GlassCard>

        <GlassCard className="bg-white border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Shortlists</h2>
            {shortlist.length > 0 && (
              <Link to="/company/shortlist" className="text-xs text-emerald-600 hover:underline flex items-center gap-0.5">
                View all <ChevronRight size={12} />
              </Link>
            )}
          </div>
          {shortlist.length === 0 ? (
            <p className="text-gray-500 text-sm">No candidates shortlisted yet. Browse the talent pool to get started.</p>
          ) : (
            <div className="space-y-2">
              {shortlist.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Candidate #{item.talent_profile_id}</p>
                    {item.shortlisted_at && (
                      <p className="text-[10px] text-gray-400">{new Date(item.shortlisted_at).toLocaleDateString()}</p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[item.status] ?? 'bg-gray-100'}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Upcoming Interviews */}
      {upcomingInterviews.length > 0 && (
        <GlassCard className="bg-white border-gray-100 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-500" /> Upcoming Interviews
            </h2>
            <Link to="/company/schedule" className="text-xs text-emerald-600 hover:underline flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingInterviews.map((iv) => (
              <div key={iv.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-3">
                  <Calendar size={14} className="text-indigo-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{iv.candidate_name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      {iv.interview_type && <span className="capitalize">{iv.interview_type.replace('_', ' ')}</span>}
                      <span className="flex items-center gap-0.5">
                        <Clock size={8} />
                        {new Date(iv.scheduled_at).toLocaleDateString()} {new Date(iv.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 capitalize">{iv.status}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
      {/* College Recommendations */}
      {recommendations.length > 0 && (
        <GlassCard className="bg-white border-gray-100 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <GraduationCap size={18} className="text-emerald-500" /> College Recommendations
            </h2>
          </div>
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2.5 border border-emerald-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{rec.student_name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{rec.student_college}</span>
                    <span>&middot;</span>
                    <span>by {rec.recommended_by}</span>
                  </div>
                  {rec.message && <p className="text-xs text-gray-400 mt-0.5">{rec.message}</p>}
                </div>
                {rec.candidate_code && (
                  <Link to={`/company/talents/${rec.candidate_code}`} className="text-xs text-emerald-600 hover:underline flex items-center gap-0.5">
                    View <ChevronRight size={12} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </PageWrapper>
  );
}
