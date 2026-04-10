import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { Settings, Database, Brain, Shield, Server } from 'lucide-react';

const settings = [
  {
    icon: <Database className="text-purple-500" size={24} />,
    title: 'Database',
    items: [
      { label: 'Engine', value: 'PostgreSQL 15' },
      { label: 'Migrations', value: 'Alembic (managed)' },
      { label: 'Connection Pool', value: 'Pool pre-ping enabled' },
    ],
  },
  {
    icon: <Brain className="text-blue-500" size={24} />,
    title: 'AI / LLM',
    items: [
      { label: 'Local LLM', value: 'Ollama (qwen2.5:3b)' },
      { label: 'Cloud LLM', value: 'OpenAI GPT-4o (fallback to Ollama)' },
      { label: 'Question Generation', value: 'Local + topic randomization' },
      { label: 'Evaluation', value: 'Cloud or local LLM' },
    ],
  },
  {
    icon: <Shield className="text-green-500" size={24} />,
    title: 'Security & Anti-Cheat',
    items: [
      { label: 'Auth', value: 'JWT (HS256)' },
      { label: 'Access Token', value: '30 minutes' },
      { label: 'Refresh Token', value: '7 days' },
      { label: 'Max Interview Attempts', value: '5 per type' },
      { label: 'Similarity Threshold', value: '75%' },
    ],
  },
  {
    icon: <Server className="text-orange-500" size={24} />,
    title: 'Infrastructure',
    items: [
      { label: 'Backend', value: 'FastAPI + Uvicorn' },
      { label: 'Frontend', value: 'React 19 + Vite + Tailwind' },
      { label: 'Container', value: 'Docker + docker-compose' },
      { label: 'CI/CD', value: 'GitHub Actions' },
    ],
  },
];

export function SettingsPage() {
  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gray-100 rounded-lg"><Settings className="text-gray-600" size={24} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-500 text-sm">Platform configuration overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settings.map((section) => (
          <GlassCard key={section.title} className="bg-white border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              {section.icon}
              <h2 className="font-semibold text-gray-800">{section.title}</h2>
            </div>
            <div className="space-y-2">
              {section.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="font-medium text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="bg-yellow-50 border-yellow-200 mt-6">
        <p className="text-xs text-yellow-700">
          <strong>Note:</strong> Settings are configured via environment variables in <code>backend/.env</code>.
          Restart the backend after making changes.
        </p>
      </GlassCard>
    </PageWrapper>
  );
}
