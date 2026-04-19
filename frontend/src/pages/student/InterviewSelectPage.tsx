import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { interviewService } from '../../services/interviewService';
import { studentService } from '../../services/studentService';
import { Brain, Briefcase, Users, MessageSquare, Loader2, PlayCircle, Target, Building2, ChevronDown, FileText, Lock } from 'lucide-react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import type { InterviewType, DifficultyLevel, Interview } from '../../types';

const interviewTypes: { value: InterviewType; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { value: 'hr', label: 'HR Interview', desc: 'Behavioral & situational questions', icon: <Users size={24} />, color: 'bg-blue-100 text-blue-600' },
  { value: 'technical', label: 'Domain Skills', desc: 'Field-specific knowledge & problem-solving', icon: <Brain size={24} />, color: 'bg-emerald-100 text-emerald-600' },
  { value: 'behavioral', label: 'Behavioral', desc: 'STAR method & past experience', icon: <MessageSquare size={24} />, color: 'bg-green-100 text-green-600' },
  { value: 'sales', label: 'Sales', desc: 'Persuasion & communication skills', icon: <Briefcase size={24} />, color: 'bg-orange-100 text-orange-600' },
];

const difficulties: { value: DifficultyLevel; label: string; desc: string }[] = [
  { value: 'basic', label: 'Basic', desc: 'Entry-level questions' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Mid-level challenges' },
  { value: 'advanced', label: 'Advanced', desc: 'Senior-level depth' },
];

const questionCounts: { value: number; label: string; desc: string }[] = [
  { value: 3, label: '3 Questions', desc: 'Quick practice (~5 min)' },
  { value: 5, label: '5 Questions', desc: 'Standard (~10 min)' },
  { value: 7, label: '7 Questions', desc: 'Extended (~15 min)' },
  { value: 10, label: '10 Questions', desc: 'Full session (~20 min)' },
  { value: 15, label: '15 Questions', desc: 'Deep dive (~30 min)' },
];

export function InterviewSelectPage() {
  const [selectedType, setSelectedType] = useState<InterviewType | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('basic');
  const [selectedCount, setSelectedCount] = useState<number>(5);
  const [targetRole, setTargetRole] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [activeInterview, setActiveInterview] = useState<Interview | null>(null);
  const [suggestions, setSuggestions] = useState<{ roles: string[]; industries: string[]; has_profile_data: boolean } | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [unlocks, setUnlocks] = useState<Record<string, Record<string, { unlocked: boolean; reason: string | null }>>>({});
  const navigate = useNavigate();

  useEffect(() => {
    interviewService.active().then((data) => {
      if (data) setActiveInterview(data);
    }).catch(() => {});

    studentService.getInterviewSuggestions().then((data) => {
      setSuggestions(data);
    }).catch(() => {});

    api.get<{ unlocks: Record<string, Record<string, { unlocked: boolean; reason: string | null }>> }>('/interviews/attempts')
      .then((r) => setUnlocks(r.data.unlocks))
      .catch(() => {});
  }, []);

  const handleStart = async () => {
    if (!selectedType) return;
    setStarting(true);
    setError('');
    try {
      const interview = await interviewService.start({
        interview_type: selectedType,
        difficulty_level: selectedDifficulty,
        target_questions: selectedCount,
        target_role: targetRole || undefined,
        target_industry: targetIndustry || undefined,
      });
      navigate(`/student/interviews/${interview.id}`);
    } catch {
      setError('Failed to start interview. You may have reached the attempt limit.');
    } finally {
      setStarting(false);
    }
  };

  const hasRoles = suggestions && suggestions.roles.length > 0;
  const hasIndustries = suggestions && suggestions.industries.length > 0;
  const noProfileData = suggestions && !suggestions.has_profile_data;

  return (
    <PageWrapper className="p-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mock Interview</h1>
        <p className="text-gray-500 text-sm">Choose your interview type, difficulty, and target role</p>
      </div>

      {/* Resume in-progress interview */}
      {activeInterview && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <GlassCard className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <PlayCircle className="text-yellow-600" size={24} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Resume your in-progress interview</p>
                  <p className="text-xs text-gray-600 capitalize">
                    {activeInterview.interview_type} &middot; {activeInterview.difficulty_level} &middot; {activeInterview.target_questions} questions
                    {activeInterview.target_role && ` · ${activeInterview.target_role}`}
                  </p>
                </div>
              </div>
              <GradientButton size="sm" onClick={() => navigate(`/student/interviews/${activeInterview.id}`)}>
                Continue
              </GradientButton>
            </div>
          </GlassCard>
        </motion.div>
      )}

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Interview Type</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {interviewTypes.map((type) => (
            <motion.button
              key={type.value}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedType(type.value)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedType === type.value ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${type.color}`}>
                {type.icon}
              </div>
              <p className="font-semibold text-gray-900">{type.label}</p>
              <p className="text-xs text-gray-500 mt-1">{type.desc}</p>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Difficulty</h2>
        <div className="flex gap-3 flex-wrap">
          {difficulties.map((d) => {
            const unlockInfo = selectedType ? unlocks[selectedType]?.[d.value] : undefined;
            const isLocked = unlockInfo ? !unlockInfo.unlocked : false;
            return (
              <motion.button
                key={d.value}
                whileHover={isLocked ? {} : { scale: 1.03 }}
                whileTap={isLocked ? {} : { scale: 0.97 }}
                onClick={() => { if (!isLocked) setSelectedDifficulty(d.value); }}
                disabled={isLocked}
                className={`px-5 py-3 rounded-xl border-2 text-left transition-all relative ${
                  isLocked
                    ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                    : selectedDifficulty === d.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{d.label}</p>
                  {isLocked && <Lock size={12} className="text-gray-400" />}
                </div>
                <p className="text-xs text-gray-500">
                  {isLocked && unlockInfo?.reason ? unlockInfo.reason : d.desc}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Number of Questions</h2>
        <div className="flex gap-3 flex-wrap">
          {questionCounts.map((q) => (
            <motion.button
              key={q.value}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedCount(q.value)}
              className={`px-5 py-3 rounded-xl border-2 text-left transition-all ${
                selectedCount === q.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'
              }`}
            >
              <p className="font-medium text-sm">{q.label}</p>
              <p className="text-xs text-gray-500">{q.desc}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Target Role & Industry Dropdowns — profile-driven */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Target Context <span className="text-sm font-normal text-gray-400">(optional)</span></h2>
        <p className="text-xs text-gray-500 mb-4">Questions will be tailored to your selected role and industry</p>

        {noProfileData && (
          <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <FileText size={18} className="text-amber-500 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Upload your resume for personalized options</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Role and industry suggestions are derived from your profile.{' '}
                <Link to="/student/profile" className="underline hover:text-amber-800">
                  Update your profile
                </Link>{' '}
                or upload a resume to get tailored options.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
              <Target size={14} className="text-emerald-500" />
              Target Role
            </label>
            <div className="relative">
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none transition-colors text-sm bg-white appearance-none cursor-pointer pr-10"
              >
                <option value="">Select a role...</option>
                {hasRoles && suggestions.roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {!hasRoles && suggestions && (
              <p className="text-xs text-gray-400 mt-1">No roles found. Upload a resume to see suggestions.</p>
            )}
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
              <Building2 size={14} className="text-emerald-500" />
              Target Industry
            </label>
            <div className="relative">
              <select
                value={targetIndustry}
                onChange={(e) => setTargetIndustry(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none transition-colors text-sm bg-white appearance-none cursor-pointer pr-10"
              >
                <option value="">Select an industry...</option>
                {hasIndustries && suggestions.industries.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {!hasIndustries && suggestions && (
              <p className="text-xs text-gray-400 mt-1">No industries found. Update your profile interests.</p>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <GradientButton onClick={() => void handleStart()} disabled={!selectedType || starting}>
        {starting ? (
          <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Starting...</span>
        ) : (
          <span className="flex items-center gap-2"><Brain size={16} /> Start Interview</span>
        )}
      </GradientButton>
    </PageWrapper>
  );
}
