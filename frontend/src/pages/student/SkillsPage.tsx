import { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { studentService } from '../../services/studentService';
import { readinessService } from '../../services/readinessService';
import type { PlacementReadiness } from '../../types';
import { Award, Loader2, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface SkillItem {
  id: number;
  skill_name: string;
  score: number;
  assessment_type: string | null;
}

export function SkillsPage() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [readiness, setReadiness] = useState<PlacementReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    Promise.all([
      studentService.getSkills().catch(() => []),
      readinessService.get().catch(() => null),
    ]).then(([s, r]) => {
      setSkills(s as SkillItem[]);
      setReadiness(r);
    }).finally(() => setLoading(false));
  }, []);

  const handleRecalculate = async () => {
    setCalculating(true);
    try {
      const r = await readinessService.calculate();
      setReadiness(r);
    } catch {
      // No evaluated interviews yet
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  // Build dimension data from readiness
  const dimensions = readiness ? [
    { name: 'Communication', score: readiness.communication_avg, color: 'from-blue-400 to-blue-600' },
    { name: 'Technical', score: readiness.technical_avg, color: 'from-emerald-400 to-emerald-600' },
    { name: 'Confidence', score: readiness.confidence_avg, color: 'from-green-400 to-green-600' },
    { name: 'Structure', score: readiness.structure_avg, color: 'from-orange-400 to-orange-600' },
  ] : [];

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-lg"><Award className="text-yellow-600" size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Skill Assessment</h1>
            <p className="text-gray-500 text-sm">Your evaluated skills from interviews</p>
          </div>
        </div>
        <GradientButton variant="outline" size="sm" onClick={() => void handleRecalculate()} disabled={calculating}>
          {calculating ? <Loader2 className="animate-spin" size={14} /> : <span className="flex items-center gap-1"><RefreshCw size={14} /> Recalculate</span>}
        </GradientButton>
      </div>

      {/* Interview-based dimensions */}
      {dimensions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {dimensions.map((dim, i) => {
            const isStrong = dim.score >= 7;
            const isWeak = dim.score < 5;
            return (
              <motion.div key={dim.name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                <GlassCard className="bg-white border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800">{dim.name}</h3>
                    <div className="flex items-center gap-1">
                      {isStrong && <TrendingUp size={14} className="text-green-500" />}
                      {isWeak && <TrendingDown size={14} className="text-red-500" />}
                      <span className={`text-lg font-bold ${isStrong ? 'text-green-600' : isWeak ? 'text-red-500' : 'text-gray-900'}`}>
                        {dim.score.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-400">/10</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <motion.div
                      className={`h-3 rounded-full bg-gradient-to-r ${dim.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(dim.score / 10) * 100}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {isStrong ? 'Strong area — keep it up!' : isWeak ? 'Needs improvement — check Learning Hub' : 'Average — room for growth'}
                  </p>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <GlassCard className="bg-white border-gray-100 text-center py-8 mb-8">
          <Award className="text-gray-300 mx-auto mb-3" size={48} />
          <p className="text-gray-500 mb-2">No skill scores yet.</p>
          <p className="text-gray-400 text-sm">Complete and evaluate interviews to see your skill breakdown.</p>
        </GlassCard>
      )}

      {/* Profile skills */}
      {skills.length > 0 && (
        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Assessed Skills</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {skills.map((skill) => (
              <div key={skill.id} className="p-3 bg-gray-50 rounded-xl text-center">
                <p className="text-lg font-bold text-emerald-600">{skill.score.toFixed(1)}</p>
                <p className="text-xs text-gray-600 mt-1">{skill.skill_name}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Weak/Strong areas */}
      {readiness && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {readiness.strong_areas.length > 0 && (
            <GlassCard className="bg-green-50 border-green-200">
              <h3 className="font-semibold text-green-700 text-sm mb-2 flex items-center gap-1"><TrendingUp size={14} /> Strengths</h3>
              <div className="flex gap-2 flex-wrap">
                {readiness.strong_areas.map((a) => (
                  <span key={a} className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs capitalize">{a}</span>
                ))}
              </div>
            </GlassCard>
          )}
          {readiness.weak_areas.length > 0 && (
            <GlassCard className="bg-red-50 border-red-200">
              <h3 className="font-semibold text-red-600 text-sm mb-2 flex items-center gap-1"><TrendingDown size={14} /> Areas to Improve</h3>
              <div className="flex gap-2 flex-wrap">
                {readiness.weak_areas.map((a) => (
                  <span key={a} className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs capitalize">{a}</span>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
