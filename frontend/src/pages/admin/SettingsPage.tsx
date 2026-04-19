import { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import api from '../../services/api';
import { Settings, Database, Brain, Shield, Upload, Globe, Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface SystemSettings {
  database: { status: string; url: string };
  ollama: { status: string; base_url: string; models: string };
  openai: { configured: boolean; model: string };
  auth: { algorithm: string; access_token_expire_minutes: number; refresh_token_expire_days: number };
  upload: { upload_dir: string; max_file_size_mb: number };
  frontend_url: string;
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${online ? 'text-green-600' : 'text-red-500'}`}>
      {online ? <CheckCircle size={12} /> : <XCircle size={12} />}
      {online ? 'Online' : 'Offline'}
    </span>
  );
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = () => {
    setLoading(true);
    api.get<SystemSettings>('/admin/settings')
      .then((r) => setSettings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSettings(); }, []);

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  if (!settings) {
    return <PageWrapper><p className="text-red-500">Failed to load settings.</p></PageWrapper>;
  }

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg"><Settings className="text-gray-600" size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
            <p className="text-gray-500 text-sm">Live configuration and service health</p>
          </div>
        </div>
        <button
          onClick={loadSettings}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh status"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Database */}
        <GlassCard className="bg-white border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Database className="text-emerald-500" size={24} />
              <h2 className="font-semibold text-gray-800">Database</h2>
            </div>
            <StatusDot online={settings.database.status === 'online'} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Engine</span>
              <span className="font-medium text-gray-900">PostgreSQL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Host</span>
              <span className="font-medium text-gray-900 font-mono text-xs">{settings.database.url}</span>
            </div>
          </div>
        </GlassCard>

        {/* Ollama (Local LLM) */}
        <GlassCard className="bg-white border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Brain className="text-blue-500" size={24} />
              <h2 className="font-semibold text-gray-800">Local LLM (Ollama)</h2>
            </div>
            <StatusDot online={settings.ollama.status === 'online'} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Endpoint</span>
              <span className="font-medium text-gray-900 font-mono text-xs">{settings.ollama.base_url}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Models</span>
              <span className="font-medium text-gray-900 text-xs">{settings.ollama.models}</span>
            </div>
          </div>
        </GlassCard>

        {/* OpenAI */}
        <GlassCard className="bg-white border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Brain className="text-green-500" size={24} />
              <h2 className="font-semibold text-gray-800">Cloud LLM (OpenAI)</h2>
            </div>
            <span className={`text-xs font-medium ${settings.openai.configured ? 'text-green-600' : 'text-gray-400'}`}>
              {settings.openai.configured ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Model</span>
              <span className="font-medium text-gray-900">{settings.openai.model}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Role</span>
              <span className="font-medium text-gray-900">Fallback for evaluation</span>
            </div>
          </div>
        </GlassCard>

        {/* Auth & Security */}
        <GlassCard className="bg-white border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-orange-500" size={24} />
            <h2 className="font-semibold text-gray-800">Security</h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Algorithm</span>
              <span className="font-medium text-gray-900">{settings.auth.algorithm}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Access Token</span>
              <span className="font-medium text-gray-900">{settings.auth.access_token_expire_minutes} min</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Refresh Token</span>
              <span className="font-medium text-gray-900">{settings.auth.refresh_token_expire_days} days</span>
            </div>
          </div>
        </GlassCard>

        {/* Upload */}
        <GlassCard className="bg-white border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="text-pink-500" size={24} />
            <h2 className="font-semibold text-gray-800">File Upload</h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Upload Directory</span>
              <span className="font-medium text-gray-900 font-mono text-xs">{settings.upload.upload_dir}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Max File Size</span>
              <span className="font-medium text-gray-900">{settings.upload.max_file_size_mb} MB</span>
            </div>
          </div>
        </GlassCard>

        {/* Frontend */}
        <GlassCard className="bg-white border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="text-indigo-500" size={24} />
            <h2 className="font-semibold text-gray-800">Frontend</h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">URL</span>
              <span className="font-medium text-gray-900 font-mono text-xs">{settings.frontend_url}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Stack</span>
              <span className="font-medium text-gray-900">React + Vite + Tailwind</span>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="bg-yellow-50 border-yellow-200 mt-6">
        <p className="text-xs text-yellow-700">
          <strong>Note:</strong> Settings are configured via environment variables in <code>backend/.env</code>.
          Restart the backend after making changes. Use the refresh button above to check live service status.
        </p>
      </GlassCard>
    </PageWrapper>
  );
}
