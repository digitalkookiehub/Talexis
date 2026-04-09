import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import api from '../../services/api';
import { BookOpen, Clock, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface LearningModuleItem {
  id: number;
  title: string;
  category: string;
  difficulty?: string;
  duration_minutes: number;
  tags?: string[];
}

interface RecommendedResponse {
  weak_areas: string[];
  recommended: LearningModuleItem[];
}

const categoryColors: Record<string, string> = {
  hr: 'bg-blue-100 text-blue-700',
  technical: 'bg-purple-100 text-purple-700',
  communication: 'bg-green-100 text-green-700',
  behavioral: 'bg-orange-100 text-orange-700',
};

export function LearningHubPage() {
  const [modules, setModules] = useState<LearningModuleItem[]>([]);
  const [recommended, setRecommended] = useState<RecommendedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ modules: LearningModuleItem[]; total: number }>('/learning/modules').then((r) => r.data),
      api.get<RecommendedResponse>('/learning/recommended').then((r) => r.data).catch(() => null),
    ]).then(([all, rec]) => {
      setModules(all.modules);
      setRecommended(rec);
    }).finally(() => setLoading(false));
  }, []);

  const handleStart = async (moduleId: number) => {
    setStarting(moduleId);
    try {
      await api.post(`/learning/modules/${moduleId}/start`);
    } catch {
      // already started
    } finally {
      setStarting(null);
    }
  };

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" size={32} /></PageWrapper>;
  }

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg"><BookOpen className="text-orange-600" size={24} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Learning Hub</h1>
          <p className="text-gray-500 text-sm">Improve your weak areas with targeted lessons</p>
        </div>
      </div>

      {/* Recommendations */}
      {recommended && recommended.recommended.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-yellow-500" /> Recommended for You
          </h2>
          {recommended.weak_areas.length > 0 && (
            <p className="text-sm text-gray-500 mb-3">Based on your weak areas: {recommended.weak_areas.join(', ')}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommended.recommended.map((mod, i) => (
              <motion.div key={mod.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <GlassCard className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${categoryColors[mod.category] ?? 'bg-gray-100'}`}>
                    {mod.category}
                  </span>
                  <h3 className="font-semibold text-gray-900 mb-1">{mod.title}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-3"><Clock size={12} /> {mod.duration_minutes} min</p>
                  <Link to={`/student/learn/${mod.id}`}>
                    <GradientButton size="sm" className="w-full" onClick={() => void handleStart(mod.id)} disabled={starting === mod.id}>
                      {starting === mod.id ? <Loader2 className="animate-spin" size={14} /> : 'Start Learning'}
                    </GradientButton>
                  </Link>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* All modules */}
      <h2 className="text-lg font-semibold text-gray-800 mb-3">All Modules</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod, i) => (
          <motion.div key={mod.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Link to={`/student/learn/${mod.id}`}>
              <GlassCard className="bg-white border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[mod.category] ?? 'bg-gray-100'}`}>
                    {mod.category}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12} /> {mod.duration_minutes}m</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{mod.title}</h3>
                {mod.difficulty && <p className="text-xs text-gray-500 capitalize">{mod.difficulty}</p>}
                <ChevronRight size={16} className="text-gray-400 mt-2" />
              </GlassCard>
            </Link>
          </motion.div>
        ))}
      </div>

      {modules.length === 0 && (
        <GlassCard className="bg-white border-gray-100 text-center py-12">
          <BookOpen className="text-gray-300 mx-auto mb-3" size={48} />
          <p className="text-gray-500">No learning modules available yet.</p>
        </GlassCard>
      )}
    </PageWrapper>
  );
}
