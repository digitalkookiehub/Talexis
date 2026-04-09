import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { interviewService } from '../../services/interviewService';
import type { Interview } from '../../types';
import { Clock, Brain, ChevronRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-600',
  completed: 'bg-yellow-100 text-yellow-600',
  evaluated: 'bg-green-100 text-green-600',
};

export function InterviewHistoryPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    interviewService.history().then((data) => {
      setInterviews(data.interviews);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageWrapper className="flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Clock className="text-purple-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interview History</h1>
          <p className="text-gray-500 text-sm">{interviews.length} interviews taken</p>
        </div>
      </div>

      {interviews.length === 0 ? (
        <GlassCard className="bg-white border-gray-100 text-center py-12">
          <Brain className="text-gray-300 mx-auto mb-3" size={48} />
          <p className="text-gray-500">No interviews yet. Start your first mock interview!</p>
          <Link to="/student/interviews" className="text-purple-600 text-sm hover:underline mt-2 inline-block">
            Start Interview
          </Link>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {interviews.map((interview, i) => (
            <motion.div
              key={interview.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={
                interview.status === 'in_progress'
                  ? `/student/interviews/${interview.id}`
                  : `/student/interviews/${interview.id}/results`
              }>
                <GlassCard className="bg-white border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Brain className="text-purple-600" size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{interview.interview_type} Interview</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {interview.difficulty_level} &middot; {interview.created_at ? new Date(interview.created_at).toLocaleDateString() : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {interview.total_score !== null && (
                        <span className="text-lg font-bold text-gray-900">{interview.total_score.toFixed(1)}</span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[interview.status] ?? ''}`}>
                        {interview.status.replace('_', ' ')}
                      </span>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
