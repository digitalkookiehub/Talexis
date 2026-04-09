import { useState, useEffect, type FormEvent } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { companyService } from '../../services/companyService';
import type { JobRole } from '../../types';
import { Briefcase, Plus, Trash2, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function JobsPage() {
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState('');
  const [minScore, setMinScore] = useState('');

  useEffect(() => {
    companyService.listJobs().then(setJobs).catch(() => {}).finally(() => setLoading(false));
  }, []);

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
      setTitle('');
      setDescription('');
      setSkills('');
      setMinScore('');
    } catch {
      // error
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await companyService.deleteJob(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch {
      // error
    } finally {
      setDeleting(null);
    }
  };

  const handleRunMatching = async (jobId: number) => {
    try {
      const result = await companyService.runMatching(jobId);
      alert(`Matching complete! ${result.total_matches} candidates found.`);
    } catch {
      alert('Matching failed. Ensure talent profiles exist.');
    }
  };

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" size={32} /></PageWrapper>;
  }

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
        <GradientButton size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X size={16} /> : <span className="flex items-center gap-1"><Plus size={16} /> New Job</span>}
        </GradientButton>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <GlassCard className="bg-white border-gray-100 mb-6">
              <h2 className="font-semibold text-gray-900 mb-4">Create Job Role</h2>
              <form onSubmit={(e) => void handleCreate(e)} className="space-y-3">
                <AnimatedInput label="Job Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Backend Developer" required />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 outline-none" rows={2} placeholder="Role description..." />
                </div>
                <AnimatedInput label="Required Skills (comma-separated)" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Python, FastAPI, SQL" />
                <AnimatedInput label="Min Readiness Score (%)" type="number" value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="60" />
                <GradientButton type="submit" disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" size={16} /> : 'Create Job Role'}
                </GradientButton>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job list */}
      {jobs.length === 0 ? (
        <GlassCard className="bg-white border-gray-100 text-center py-12">
          <Briefcase className="text-gray-300 mx-auto mb-3" size={48} />
          <p className="text-gray-500">No job roles yet. Create your first role to start matching candidates.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <GlassCard key={job.id} className="bg-white border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{job.title}</h3>
                  {job.description && <p className="text-sm text-gray-500 mt-1">{job.description}</p>}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {job.required_skills.map((skill) => (
                      <span key={skill} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">{skill}</span>
                    ))}
                    {job.min_readiness_score !== null && job.min_readiness_score !== undefined && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Min: {job.min_readiness_score}%</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <GradientButton variant="secondary" size="sm" onClick={() => void handleRunMatching(job.id)}>
                    Match
                  </GradientButton>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => void handleDelete(job.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    disabled={deleting === job.id}
                  >
                    {deleting === job.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                  </motion.button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
