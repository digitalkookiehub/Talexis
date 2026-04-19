import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { studentService } from '../../services/studentService';
import { talentService } from '../../services/talentService';
import { useAuth } from '../../context/AuthContext';
import type { StudentProfile } from '../../types';
import { User, Save, Loader2, Camera, Eye, EyeOff, Shield, CheckCircle, Circle, Briefcase, Link2 } from 'lucide-react';
import { TagInput } from '../../components/ui/TagInput';

export function StudentProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [message, setMessage] = useState('');
  const [consentVisible, setConsentVisible] = useState(false);
  const [togglingConsent, setTogglingConsent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [branch, setBranch] = useState('');
  const [department, setDepartment] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      studentService.getProfile(),
      talentService.getConsentStatus().catch(() => null),
    ]).then(([p, consent]) => {
      setProfile(p);
      setBranch(p.branch ?? '');
      setDepartment(p.department ?? '');
      setCollegeName(p.college_name ?? '');
      setGraduationYear(p.graduation_year?.toString() ?? '');
      setSkills(p.skills ?? []);
      setInterests(p.interests ?? []);
      setExperienceLevel(p.experience_level ?? '');
      setYearsExp(p.years_of_experience?.toString() ?? '');
      setLinkedinUrl(p.linkedin_url ?? '');
      setGithubUrl(p.github_url ?? '');
      setPortfolioUrl(p.portfolio_url ?? '');
      setPreferredRoles(p.preferred_roles ?? []);
      setPreferredLocations(p.preferred_locations ?? []);
      setBio(p.bio ?? '');
      if (consent) setConsentVisible(consent.is_visible);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handlePictureUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPic(true);
    setMessage('');
    try {
      await studentService.uploadProfilePicture(file);
      // Refresh profile to get updated picture URL
      const updated = await studentService.getProfile();
      setProfile(updated);
      setMessage('Profile picture updated!');
    } catch {
      setMessage('Failed to upload picture. Max 5 MB, JPG/PNG/WebP only.');
    } finally {
      setUploadingPic(false);
    }
  };

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
        skills,
        interests,
        bio: bio || undefined,
        experience_level: experienceLevel || undefined,
        years_of_experience: yearsExp ? parseInt(yearsExp) : undefined,
        linkedin_url: linkedinUrl || undefined,
        github_url: githubUrl || undefined,
        portfolio_url: portfolioUrl || undefined,
        preferred_roles: preferredRoles.length > 0 ? preferredRoles : undefined,
        preferred_locations: preferredLocations.length > 0 ? preferredLocations : undefined,
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
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </PageWrapper>
    );
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <User className="text-emerald-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidate Profile</h1>
          <p className="text-gray-500 text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Profile Picture */}
      <GlassCard className="bg-white border-gray-100 mb-6">
        <div className="flex items-center gap-5">
          <div className="relative group">
            {profile?.profile_picture_url ? (
              <img
                src={`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/uploads/${profile.profile_picture_url.split(/[/\\]/).pop()}`}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border-2 border-emerald-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-2xl font-bold">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPic}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            >
              {uploadingPic ? (
                <Loader2 className="animate-spin text-white" size={20} />
              ) : (
                <Camera className="text-white" size={20} />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => void handlePictureUpload(e)}
            />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-lg">{user?.full_name || 'Candidate'}</p>
            <p className="text-sm text-gray-500">{profile?.college_name || 'Independent Candidate'}</p>
            <p className="text-xs text-gray-400 mt-0.5">Hover the avatar to change your picture</p>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="bg-white border-gray-100">
        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatedInput label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Computer Science" />
            <AnimatedInput label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Engineering" />
            <AnimatedInput label="College Name" value={collegeName} onChange={(e) => setCollegeName(e.target.value)} placeholder="University of..." />
            <AnimatedInput label="Graduation Year" type="number" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} placeholder="2025" />
          </div>

          <TagInput label="Skills" tags={skills} onChange={setSkills} placeholder="Python, React, Machine Learning" />
          <TagInput label="Interests" tags={interests} onChange={setInterests} placeholder="AI, Web Development, Data Science" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none transition-colors"
              rows={3}
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Experience & Portfolio */}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Briefcase size={14} className="text-indigo-500" /> Experience & Portfolio
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none text-sm bg-white"
                >
                  <option value="">Select...</option>
                  <option value="fresher">Fresher (0 years)</option>
                  <option value="junior">Junior (1-2 years)</option>
                  <option value="mid">Mid-Level (3-5 years)</option>
                  <option value="senior">Senior (6+ years)</option>
                </select>
              </div>
              <AnimatedInput label="Years of Experience" type="number" value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} placeholder="0" />
              <div /> {/* spacer */}
            </div>
            <div className="space-y-3 mb-3">
              <h4 className="text-xs font-medium text-gray-600 flex items-center gap-1"><Link2 size={12} /> Portfolio Links</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <AnimatedInput label="LinkedIn" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
                <AnimatedInput label="GitHub" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/..." />
                <AnimatedInput label="Portfolio / Website" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://your-site.com" />
              </div>
            </div>
            <TagInput label="Preferred Roles" tags={preferredRoles} onChange={setPreferredRoles} placeholder="Frontend Developer, Data Analyst" />
            <div className="mt-3">
              <TagInput label="Preferred Locations" tags={preferredLocations} onChange={setPreferredLocations} placeholder="Bangalore, Remote, Chennai" />
            </div>
          </div>

          {message && (
            <p className={`text-sm ${message.includes('success') || message.includes('updated') ? 'text-green-600' : 'text-red-500'}`}>
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

      {/* Talent Profile Consent */}
      <TalentConsentSection
        visible={consentVisible}
        toggling={togglingConsent}
        onToggle={async () => {
          setTogglingConsent(true);
          try {
            const result = await talentService.updateConsent(!consentVisible);
            setConsentVisible(result.visible);
            setMessage('Visibility updated!');
          } catch (err: unknown) {
            const axErr = err as { response?: { data?: { detail?: string } } };
            setMessage(axErr.response?.data?.detail || 'Requirements not met');
          } finally {
            setTogglingConsent(false);
          }
        }}
      />
    </PageWrapper>
  );
}

function TalentConsentSection({ visible, toggling, onToggle }: { visible: boolean; toggling: boolean; onToggle: () => void }) {
  const [requirements, setRequirements] = useState<Array<{ key: string; label: string; met: boolean; detail: string }>>([]);
  const [allMet, setAllMet] = useState(false);

  useEffect(() => {
    talentService.getReadinessRequirements().then((data) => {
      setRequirements(data.requirements);
      setAllMet(data.all_met);
    }).catch(() => {});
  }, []);

  return (
    <GlassCard className={`mt-6 ${visible ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${visible ? 'bg-emerald-100' : 'bg-gray-100'}`}>
            <Shield className={visible ? 'text-emerald-600' : 'text-gray-400'} size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Company Visibility</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {visible
                ? 'Your anonymized profile is visible to companies.'
                : 'Meet all requirements below to enable visibility.'}
            </p>
          </div>
        </div>
        <button
          onClick={onToggle}
          disabled={toggling || (!visible && !allMet)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            visible
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : allMet
                ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          } disabled:opacity-50`}
        >
          {toggling ? (
            <Loader2 className="animate-spin" size={14} />
          ) : visible ? (
            <><Eye size={14} /> Visible</>
          ) : (
            <><EyeOff size={14} /> {allMet ? 'Enable' : 'Locked'}</>
          )}
        </button>
      </div>

      {/* Requirements checklist */}
      {!visible && requirements.length > 0 && (
        <div className="space-y-2 mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-600">Requirements to become visible:</p>
          {requirements.map((req) => (
            <div key={req.key} className="flex items-center gap-2 text-xs">
              {req.met ? (
                <CheckCircle size={14} className="text-emerald-500 shrink-0" />
              ) : (
                <Circle size={14} className="text-gray-300 shrink-0" />
              )}
              <span className={req.met ? 'text-gray-500 line-through' : 'text-gray-700'}>{req.label}</span>
              <span className="text-gray-400 ml-auto">{req.detail}</span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
