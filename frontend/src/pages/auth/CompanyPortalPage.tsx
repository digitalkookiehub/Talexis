import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MeshBackground } from '../../components/layout/MeshBackground';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { useAuth } from '../../context/AuthContext';
import { Building2, Users, Brain, Heart, CheckCircle } from 'lucide-react';
import api from '../../services/api';

export function CompanyPortalPage() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'demo' ? 'demo' : 'login';
  const [mode, setMode] = useState<'login' | 'demo'>(defaultTab as 'login' | 'demo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Demo form state
  const [demoName, setDemoName] = useState('');
  const [demoCompany, setDemoCompany] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoPhone, setDemoPhone] = useState('');
  const [demoMessage, setDemoMessage] = useState('');
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/demo-request', null, {
        params: {
          contact_name: demoName,
          company_name: demoCompany,
          email: demoEmail,
          phone: demoPhone,
          message: demoMessage,
        },
      });
      setDemoSubmitted(true);
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <MeshBackground />
      <div className="max-w-md w-full relative z-10">
        <GlassCard className="bg-white/80 backdrop-blur-xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white mx-auto mb-3">
              <Building2 size={28} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Company / HR Portal</h1>
            <p className="text-gray-500 text-sm mt-1">Discover and hire pre-qualified talent</p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { icon: <Users size={14} />, label: 'Talent Pool' },
              { icon: <Brain size={14} />, label: 'AI Matching' },
              { icon: <Heart size={14} />, label: 'Shortlist' },
            ].map((f) => (
              <div key={f.label} className="text-center p-2 bg-emerald-50 rounded-lg">
                <div className="text-emerald-600 flex justify-center mb-1">{f.icon}</div>
                <p className="text-[10px] text-emerald-700 font-medium">{f.label}</p>
              </div>
            ))}
          </div>

          {/* Mode toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
            <button onClick={() => setMode('login')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Sign In</button>
            <button onClick={() => { setMode('demo'); setDemoSubmitted(false); }} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'demo' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Request Demo</button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={(e) => void handleLogin(e)} className="space-y-3">
              <AnimatedInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hr@company.com" required />
              <AnimatedInput label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <div className="text-right">
                <Link to="/forgot-password" className="text-xs text-emerald-600 hover:underline">Forgot Password?</Link>
              </div>

              <GradientButton type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </GradientButton>

              <p className="text-[10px] text-gray-400 text-center">
                No account? Switch to &quot;Request Demo&quot; — our team will set you up.
              </p>
            </form>
          ) : demoSubmitted ? (
            <div className="text-center py-6">
              <CheckCircle className="text-emerald-500 mx-auto mb-3" size={48} />
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Demo Requested!</h2>
              <p className="text-sm text-gray-500">Thank you, {demoName}. Our team will contact you at {demoEmail} to schedule a demo of Talexis for {demoCompany}.</p>
            </div>
          ) : (
            <form onSubmit={(e) => void handleDemo(e)} className="space-y-3">
              <AnimatedInput label="Your Name" value={demoName} onChange={(e) => setDemoName(e.target.value)} placeholder="John Smith" required />
              <AnimatedInput label="Company Name" value={demoCompany} onChange={(e) => setDemoCompany(e.target.value)} placeholder="Acme Corp" required />
              <AnimatedInput label="Work Email" type="email" value={demoEmail} onChange={(e) => setDemoEmail(e.target.value)} placeholder="john@acme.com" required />
              <AnimatedInput label="Phone (optional)" value={demoPhone} onChange={(e) => setDemoPhone(e.target.value)} placeholder="+91 98765 43210" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
                <textarea value={demoMessage} onChange={(e) => setDemoMessage(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none text-sm" rows={2}
                  placeholder="Tell us about your hiring needs..." />
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <GradientButton type="submit" className="w-full" disabled={loading}>
                {loading ? 'Submitting...' : 'Request a Demo'}
              </GradientButton>
            </form>
          )}
        </GlassCard>

        <p className="text-center text-xs text-gray-400 mt-4">
          <Link to="/" className="hover:underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
