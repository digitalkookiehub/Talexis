import { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { adminService } from '../../services/adminService';
import type { User, UserRole } from '../../types';
import { Users, Shield, Ban, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const roleBadge: Record<string, string> = {
  student: 'bg-blue-100 text-blue-700',
  company: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
  college_admin: 'bg-green-100 text-green-700',
};

const roleFilters: (UserRole | 'all')[] = ['all', 'student', 'company', 'college_admin', 'admin'];

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<UserRole | 'all'>('all');

  useEffect(() => {
    const role = filter === 'all' ? undefined : filter;
    setLoading(true);
    adminService.listUsers(role).then(setUsers).catch(() => {}).finally(() => setLoading(false));
  }, [filter]);

  const handleToggleActive = async (user: User) => {
    try {
      if (user.is_active) {
        await adminService.deactivateUser(user.id);
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: false } : u)));
      } else {
        const updated = await adminService.updateUser(user.id, { is_active: true });
        setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      }
    } catch {
      // error
    }
  };

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Users className="text-purple-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm">{users.length} users</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {roleFilters.map((r) => (
          <motion.button
            key={r}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(r)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === r ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {r === 'all' ? 'All' : r.replace('_', ' ')}
          </motion.button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-purple-500" size={32} /></div>
      ) : (
        <GlassCard className="bg-white border-gray-100 p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">{user.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${roleBadge[user.role] ?? 'bg-gray-100'}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs ${user.is_active ? 'text-green-600' : 'text-red-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => void handleToggleActive(user)}
                      className={`p-1.5 rounded-lg ${user.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                      title={user.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {user.is_active ? <Ban size={16} /> : <Shield size={16} />}
                    </motion.button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}
    </PageWrapper>
  );
}
