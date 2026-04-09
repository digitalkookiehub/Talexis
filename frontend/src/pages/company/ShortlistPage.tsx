import { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { talentService } from '../../services/talentService';
import type { CompanyShortlist, ShortlistStatus } from '../../types';
import { Heart, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const statusOptions: ShortlistStatus[] = ['shortlisted', 'contacted', 'rejected', 'hired'];
const statusColors: Record<string, string> = {
  shortlisted: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
  hired: 'bg-green-100 text-green-700',
};

export function ShortlistPage() {
  const [items, setItems] = useState<CompanyShortlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    talentService.getShortlist().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id: number, status: ShortlistStatus) => {
    try {
      const updated = await talentService.updateShortlistStatus(id, status);
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch {
      // error
    }
  };

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" size={32} /></PageWrapper>;
  }

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-pink-100 rounded-lg"><Heart className="text-pink-600" size={24} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shortlist</h1>
          <p className="text-gray-500 text-sm">{items.length} candidates shortlisted</p>
        </div>
      </div>

      {items.length === 0 ? (
        <GlassCard className="bg-white border-gray-100 text-center py-12">
          <Heart className="text-gray-300 mx-auto mb-3" size={48} />
          <p className="text-gray-500">No candidates shortlisted yet. Browse the talent pool to find candidates.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard className="bg-white border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Candidate #{item.talent_profile_id}</p>
                    <p className="text-xs text-gray-500">
                      Shortlisted: {item.shortlisted_at ? new Date(item.shortlisted_at).toLocaleDateString() : '—'}
                    </p>
                    {item.notes && <p className="text-sm text-gray-600 mt-1">{item.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={item.status}
                      onChange={(e) => void handleStatusChange(item.id, e.target.value as ShortlistStatus)}
                      className={`text-xs font-medium px-3 py-1 rounded-full border-0 cursor-pointer ${statusColors[item.status] ?? ''}`}
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
