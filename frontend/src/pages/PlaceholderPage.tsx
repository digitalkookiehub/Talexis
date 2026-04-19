import { PageWrapper } from '../components/layout/PageWrapper';
import { GlassCard } from '../components/ui/GlassCard';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <PageWrapper className="p-0">
      <GlassCard className="bg-white border-gray-100 text-center py-12">
        <Construction className="mx-auto text-emerald-400 mb-4" size={48} />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500">{description ?? 'This page is coming soon.'}</p>
      </GlassCard>
    </PageWrapper>
  );
}
