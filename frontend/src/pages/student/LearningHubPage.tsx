import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import api from '../../services/api';
import { BookOpen, Clock, ChevronRight, Loader2, Sparkles, Search, CheckCircle, PlayCircle } from 'lucide-react';
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
  technical: 'bg-emerald-100 text-emerald-700',
  communication: 'bg-green-100 text-green-700',
  behavioral: 'bg-orange-100 text-orange-700',
};

export function LearningHubPage() {
  const [modules, setModules] = useState<LearningModuleItem[]>([]);
  const [recommended, setRecommended] = useState<RecommendedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [progress, setProgress] = useState<Record<number, string>>({});

  useEffect(() => {
    Promise.all([
      api.get<{ modules: LearningModuleItem[]; total: number }>('/learning/modules').then((r) => r.data),
      api.get<RecommendedResponse>('/learning/recommended').then((r) => r.data).catch(() => null),
      api.get<{ items: Array<{ module_id: number; status: string }> }>('/learning/progress').then((r) => r.data).catch(() => null),
    ]).then(([all, rec, prog]) => {
      setModules(all.modules);
      setRecommended(rec);
      if (prog?.items) {
        const map: Record<number, string> = {};
        for (const item of prog.items) {
          map[item.module_id] = item.status;
        }
        setProgress(map);
      }
    }).finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(modules.map((m) => m.category));
    return ['all', ...Array.from(cats).sort()];
  }, [modules]);

  const filtered = useMemo(() => {
    let result = modules;
    if (activeCategory !== 'all') {
      result = result.filter((m) => m.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((m) =>
        m.title.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        (m.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [modules, activeCategory, search]);

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
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
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

      {/* Progress summary */}
      {Object.keys(progress).length > 0 && (
        <div className="flex items-center gap-4 mb-4 text-sm">
          <span className="flex items-center gap-1.5 text-green-600">
            <CheckCircle size={14} />
            {Object.values(progress).filter((s) => s === 'completed').length} completed
          </span>
          <span className="flex items-center gap-1.5 text-blue-600">
            <PlayCircle size={14} />
            {Object.values(progress).filter((s) => s === 'in_progress').length} in progress
          </span>
          <span className="text-gray-400">
            {modules.length - Object.keys(progress).length} not started
          </span>
        </div>
      )}

      {/* Search and Filter */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search modules by title or tag..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none transition-colors text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
                activeCategory === cat
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* All modules */}
      <h2 className="text-lg font-semibold text-gray-800 mb-3">
        {activeCategory === 'all' ? 'All Modules' : `${activeCategory} Modules`}
        <span className="text-sm font-normal text-gray-400 ml-2">({filtered.length})</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((mod, i) => (
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
                <div className="flex items-center justify-between mt-2">
                  {mod.difficulty && <p className="text-xs text-gray-500 capitalize">{mod.difficulty}</p>}
                  {progress[mod.id] === 'completed' ? (
                    <span className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full"><CheckCircle size={10} /> Done</span>
                  ) : progress[mod.id] === 'in_progress' ? (
                    <span className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full"><PlayCircle size={10} /> In Progress</span>
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                </div>
              </GlassCard>
            </Link>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <GlassCard className="bg-white border-gray-100 text-center py-12">
          <BookOpen className="text-gray-300 mx-auto mb-3" size={48} />
          <p className="text-gray-500">
            {search || activeCategory !== 'all'
              ? 'No modules match your search.'
              : 'No learning modules available yet.'}
          </p>
        </GlassCard>
      )}
    </PageWrapper>
  );
}
