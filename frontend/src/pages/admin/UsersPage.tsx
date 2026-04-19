import { useState, useEffect, useMemo } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { adminService } from '../../services/adminService';
import type { User, UserRole } from '../../types';
import { Users, Shield, Ban, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const roleBadge: Record<string, string> = {
  student: 'bg-blue-100 text-blue-700',
  company: 'bg-emerald-100 text-emerald-700',
  admin: 'bg-red-100 text-red-700',
  college_admin: 'bg-orange-100 text-orange-700',
};

const roleFilters: (UserRole | 'all')[] = ['all', 'student', 'company', 'college_admin', 'admin'];
const roleOptions: UserRole[] = ['student', 'company', 'college_admin', 'admin'];
const PAGE_SIZE = 15;

export function UsersPage() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<UserRole | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [changingRole, setChangingRole] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    adminService.listUsers(undefined, 0, 200).then(setAllUsers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = allUsers;
    if (filter !== 'all') {
      result = result.filter((u) => u.role === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((u) =>
        (u.full_name ?? '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allUsers, filter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageUsers = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [filter, search]);

  const handleToggleActive = async (user: User) => {
    try {
      if (user.is_active) {
        await adminService.deactivateUser(user.id);
        setAllUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: false } : u)));
      } else {
        const updated = await adminService.updateUser(user.id, { is_active: true });
        setAllUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      }
    } catch { /* error */ }
  };

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    setChangingRole(userId);
    try {
      const updated = await adminService.updateUser(userId, { role: newRole });
      setAllUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch { /* error */ } finally {
      setChangingRole(null);
    }
  };

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Users className="text-emerald-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm">{allUsers.length} total users</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {roleFilters.map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
                filter === r ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r === 'all' ? 'All' : r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-3">{filtered.length} user{filtered.length !== 1 ? 's' : ''} found</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
      ) : (
        <>
          <GlassCard className="bg-white border-gray-100 p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                          {(user.full_name ?? user.email ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{user.full_name ?? '—'}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => void handleRoleChange(user.id, e.target.value as UserRole)}
                        disabled={changingRole === user.id}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer capitalize ${roleBadge[user.role] ?? 'bg-gray-100'}`}
                      >
                        {roleOptions.map((r) => (
                          <option key={r} value={r} className="bg-white text-gray-900">{r.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs ${user.is_active ? 'text-green-600' : 'text-red-500'}`}>
                        <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-500">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </PageWrapper>
  );
}
