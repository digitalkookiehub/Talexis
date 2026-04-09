import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GradientButton } from '../../components/ui/GradientButton';
import { interviewService } from '../../services/interviewService';
import { Brain, Briefcase, Users, MessageSquare, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { InterviewType, DifficultyLevel } from '../../types';

const interviewTypes: { value: InterviewType; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { value: 'hr', label: 'HR Interview', desc: 'Behavioral & situational questions', icon: <Users size={24} />, color: 'bg-blue-100 text-blue-600' },
  { value: 'technical', label: 'Technical', desc: 'Coding & problem-solving questions', icon: <Brain size={24} />, color: 'bg-purple-100 text-purple-600' },
  { value: 'behavioral', label: 'Behavioral', desc: 'STAR method & past experience', icon: <MessageSquare size={24} />, color: 'bg-green-100 text-green-600' },
  { value: 'sales', label: 'Sales', desc: 'Persuasion & communication skills', icon: <Briefcase size={24} />, color: 'bg-orange-100 text-orange-600' },
];

const difficulties: { value: DifficultyLevel; label: string; desc: string }[] = [
  { value: 'basic', label: 'Basic', desc: 'Entry-level questions' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Mid-level challenges' },
  { value: 'advanced', label: 'Advanced', desc: 'Senior-level depth' },
];

export function InterviewSelectPage() {
  const [selectedType, setSelectedType] = useState<InterviewType | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('basic');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleStart = async () => {
    if (!selectedType) return;
    setStarting(true);
    setError('');
    try {
      const interview = await interviewService.start(selectedType, selectedDifficulty);
      navigate(`/student/interviews/${interview.id}`);
    } catch {
      setError('Failed to start interview. You may have reached the attempt limit.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <PageWrapper className="p-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mock Interview</h1>
        <p className="text-gray-500 text-sm">Choose your interview type and difficulty</p>
      </div>

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
                selectedType === type.value ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white'
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
        <div className="flex gap-3">
          {difficulties.map((d) => (
            <motion.button
              key={d.value}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedDifficulty(d.value)}
              className={`px-5 py-3 rounded-xl border-2 text-left transition-all ${
                selectedDifficulty === d.value ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white'
              }`}
            >
              <p className="font-medium text-sm">{d.label}</p>
              <p className="text-xs text-gray-500">{d.desc}</p>
            </motion.button>
          ))}
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
