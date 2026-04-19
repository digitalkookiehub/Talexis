import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import api from '../../services/api';
import { ArrowLeft, BookOpen, Clock, CheckCircle, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';

interface ModuleDetail {
  id: number;
  title: string;
  category: string;
  difficulty: string;
  content_text: string;
  content_url: string | null;
  duration_minutes: number;
  tags: string[];
}

export function LearningModulePage() {
  const { id } = useParams<{ id: string }>();
  const moduleId = parseInt(id ?? '0');
  const [mod, setMod] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    api.get<ModuleDetail>(`/learning/modules/${moduleId}`).then((r) => setMod(r.data)).catch(() => {}).finally(() => setLoading(false));
    // Mark as started
    api.post(`/learning/modules/${moduleId}/start`).catch(() => {});
  }, [moduleId]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await api.post(`/learning/modules/${moduleId}/complete`);
      setCompleted(true);
    } catch {
      // error
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  if (!mod) {
    return <PageWrapper><p className="text-red-500">Module not found.</p></PageWrapper>;
  }

  return (
    <PageWrapper className="p-0 max-w-3xl">
      <Link to="/student/learn" className="flex items-center gap-1 text-emerald-600 text-sm mb-4 hover:underline">
        <ArrowLeft size={14} /> Back to Learning Hub
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg"><BookOpen className="text-orange-600" size={24} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{mod.title}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
            <span className="capitalize">{mod.category}</span>
            <span>&middot;</span>
            <span className="capitalize">{mod.difficulty}</span>
            <span>&middot;</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {mod.duration_minutes} min</span>
          </div>
        </div>
      </div>

      <GlassCard className="bg-white border-gray-100 mb-6">
        <div className="prose prose-sm max-w-none text-gray-700">
          <Markdown>{mod.content_text}</Markdown>
        </div>
      </GlassCard>

      {mod.tags.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {mod.tags.map((tag) => (
            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{tag}</span>
          ))}
        </div>
      )}

      {completed ? (
        <GlassCard className="bg-green-50 border-green-200 text-center py-6">
          <CheckCircle className="text-green-500 mx-auto mb-2" size={32} />
          <p className="font-semibold text-green-700">Module Completed!</p>
          <Link to="/student/learn" className="text-emerald-600 text-sm hover:underline mt-2 inline-block">
            Continue Learning
          </Link>
        </GlassCard>
      ) : (
        <GradientButton onClick={() => void handleComplete()} disabled={completing}>
          {completing ? (
            <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Marking complete...</span>
          ) : (
            <span className="flex items-center gap-2"><CheckCircle size={16} /> Mark as Complete</span>
          )}
        </GradientButton>
      )}
    </PageWrapper>
  );
}
