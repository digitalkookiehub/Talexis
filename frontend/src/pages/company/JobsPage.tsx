import { useState, useEffect, type FormEvent } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { companyService } from '../../services/companyService';
import type { JobRole } from '../../types';
import { Briefcase, Plus, Trash2, Loader2, X, Users, ChevronRight, Trophy, Pencil, Save, Download } from 'lucide-react';
import { downloadCsv } from '../../utils/csvExport';
import { motion, AnimatePresence } from 'framer-motion';

interface MatchResult {
  talent_id: number;
  candidate_code?: string;
  match_score: number;
  skill_match_percent: number;
  readiness_match: number;
  rank: number;
}

interface MatchResponse {
  job_id: number;
  total_matches: number;
  results: MatchResult[];
}

const INTERVIEW_TYPES = ['hr', 'technical', 'behavioral', 'sales'];
const JOB_STATUSES = ['active', 'draft', 'closed'];
const jobStatusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  closed: 'bg-red-100 text-red-600',
};

export function JobsPage() {
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [matching, setMatching] = useState<number | null>(null);
  const [matchResults, setMatchResults] = useState<Record<number, MatchResponse>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [jobStatusFilter, setJobStatusFilter] = useState('all');

  // Form state (shared for create + edit)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState('');
  const [minScore, setMinScore] = useState('');
  const [interviewTypes, setInterviewTypes] = useState<string[]>([]);

  useEffect(() => {
    companyService.listJobs().then(setJobs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setTitle(''); setDescription(''); setSkills(''); setMinScore(''); setInterviewTypes([]);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const job = await companyService.createJob({
        title,
        description: description || undefined,
        required_skills: skills ? skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
        min_readiness_score: minScore ? parseFloat(minScore) : undefined,
      });
      setJobs((prev) => [job, ...prev]);
      setShowForm(false);
      resetForm();
    } catch { /* error */ } finally { setSaving(false); }
  };

  const startEdit = (job: JobRole) => {
    setEditingId(job.id);
    setTitle(job.title);
    setDescription(job.description || '');
    setSkills(job.required_skills.join(', '));
    setMinScore(job.min_readiness_score?.toString() || '');
    setShowForm(false);
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId || !title.trim()) return;
    setSaving(true);
    try {
      const updated = await companyService.updateJob(editingId, {
        title,
        description: description || undefined,
        required_skills: skills ? skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
        min_readiness_score: minScore ? parseFloat(minScore) : undefined,
      });
      setJobs((prev) => prev.map((j) => (j.id === editingId ? updated : j)));
      setEditingId(null);
      resetForm();
    } catch { /* error */ } finally { setSaving(false); }
  };

  const cancelEdit = () => { setEditingId(null); resetForm(); };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await companyService.deleteJob(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      setMatchResults((prev) => { const c = { ...prev }; delete c[id]; return c; });
    } catch { /* error */ } finally { setDeleting(null); }
  };

  const handleStatusChange = async (jobId: number, status: string) => {
    try {
      const updated = await companyService.updateJob(jobId, { status } as Partial<JobRole>);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
    } catch { /* error */ }
  };

  const filteredJobs = jobStatusFilter === 'all' ? jobs : jobs.filter((j) => j.status === jobStatusFilter);

  const handleRunMatching = async (jobId: number) => {
    setMatching(jobId);
    try {
      const result = await companyService.runMatching(jobId) as MatchResponse;
      setMatchResults((prev) => ({ ...prev, [jobId]: result }));
    } catch { /* error */ } finally { setMatching(null); }
  };

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  const formContent = (isEdit: boolean, onSubmit: (e: FormEvent) => void) => (
    <GlassCard className="bg-white border-gray-100 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">{isEdit ? 'Edit Job Role' : 'Create Job Role'}</h2>
        {isEdit && (
          <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        )}
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
        <AnimatedInput label="Job Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Backend Developer" required />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none" rows={2} placeholder="Role description..." />
        </div>
        <AnimatedInput label="Required Skills (comma-separated)" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Python, FastAPI, SQL" />
        <AnimatedInput label="Min Readiness Score (%)" type="number" value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="60" />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Required Interview Types</label>
          <div className="flex gap-2 flex-wrap">
            {INTERVIEW_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setInterviewTypes((prev) =>
                  prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                )}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                  interviewTypes.includes(type) ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <GradientButton type="submit" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" size={16} /> : (
            <span className="flex items-center gap-2">{isEdit ? <><Save size={16} /> Update Job</> : 'Create Job Role'}</span>
          )}
        </GradientButton>
      </form>
    </GlassCard>
  );

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><Briefcase className="text-blue-600" size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job Roles</h1>
            <p className="text-gray-500 text-sm">{jobs.length} active roles</p>
          </div>
        </div>
        {!editingId && (
          <GradientButton size="sm" onClick={() => { setShowForm(!showForm); resetForm(); }}>
            {showForm ? <X size={16} /> : <span className="flex items-center gap-1"><Plus size={16} /> New Job</span>}
          </GradientButton>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5 mb-4">
        {['all', ...JOB_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setJobStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              jobStatusFilter === s ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && !editingId && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            {formContent(false, handleCreate)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit form */}
      <AnimatePresence>
        {editingId && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            {formContent(true, handleUpdate)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job list */}
      {filteredJobs.length === 0 ? (
        <GlassCard className="bg-white border-gray-100 text-center py-12">
          <Briefcase className="text-gray-300 mx-auto mb-3" size={48} />
          <p className="text-gray-500">{jobs.length === 0 ? 'No job roles yet. Create your first role to start matching candidates.' : 'No jobs match this filter.'}</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const results = matchResults[job.id];
            return (
              <div key={job.id}>
                <GlassCard className={`bg-white border-gray-100 ${editingId === job.id ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-gray-900">{job.title}</h3>
                        <select
                          value={job.status}
                          onChange={(e) => void handleStatusChange(job.id, e.target.value)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border-0 cursor-pointer capitalize ${jobStatusColors[job.status] ?? 'bg-gray-100'}`}
                        >
                          {JOB_STATUSES.map((s) => <option key={s} value={s} className="bg-white text-gray-900">{s}</option>)}
                        </select>
                      </div>
                      {job.description && <p className="text-sm text-gray-500 mt-1">{job.description}</p>}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {job.required_skills.map((skill) => (
                          <span key={skill} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">{skill}</span>
                        ))}
                        {job.min_readiness_score != null && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Min: {job.min_readiness_score}%</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <GradientButton
                        variant="secondary" size="sm"
                        onClick={() => void handleRunMatching(job.id)}
                        disabled={matching === job.id}
                      >
                        {matching === job.id ? (
                          <span className="flex items-center gap-1"><Loader2 className="animate-spin" size={14} /> Matching...</span>
                        ) : (
                          <span className="flex items-center gap-1"><Users size={14} /> Match</span>
                        )}
                      </GradientButton>
                      <button onClick={() => startEdit(job)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Edit">
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => void handleDelete(job.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        disabled={deleting === job.id}
                      >
                        {deleting === job.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>
                </GlassCard>

                {/* Match Results */}
                {results && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-1 ml-4">
                    <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Trophy size={16} className="text-emerald-600" />
                          <h4 className="text-sm font-semibold text-emerald-800">
                            {results.total_matches} candidate{results.total_matches !== 1 ? 's' : ''} matched
                          </h4>
                        </div>
                        {results.results.length > 0 && (
                          <button
                            onClick={() => {
                              const rows = results.results.map((m) => [
                                String(m.rank),
                                m.candidate_code ?? `#${m.talent_id}`,
                                `${(m.match_score * 100).toFixed(0)}%`,
                                `${(m.skill_match_percent * 100).toFixed(0)}%`,
                                `${(m.readiness_match * 100).toFixed(0)}%`,
                              ]);
                              downloadCsv(`match_${job.title.replace(/\s+/g, '_')}.csv`, ['Rank', 'Candidate', 'Match %', 'Skill Match', 'Readiness'], rows);
                            }}
                            className="flex items-center gap-1 text-[10px] text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded"
                          >
                            <Download size={10} /> CSV
                          </button>
                        )}
                      </div>
                      {results.results.length === 0 ? (
                        <p className="text-sm text-gray-500">No candidates meet the requirements for this role.</p>
                      ) : (
                        <div className="space-y-2">
                          {results.results.slice(0, 10).map((match) => (
                            <div key={match.talent_id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-emerald-100">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-100 w-6 h-6 rounded-full flex items-center justify-center">
                                  #{match.rank}
                                </span>
                                <div>
                                  <p className="text-sm font-medium text-gray-800">
                                    {match.candidate_code ?? `Candidate #${match.talent_id}`}
                                  </p>
                                  <div className="flex gap-3 text-[10px] text-gray-500">
                                    <span>Skill: {(match.skill_match_percent * 100).toFixed(0)}%</span>
                                    <span>Readiness: {(match.readiness_match * 100).toFixed(0)}%</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-sm font-bold text-gray-900">{(match.match_score * 100).toFixed(0)}%</p>
                                  <p className="text-[10px] text-gray-400">match</p>
                                </div>
                                <ChevronRight size={16} className="text-gray-400" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
