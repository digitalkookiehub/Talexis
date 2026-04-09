import { useState, useEffect, type FormEvent } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { companyService } from '../../services/companyService';
import type { Company } from '../../types';
import { Building2, Save, Loader2 } from 'lucide-react';

export function CompanyProfilePage() {
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    companyService.getProfile().then((p) => {
      setExists(true);
      setCompanyName(p.company_name);
      setIndustry(p.industry ?? '');
      setSize(p.size ?? '');
      setWebsite(p.website ?? '');
      setDescription(p.description ?? '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    setSaving(true);
    setMessage('');
    try {
      const data: Partial<Company> = {
        company_name: companyName,
        industry: industry || undefined,
        size: size || undefined,
        website: website || undefined,
        description: description || undefined,
      };
      if (exists) {
        await companyService.updateProfile(data);
      } else {
        await companyService.createProfile(data);
        setExists(true);
      }
      setMessage('Profile saved!');
    } catch {
      setMessage('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" size={32} /></PageWrapper>;
  }

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg"><Building2 className="text-blue-600" size={24} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
          <p className="text-gray-500 text-sm">{exists ? 'Update your company details' : 'Set up your company profile'}</p>
        </div>
      </div>

      <GlassCard className="bg-white border-gray-100">
        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          <AnimatedInput label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="TechCorp" required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatedInput label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Technology" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
              <select value={size} onChange={(e) => setSize(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 outline-none">
                <option value="">Select size</option>
                <option value="1-10">1-10</option>
                <option value="10-50">10-50</option>
                <option value="50-100">50-100</option>
                <option value="100-500">100-500</option>
                <option value="500+">500+</option>
              </select>
            </div>
          </div>
          <AnimatedInput label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 outline-none" rows={3} placeholder="About your company..." />
          </div>

          {message && <p className={`text-sm ${message.includes('saved') ? 'text-green-600' : 'text-red-500'}`}>{message}</p>}

          <GradientButton type="submit" disabled={saving}>
            {saving ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Saving...</span> : <span className="flex items-center gap-2"><Save size={16} /> Save Profile</span>}
          </GradientButton>
        </form>
      </GlassCard>
    </PageWrapper>
  );
}
