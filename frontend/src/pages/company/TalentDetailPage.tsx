import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { talentService } from '../../services/talentService';
import type { TalentProfile } from '../../types';
import { ArrowLeft, Heart, Loader2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export function TalentDetailPage() {
  const { code } = useParams<{ code: string }>();
  const [talent, setTalent] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [shortlisting, setShortlisting] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);

  useEffect(() => {
    if (code) {
      talentService.getByCode(code).then((data) => {
        setTalent(data);
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
      // May already be shortlisted
    } finally {
      setShortlisting(false);
    }
  };

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" size={32} /></PageWrapper>;
  }

  if (!talent) {
    return <PageWrapper><p className="text-red-500">Candidate not found.</p></PageWrapper>;
  }

  return (
    <PageWrapper className="p-0">
      <Link to="/company/talents" className="flex items-center gap-1 text-purple-600 text-sm mb-4 hover:underline">
        <ArrowLeft size={14} /> Back to Talent Pool
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidate Scorecard</h1>
          <p className="text-gray-400 font-mono text-sm">{talent.candidate_code}</p>
        </div>
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

      <div className="flex items-center gap-2 mb-6 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        <Shield size={14} className="text-green-500" />
        This is an anonymized profile. Raw interview data is never shared.
      </div>

      {/* Recommendation */}
      <GlassCard className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 text-center mb-6">
        <p className="text-sm text-purple-600 font-medium mb-1">AI Recommendation</p>
        <p className="text-3xl font-bold text-gray-900">{talent.recommendation ?? '—'}</p>
      </GlassCard>

      {/* Skill Scores */}
      <GlassCard className="bg-white border-gray-100 mb-6">
        <h2 className="text-lg font-semibold mb-4">Skill Scores</h2>
        <div className="space-y-4">
          {Object.entries(talent.skill_scores).map(([key, val]) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize text-gray-600">{key}</span>
                <span className="font-semibold">{typeof val === 'number' ? val.toFixed(1) : '—'}/10</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <motion.div
                  className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${typeof val === 'number' ? (val / 10) * 100 : 0}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Risk Indicators */}
      {talent.risk_indicators.length > 0 && (
        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold mb-2 text-amber-600">Risk Indicators</h2>
          <ul className="space-y-1">
            {talent.risk_indicators.map((r, i) => (
              <li key={i} className="text-sm text-gray-600">{r}</li>
            ))}
          </ul>
        </GlassCard>
      )}
    </PageWrapper>
  );
}
