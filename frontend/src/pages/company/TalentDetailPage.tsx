import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { talentService, type TalentDetail } from '../../services/talentService';
import { ArrowLeft, Heart, Loader2, Shield, Brain, GraduationCap, Briefcase, TrendingUp, Clock, Award, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

const recColors: Record<string, string> = {
  yes: 'text-green-700 bg-green-100',
  maybe: 'text-yellow-700 bg-yellow-100',
  no: 'text-red-700 bg-red-100',
};

const typeColors: Record<string, string> = {
  hr: 'bg-blue-100 text-blue-700',
  technical: 'bg-emerald-100 text-emerald-700',
  behavioral: 'bg-orange-100 text-orange-700',
  sales: 'bg-pink-100 text-pink-700',
};

const trendBarColors: Record<string, string> = {
  hr: 'from-blue-400 to-blue-600',
  technical: 'from-emerald-400 to-emerald-600',
  behavioral: 'from-orange-400 to-orange-600',
  sales: 'from-pink-400 to-pink-600',
};

export function TalentDetailPage() {
  const { code } = useParams<{ code: string }>();
  const [detail, setDetail] = useState<TalentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [shortlisting, setShortlisting] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      talentService.getDetail(code).then((data) => {
        setDetail(data);
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [code]);

  const handleShortlist = async () => {
    if (!code) return;
    setShortlisting(true);
    try {
      await talentService.shortlist(code);
      setShortlisted(true);
    } catch {
      setShortlisted(true); // already shortlisted
    } finally {
      setShortlisting(false);
    }
  };

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  if (!detail) {
    return <PageWrapper><p className="text-red-500">Candidate not found.</p></PageWrapper>;
  }

  const recKey = (detail.recommendation ?? '').toLowerCase();

  return (
    <PageWrapper className="p-0">
      <Link to="/company/talents" className="flex items-center gap-1 text-emerald-600 text-sm mb-4 hover:underline">
        <ArrowLeft size={14} /> Back to Talent Pool
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidate Scorecard</h1>
          <p className="text-gray-400 font-mono text-sm">{detail.candidate_code}</p>
        </div>
        <div className="flex items-center gap-2">
          <GradientButton
            variant="secondary"
            onClick={() => {
              const params = new URLSearchParams({
                candidate_type: 'platform',
                candidate_name: detail?.candidate_code ?? '',
                talent_profile_id: String(detail?.id ?? ''),
              });
              navigate(`/company/schedule?${params}`);
            }}
          >
            <span className="flex items-center gap-2"><Calendar size={16} /> Schedule Interview</span>
          </GradientButton>
          <GradientButton onClick={() => void handleShortlist()} disabled={shortlisting || shortlisted}>
            {shortlisted ? (
              <span className="flex items-center gap-2"><Heart size={16} className="fill-current" /> Shortlisted</span>
            ) : shortlisting ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <span className="flex items-center gap-2"><Heart size={16} /> Shortlist</span>
            )}
          </GradientButton>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        <Shield size={14} className="text-green-500" />
        Anonymized profile. Name and contact info are never shared.
      </div>

      {/* Top row: Recommendation + Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <GlassCard className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 text-center">
          <p className="text-sm text-emerald-600 font-medium mb-1">AI Recommendation</p>
          <span className={`inline-block px-4 py-1.5 rounded-full text-lg font-bold ${recColors[recKey] ?? 'bg-gray-100 text-gray-600'}`}>
            {detail.recommendation ?? 'Pending'}
          </span>
        </GlassCard>
        <GlassCard className="bg-white border-gray-100 text-center">
          <p className="text-sm text-gray-500 mb-1">Interviews Completed</p>
          <p className="text-3xl font-bold text-gray-900">{detail.total_interviews}</p>
          <div className="flex gap-1 justify-center mt-2 flex-wrap">
            {detail.types_completed.map((t) => (
              <span key={t} className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${typeColors[t] ?? 'bg-gray-100'}`}>{t}</span>
            ))}
          </div>
        </GlassCard>
        <GlassCard className="bg-white border-gray-100 text-center">
          <p className="text-sm text-gray-500 mb-1">Readiness</p>
          {detail.readiness ? (
            <>
              <p className="text-3xl font-bold text-gray-900">{detail.readiness.overall_percent.toFixed(0)}%</p>
              <div className="flex gap-1 justify-center mt-2 flex-wrap">
                {detail.readiness.strong_areas.map((a) => (
                  <span key={a} className="px-2 py-0.5 rounded-full text-[10px] bg-green-100 text-green-700 capitalize">{a}</span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-sm mt-2">Not yet calculated</p>
          )}
        </GlassCard>
      </div>

      {/* Skill Scores */}
      <GlassCard className="bg-white border-gray-100 mb-6">
        <h2 className="text-lg font-semibold mb-4">Skill Scores</h2>
        <div className="space-y-4">
          {Object.entries(detail.skill_scores).map(([key, val]) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize text-gray-600">{key}</span>
                <span className="font-semibold">{typeof val === 'number' ? val.toFixed(1) : '—'}/10</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <motion.div
                  className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${typeof val === 'number' ? (val / 10) * 100 : 0}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </div>
          ))}
        </div>
        {detail.last_updated && (
          <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
            <Clock size={10} /> Last updated: {new Date(detail.last_updated).toLocaleDateString()}
          </p>
        )}
      </GlassCard>

      {/* Score Trend */}
      {detail.score_trend.length > 1 && (
        <GlassCard className="bg-white border-gray-100 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp size={18} /> Score Trend</h2>
          <div className="flex items-end gap-1.5 h-28">
            {detail.score_trend.map((d, i) => {
              const pct = (d.score / 10) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <motion.div
                    className={`w-full rounded-t bg-gradient-to-t ${trendBarColors[d.type] ?? 'from-gray-400 to-gray-600'} min-h-[4px]`}
                    initial={{ height: 0 }}
                    animate={{ height: `${pct}%` }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                  />
                  <span className="text-[8px] text-gray-400">
                    {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                    {d.score.toFixed(1)}/10 ({d.type})
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Resume Skills & Education */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {detail.resume_skills.length > 0 && (
          <GlassCard className="bg-white border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5"><Award size={14} className="text-emerald-500" /> Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {detail.resume_skills.map((s, i) => (
                <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs">{s}</span>
              ))}
            </div>
          </GlassCard>
        )}

        <div className="space-y-4">
          {detail.resume_education.length > 0 && (
            <GlassCard className="bg-white border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5"><GraduationCap size={14} className="text-blue-500" /> Education</h3>
              {detail.resume_education.map((edu, i) => (
                <div key={i} className="text-sm text-gray-600 mb-1">
                  <p className="font-medium">{edu.degree ?? 'Degree not specified'}</p>
                  {edu.institution && <p className="text-xs text-gray-400">{edu.institution}{edu.year ? ` (${edu.year})` : ''}</p>}
                </div>
              ))}
            </GlassCard>
          )}

          {detail.resume_experience_roles.length > 0 && (
            <GlassCard className="bg-white border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5"><Briefcase size={14} className="text-orange-500" /> Experience</h3>
              <div className="space-y-1">
                {detail.resume_experience_roles.map((role, i) => (
                  <p key={i} className="text-sm text-gray-600">{role}</p>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Interview Summaries */}
      {detail.interview_summaries.length > 0 && (
        <GlassCard className="bg-white border-gray-100 mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Brain size={18} className="text-emerald-500" /> Interview Performance</h2>
          <div className="space-y-2">
            {detail.interview_summaries.map((iv, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${typeColors[iv.type] ?? 'bg-gray-100'}`}>{iv.type}</span>
                  <div>
                    <span className="text-xs text-gray-500 capitalize">{iv.difficulty}</span>
                    {iv.target_role && <span className="text-xs text-gray-400 ml-2">for {iv.target_role}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{iv.score?.toFixed(1) ?? '—'}/10</p>
                  {iv.date && <p className="text-[10px] text-gray-400">{new Date(iv.date).toLocaleDateString()}</p>}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Profile Info */}
      {detail.profile && (detail.profile.college_name || detail.profile.branch || detail.profile.graduation_year) && (
        <GlassCard className="bg-white border-gray-100 mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5"><GraduationCap size={14} className="text-indigo-500" /> Profile</h3>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <span>College: <strong>{detail.profile.college_name || 'Independent Candidate'}</strong></span>
            {detail.profile.branch && <span>Branch: <strong>{detail.profile.branch}</strong></span>}
            {detail.profile.department && <span>Dept: <strong>{detail.profile.department}</strong></span>}
            {detail.profile.graduation_year && <span>Grad: <strong>{detail.profile.graduation_year}</strong></span>}
          </div>
          {detail.profile.interests.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {detail.profile.interests.map((int, i) => (
                <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px]">{int}</span>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* Risk Indicators */}
      {detail.risk_indicators.length > 0 && (
        <GlassCard className="bg-amber-50 border-amber-200">
          <h2 className="text-sm font-semibold mb-2 text-amber-700">Risk Indicators</h2>
          <ul className="space-y-1">
            {detail.risk_indicators.map((r, i) => (
              <li key={i} className="text-sm text-gray-600">{r}</li>
            ))}
          </ul>
        </GlassCard>
      )}
    </PageWrapper>
  );
}
