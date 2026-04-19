import { useState, useEffect, useMemo } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import api from '../../services/api';
import { Briefcase, Loader2, Search, Building2, CheckCircle, Send } from 'lucide-react';
import { motion } from 'framer-motion';

interface JobListing {
  id: number;
  title: string;
  description: string | null;
  required_skills: string[];
  min_readiness_score: number | null;
  company_name: string;
  company_industry: string | null;
  already_applied: boolean;
  application_status: string | null;
}

export function JobBoardPage() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [applying, setApplying] = useState<number | null>(null);

  useEffect(() => {
    api.get<JobListing[]>('/jobs/board/active')
      .then((r) => setJobs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return jobs;
    const q = search.toLowerCase();
    return jobs.filter((j) =>
      j.title.toLowerCase().includes(q) ||
      j.company_name.toLowerCase().includes(q) ||
      (j.company_industry ?? '').toLowerCase().includes(q) ||
      j.required_skills.some((s) => s.toLowerCase().includes(q))
    );
  }, [jobs, search]);

  const handleApply = async (jobId: number) => {
    setApplying(jobId);
    try {
      await api.post(`/jobs/board/${jobId}/apply`);
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, already_applied: true, application_status: 'applied' } : j));
    } catch { /* already applied or error */ }
    finally { setApplying(null); }
  };

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg"><Briefcase className="text-indigo-600" size={24} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Board</h1>
          <p className="text-gray-500 text-sm">{jobs.length} active positions from companies</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by job title, company, industry, or skill..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <GlassCard className="bg-white border-gray-100 text-center py-12">
          <Briefcase className="text-gray-300 mx-auto mb-3" size={48} />
          <p className="text-gray-500">{jobs.length === 0 ? 'No active job postings yet. Check back later.' : 'No jobs match your search.'}</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((job, i) => (
            <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <GlassCard className="bg-white border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Building2 size={12} /> {job.company_name}</span>
                      {job.company_industry && <span>&middot; {job.company_industry}</span>}
                      {job.min_readiness_score != null && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px]">Min {job.min_readiness_score}% readiness</span>
                      )}
                    </div>
                    {job.description && <p className="text-sm text-gray-600 mt-2">{job.description}</p>}
                    {job.required_skills.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {job.required_skills.map((s) => (
                          <span key={s} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 ml-4">
                    {job.already_applied ? (
                      <span className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                        <CheckCircle size={14} /> Applied
                      </span>
                    ) : (
                      <GradientButton size="sm" onClick={() => void handleApply(job.id)} disabled={applying === job.id}>
                        {applying === job.id ? <Loader2 className="animate-spin" size={14} /> : (
                          <span className="flex items-center gap-1"><Send size={14} /> Apply</span>
                        )}
                      </GradientButton>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
