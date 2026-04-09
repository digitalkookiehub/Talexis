import { useState, useEffect, type FormEvent } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { studentService } from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';
import type { StudentProfile } from '../../types';
import { User, Save, Loader2 } from 'lucide-react';

export function StudentProfilePage() {
  const { user } = useAuth();
  const [, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [branch, setBranch] = useState('');
  const [department, setDepartment] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [skills, setSkills] = useState('');
  const [interests, setInterests] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    studentService.getProfile().then((p) => {
      setProfile(p);
      setBranch(p.branch ?? '');
      setDepartment(p.department ?? '');
      setCollegeName(p.college_name ?? '');
      setGraduationYear(p.graduation_year?.toString() ?? '');
      setSkills(p.skills?.join(', ') ?? '');
      setInterests(p.interests?.join(', ') ?? '');
      setBio(p.bio ?? '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const updated = await studentService.updateProfile({
        branch: branch || undefined,
        department: department || undefined,
        college_name: collegeName || undefined,
        graduation_year: graduationYear ? parseInt(graduationYear) : undefined,
        skills: skills ? skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
        interests: interests ? interests.split(',').map((s) => s.trim()).filter(Boolean) : [],
        bio: bio || undefined,
      } as Partial<StudentProfile>);
      setProfile(updated);
      setMessage('Profile saved successfully!');
    } catch {
      setMessage('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

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
          <User className="text-purple-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Profile</h1>
          <p className="text-gray-500 text-sm">{user?.email}</p>
        </div>
      </div>

      <GlassCard className="bg-white border-gray-100">
        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatedInput label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Computer Science" />
            <AnimatedInput label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Engineering" />
            <AnimatedInput label="College Name" value={collegeName} onChange={(e) => setCollegeName(e.target.value)} placeholder="University of..." />
            <AnimatedInput label="Graduation Year" type="number" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} placeholder="2025" />
          </div>

          <AnimatedInput label="Skills (comma-separated)" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Python, React, Machine Learning" />
          <AnimatedInput label="Interests (comma-separated)" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="AI, Web Development, Data Science" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 outline-none transition-colors"
              rows={3}
              placeholder="Tell us about yourself..."
            />
          </div>

          {message && (
            <p className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
              {message}
            </p>
          )}

          <GradientButton type="submit" disabled={saving}>
            {saving ? (
              <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Saving...</span>
            ) : (
              <span className="flex items-center gap-2"><Save size={16} /> Save Profile</span>
            )}
          </GradientButton>
        </form>
      </GlassCard>
    </PageWrapper>
  );
}
