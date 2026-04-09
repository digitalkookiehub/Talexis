import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { talentService } from '../../services/talentService';
import type { TalentProfile } from '../../types';
import { Users, Heart, Loader2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const recBadge: Record<string, { label: string; color: string }> = {
  YES: { label: 'Recommended', color: 'bg-green-100 text-green-700' },
  MAYBE: { label: 'Potential', color: 'bg-yellow-100 text-yellow-700' },
  NO: { label: 'Needs Growth', color: 'bg-gray-100 text-gray-600' },
};

export function TalentBrowsePage() {
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shortlisting, setShortlisting] = useState<string | null>(null);

  useEffect(() => {
    talentService.browse(0, 50).then((data) => {
      setTalents(data.talents);
      setTotal(data.total);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleShortlist = async (code: string) => {
    setShortlisting(code);
    try {
      await talentService.shortlist(code);
      // Visual feedback
    } catch {
      // Already shortlisted or error
    } finally {
      setShortlisting(null);
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
          <div className="p-2 bg-purple-100 rounded-lg">
            <Users className="text-purple-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Talent Pool</h1>
            <p className="text-gray-500 text-sm">{total} pre-qualified candidates</p>
          </div>
        </div>
      </div>

      {talents.length === 0 ? (
        <GlassCard className="bg-white border-gray-100 text-center py-12">
          <Users className="text-gray-300 mx-auto mb-3" size={48} />
          <p className="text-gray-500">No candidates available yet. Students need to complete interviews and grant consent.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {talents.map((talent, i) => (
            <motion.div key={talent.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard className="bg-white border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-gray-400">{talent.candidate_code}</span>
                  {talent.recommendation && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${recBadge[talent.recommendation]?.color ?? ''}`}>
                      {recBadge[talent.recommendation]?.label}
                    </span>
                  )}
                </div>

                {/* Scores */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {Object.entries(talent.skill_scores).map(([key, val]) => (
                    <div key={key} className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-gray-900">{typeof val === 'number' ? val.toFixed(1) : '—'}</p>
                      <p className="text-xs text-gray-500 capitalize">{key}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Link to={`/company/talents/${talent.candidate_code}`} className="flex-1">
                    <GradientButton variant="outline" size="sm" className="w-full">
                      <span className="flex items-center gap-1">View <ChevronRight size={14} /></span>
                    </GradientButton>
                  </Link>
                  <GradientButton
                    size="sm"
                    onClick={() => void handleShortlist(talent.candidate_code)}
                    disabled={shortlisting === talent.candidate_code}
                  >
                    {shortlisting === talent.candidate_code ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <Heart size={14} />
                    )}
                  </GradientButton>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
