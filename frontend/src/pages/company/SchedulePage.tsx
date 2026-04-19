import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { scheduleService, type ScheduledInterview, type ScheduleCreateRequest } from '../../services/scheduleService';
import { companyService } from '../../services/companyService';
import type { JobRole } from '../../types';
import { Calendar, Plus, Loader2, X, Clock, User, CheckCircle, XCircle, RefreshCw, Video, Phone, Mail, Star, MessageSquare, Briefcase, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  rescheduled: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const INTERVIEW_TYPES = ['hr', 'domain_skills', 'behavioral', 'sales', 'culture_fit', 'final'];
const DURATIONS = [15, 30, 45, 60, 90, 120];

interface ShortlistCandidate {
  talent_profile_id: number;
  candidate_code: string;
  college_name: string | null;
  experience_level: string | null;
  years_of_experience: number | null;
}

export function SchedulePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [schedules, setSchedules] = useState<ScheduledInterview[]>([]);
  const [shortlistCandidates, setShortlistCandidates] = useState<ShortlistCandidate[]>([]);
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [feedbackId, setFeedbackId] = useState<number | null>(null);
  const [fbRating, setFbRating] = useState(3);
  const [fbNotes, setFbNotes] = useState('');
  const [fbOutcome, setFbOutcome] = useState('next_round');

  // Form state
  const [, setCandidateType] = useState<'platform' | 'external'>('platform');
  const [talentProfileId, setTalentProfileId] = useState<number | null>(null);
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState('30');
  const [interviewType, setInterviewType] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    Promise.all([
      scheduleService.list(),
      api.get<{ talents: Array<{ id: number; candidate_code: string; college_name: string | null; experience_level: string | null; years_of_experience: number | null }> }>('/talents?limit=100')
        .then((r) => r.data.talents.map((t) => ({
          talent_profile_id: t.id, candidate_code: t.candidate_code,
          college_name: t.college_name, experience_level: t.experience_level,
          years_of_experience: t.years_of_experience,
        }))).catch(() => []),
      companyService.listJobs().catch(() => []),
    ]).then(([schedData, talents, jobList]) => {
      setSchedules(schedData.schedules);
      setShortlistCandidates(talents);
      setJobs(Array.isArray(jobList) ? jobList : []);
    }).catch(() => {}).finally(() => setLoading(false));

    // Pre-fill from query params
    const paramName = searchParams.get('candidate_name');
    const paramType = searchParams.get('candidate_type');
    const paramTalentId = searchParams.get('talent_profile_id');
    if (paramName) {
      setCandidateName(paramName);
      if (paramType === 'platform') setCandidateType('platform');
      if (paramTalentId) setTalentProfileId(parseInt(paramTalentId));
      setShowForm(true);
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return schedules;
    return schedules.filter((s) => s.status === statusFilter);
  }, [schedules, statusFilter]);

  // Get minimum datetime (now + 30 min)
  const minDateTime = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return d.toISOString().slice(0, 16);
  }, []);

  const resetForm = () => {
    setCandidateType('external'); setTalentProfileId(null); setCandidateName(''); setCandidateEmail(''); setCandidatePhone('');
    setSelectedJobId(''); setScheduledAt(''); setDuration('30'); setInterviewType(''); setInterviewerName('');
    setMeetingLink(''); setNotes('');
  };

  const handleCreate = async () => {
    if (!talentProfileId || !scheduledAt) return;
    setSaving(true);
    try {
      // Auto-generate Talexis video room if no link set
      const link = meetingLink || `${window.location.origin}/meet/${crypto.randomUUID().slice(0, 4)}-${crypto.randomUUID().slice(0, 4)}`;
      const req: ScheduleCreateRequest = {
        candidate_type: 'platform',
        talent_profile_id: talentProfileId ?? undefined,
        candidate_name: candidateName.trim(),
        candidate_email: candidateEmail || undefined,
        candidate_phone: candidatePhone || undefined,
        job_role_id: selectedJobId ? parseInt(selectedJobId) : undefined,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: parseInt(duration) || 30,
        interview_type: interviewType || undefined,
        interviewer_name: interviewerName || undefined,
        meeting_link: link,
        notes: notes || undefined,
      };
      const created = await scheduleService.create(req);
      setSchedules((prev) => [created, ...prev]);
      setShowForm(false);
      resetForm();
    } catch { /* error */ } finally { setSaving(false); }
  };

  const handleReschedule = async () => {
    if (!rescheduleId || !rescheduleDate) return;
    try {
      const updated = await scheduleService.update(rescheduleId, {
        scheduled_at: new Date(rescheduleDate).toISOString(),
        reschedule_reason: rescheduleReason || undefined,
      });
      setSchedules((prev) => prev.map((s) => (s.id === rescheduleId ? updated : s)));
      setRescheduleId(null);
    } catch { /* error */ }
  };

  const handleCancel = async (id: number) => {
    try {
      const updated = await scheduleService.cancel(id);
      setSchedules((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch { /* error */ }
  };

  const handleComplete = async (id: number) => {
    try {
      const updated = await scheduleService.complete(id);
      setSchedules((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch { /* error */ }
  };

  const handleFeedback = async () => {
    if (!feedbackId) return;
    try {
      const updated = await scheduleService.submitFeedback(feedbackId, { rating: fbRating, notes: fbNotes || undefined, outcome: fbOutcome });
      setSchedules((prev) => prev.map((s) => (s.id === feedbackId ? updated : s)));
      setFeedbackId(null);
    } catch { /* error */ }
  };

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  const upcoming = schedules.filter((s) => s.status === 'scheduled' || s.status === 'rescheduled').length;

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg"><Calendar className="text-indigo-600" size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Interview Schedule</h1>
            <p className="text-gray-500 text-sm">{upcoming} upcoming &middot; {schedules.length} total</p>
          </div>
        </div>
        <GradientButton size="sm" onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}>
          {showForm ? <X size={16} /> : <span className="flex items-center gap-1"><Plus size={16} /> Schedule Interview</span>}
        </GradientButton>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <GlassCard className="bg-white border-gray-100 mb-6">
              <h2 className="font-semibold text-gray-900 mb-4">Schedule New Interview</h2>

              <div className="space-y-3">
                {/* Candidate selection — always from talent pool */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Candidate</label>
                  <div className="relative">
                    <select
                      value={talentProfileId?.toString() ?? ''}
                      onChange={(e) => {
                        const id = parseInt(e.target.value);
                        setTalentProfileId(id || null);
                        const c = shortlistCandidates.find((s) => s.talent_profile_id === id);
                        if (c) {
                          setCandidateName(c.candidate_code);
                          setCandidateType('platform');
                        }
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none text-sm bg-white appearance-none pr-10"
                    >
                      <option value="">Choose a candidate...</option>
                      {shortlistCandidates.map((c) => (
                        <option key={c.talent_profile_id} value={c.talent_profile_id}>
                          {c.candidate_code} — {c.college_name || 'Independent'}{c.experience_level ? ` (${c.experience_level}${c.years_of_experience ? `, ${c.years_of_experience}yr` : ''})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Selected candidate details */}
                  {talentProfileId && (() => {
                    const sel = shortlistCandidates.find((c) => c.talent_profile_id === talentProfileId);
                    if (!sel) return null;
                    return (
                      <div className="mt-2 bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                        <div className="flex items-center gap-3 text-xs">
                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center text-white text-[10px] font-bold">
                            {sel.candidate_code.slice(-2)}
                          </div>
                          <div>
                            <p className="font-mono font-medium text-emerald-800">{sel.candidate_code}</p>
                            <div className="flex items-center gap-2 text-emerald-600 mt-0.5">
                              <span>{sel.college_name || 'Independent Candidate'}</span>
                              {sel.experience_level && (
                                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full capitalize">
                                  {sel.experience_level}{sel.years_of_experience ? ` · ${sel.years_of_experience} yrs` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Invite link for candidates not on platform */}
                  {!talentProfileId && (
                    <div className="mt-2 bg-amber-50 rounded-lg p-3 border border-amber-200">
                      <p className="text-xs font-medium text-amber-800 mb-1">Candidate not on Talexis yet?</p>
                      <p className="text-[10px] text-amber-600 mb-2">Share this registration link. Once they sign up and complete interviews, they'll appear in your talent pool.</p>
                      <div className="flex items-center gap-2">
                        <input type="text" readOnly value={`${window.location.origin}/student/login`}
                          className="flex-1 text-[10px] border border-amber-200 rounded-lg px-2 py-1.5 bg-white text-amber-700 font-mono" />
                        <button
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/student/login`)}
                          className="px-2.5 py-1.5 bg-amber-600 text-white text-[10px] font-medium rounded-lg hover:bg-amber-700">
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Job role + schedule */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">For Job Role (optional)</label>
                    <div className="relative">
                      <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none text-sm bg-white appearance-none pr-10">
                        <option value="">No specific role</option>
                        {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interview Type</label>
                    <div className="relative">
                      <select value={interviewType} onChange={(e) => setInterviewType(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none text-sm bg-white appearance-none pr-10">
                        <option value="">Select type...</option>
                        {INTERVIEW_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <AnimatedInput label="Date & Time" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required min={minDateTime} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                    <div className="relative">
                      <select value={duration} onChange={(e) => setDuration(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none text-sm bg-white appearance-none pr-10">
                        {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <AnimatedInput label="Interviewer Name" value={interviewerName} onChange={(e) => setInterviewerName(e.target.value)} placeholder="HR Manager name" />
                </div>

                {/* Talexis Meeting */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Interview Meeting</label>
                  {!meetingLink ? (
                    <div className="bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-xl p-4 text-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl text-white text-sm font-bold flex items-center justify-center mx-auto mb-2">T</div>
                      <p className="text-sm font-medium text-emerald-800 mb-1">Talexis Interview Room</p>
                      <p className="text-[10px] text-emerald-600 mb-3">Video & audio interview powered by Talexis</p>
                      <div className="flex gap-2 justify-center">
                        <button type="button" onClick={() => setMeetingLink(`${window.location.origin}/meet/${crypto.randomUUID().slice(0, 4)}-${crypto.randomUUID().slice(0, 4)}`)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700">
                          <Video size={14} /> Generate Video Room
                        </button>
                        <button type="button" onClick={() => setMeetingLink(`${window.location.origin}/call/${crypto.randomUUID().slice(0, 4)}-${crypto.randomUUID().slice(0, 4)}`)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700">
                          <Phone size={14} /> Generate Audio Room
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg text-white text-xs font-bold flex items-center justify-center">T</div>
                          <div>
                            <p className="text-xs font-medium text-emerald-800">
                              {meetingLink.includes('/call/') ? 'Talexis Audio Room' : 'Talexis Video Room'}
                            </p>
                            <p className="text-[10px] text-emerald-600 font-mono">{meetingLink.split('/').pop()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => navigator.clipboard.writeText(meetingLink)}
                            className="px-2 py-1 text-[10px] text-emerald-700 bg-emerald-100 rounded hover:bg-emerald-200">Copy Link</button>
                          <button type="button" onClick={() => setMeetingLink('')} className="text-gray-400 hover:text-gray-600 p-1"><X size={14} /></button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none text-sm" rows={2} placeholder="Any notes for this interview..." />
                </div>

                <GradientButton onClick={() => void handleCreate()} disabled={saving || !talentProfileId || !scheduledAt}>
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <span className="flex items-center gap-2"><Calendar size={16} /> Schedule Interview</span>}
                </GradientButton>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reschedule modal */}
      <AnimatePresence>
        {rescheduleId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setRescheduleId(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
              <h3 className="font-semibold text-gray-900 mb-4">Reschedule Interview</h3>
              <div className="space-y-3">
                <AnimatedInput label="New Date & Time" type="datetime-local" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} required min={minDateTime} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <textarea value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)} className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none text-sm" rows={2} placeholder="Reason for rescheduling..." />
                </div>
                <div className="flex gap-2">
                  <GradientButton onClick={() => void handleReschedule()} disabled={!rescheduleDate} className="flex-1">Reschedule</GradientButton>
                  <GradientButton variant="outline" onClick={() => setRescheduleId(null)} className="flex-1">Cancel</GradientButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback modal */}
      <AnimatePresence>
        {feedbackId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setFeedbackId(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
              <h3 className="font-semibold text-gray-900 mb-4">Post-Interview Feedback</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setFbRating(n)} className={`p-1 ${n <= fbRating ? 'text-amber-500' : 'text-gray-300'}`}>
                        <Star size={24} fill={n <= fbRating ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'hire', label: 'Hire', color: 'bg-green-100 text-green-700 border-green-300' },
                      { value: 'next_round', label: 'Next Round', color: 'bg-blue-100 text-blue-700 border-blue-300' },
                      { value: 'reject', label: 'Reject', color: 'bg-red-100 text-red-700 border-red-300' },
                    ].map((o) => (
                      <button key={o.value} onClick={() => setFbOutcome(o.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${fbOutcome === o.value ? o.color : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={fbNotes} onChange={(e) => setFbNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none text-sm" rows={2} placeholder="Feedback for placement office..." />
                </div>
                <div className="flex gap-2">
                  <GradientButton onClick={() => void handleFeedback()} className="flex-1">Submit Feedback</GradientButton>
                  <GradientButton variant="outline" onClick={() => setFeedbackId(null)} className="flex-1">Cancel</GradientButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status filters */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {statusFilters.map((f) => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === f.value ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Schedule list */}
      {filtered.length === 0 ? (
        <GlassCard className="bg-white border-gray-100 text-center py-12">
          <Calendar className="text-gray-300 mx-auto mb-3" size={48} />
          <p className="text-gray-500">{schedules.length === 0 ? 'No interviews scheduled yet.' : 'No interviews match this filter.'}</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((s, i) => {
            const isPast = new Date(s.scheduled_at) < new Date();
            const isActive = s.status === 'scheduled' || s.status === 'rescheduled';
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <GlassCard className={`bg-white border-gray-100 ${isPast && isActive ? 'border-l-4 border-l-amber-400' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <User size={14} className="text-gray-400" />
                        <p className="font-medium text-gray-900">{s.candidate_name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${s.candidate_type === 'platform' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          {s.candidate_type}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusColors[s.status]}`}>
                          {s.status}
                        </span>
                        {s.college_approval && s.college_approval !== 'not_required' && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                            s.college_approval === 'approved' ? 'bg-green-100 text-green-700' :
                            s.college_approval === 'declined' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            College: {s.college_approval}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(s.scheduled_at).toLocaleDateString()} at {new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {s.duration_minutes}min</span>
                        {s.interview_type && <span className="capitalize">{s.interview_type.replace('_', ' ')}</span>}
                        {s.job_role_id && <span className="flex items-center gap-1"><Briefcase size={10} /> Job #{s.job_role_id}</span>}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {s.candidate_email && <span className="flex items-center gap-1"><Mail size={10} /> {s.candidate_email}</span>}
                        {s.candidate_phone && <span className="flex items-center gap-1"><Phone size={10} /> {s.candidate_phone}</span>}
                        {s.interviewer_name && <span>Interviewer: {s.interviewer_name}</span>}
                      </div>

                      {s.meeting_link && (
                        <a href={s.meeting_link} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs mt-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200">
                          <div className="w-4 h-4 bg-gradient-to-br from-emerald-500 to-teal-500 rounded text-white text-[7px] font-bold flex items-center justify-center">T</div>
                          <span className="text-emerald-700 font-medium">
                            {s.meeting_link.includes('/call/') ? 'Join Audio Room' : 'Join Video Room'}
                          </span>
                          <span className="text-emerald-500 font-mono text-[10px]">{s.meeting_link.split('/').pop()}</span>
                        </a>
                      )}

                      {s.notes && <p className="text-xs text-gray-400 mt-1">{s.notes}</p>}
                      {s.reschedule_reason && <p className="text-xs text-amber-600 mt-0.5">Reason: {s.reschedule_reason}</p>}

                      {/* Existing feedback */}
                      {s.feedback_rating && (
                        <div className="mt-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <div className="flex items-center gap-2 text-xs">
                            <MessageSquare size={10} className="text-gray-400" />
                            <span className="flex items-center gap-0.5 text-amber-500">
                              {Array.from({ length: s.feedback_rating }).map((_, j) => <Star key={j} size={10} fill="currentColor" />)}
                            </span>
                            {s.feedback_outcome && (
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                                s.feedback_outcome === 'hire' ? 'bg-green-100 text-green-700' :
                                s.feedback_outcome === 'next_round' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                              }`}>{s.feedback_outcome.replace('_', ' ')}</span>
                            )}
                          </div>
                          {s.feedback_notes && <p className="text-xs text-gray-500 mt-1">{s.feedback_notes}</p>}
                        </div>
                      )}

                      {s.status === 'completed' && !s.feedback_rating && (
                        <button onClick={() => { setFeedbackId(s.id); setFbRating(3); setFbNotes(''); setFbOutcome('next_round'); }}
                          className="flex items-center gap-1 text-xs text-emerald-600 hover:underline mt-1">
                          <Star size={10} /> Add Feedback
                        </button>
                      )}
                    </div>

                    {/* Actions */}
                    {isActive && (
                      <div className="flex items-center gap-1 shrink-0 ml-3">
                        <button onClick={() => { setRescheduleId(s.id); setRescheduleDate(''); setRescheduleReason(''); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="Reschedule">
                          <RefreshCw size={14} />
                        </button>
                        <button onClick={() => void handleComplete(s.id)} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg" title="Mark Complete">
                          <CheckCircle size={14} />
                        </button>
                        <button onClick={() => void handleCancel(s.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Cancel">
                          <XCircle size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
