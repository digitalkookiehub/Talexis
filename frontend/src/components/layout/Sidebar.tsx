import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, User, FileText, Brain, ClipboardCheck,
  TrendingUp, BookOpen, BarChart3, Building2, Users,
  Briefcase, Heart, Settings, LogOut, GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import { cn } from '../../lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const studentNav: NavItem[] = [
  { to: '/student/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { to: '/student/profile', label: 'Profile', icon: <User size={20} /> },
  { to: '/student/resume', label: 'Resume', icon: <FileText size={20} /> },
  { to: '/student/interviews', label: 'Interviews', icon: <Brain size={20} /> },
  { to: '/student/interviews/history', label: 'History', icon: <ClipboardCheck size={20} /> },
  { to: '/student/scorecard', label: 'Scorecard', icon: <ClipboardCheck size={20} /> },
  { to: '/student/readiness', label: 'Readiness', icon: <TrendingUp size={20} /> },
  { to: '/student/skills', label: 'Skills', icon: <ClipboardCheck size={20} /> },
  { to: '/student/learn', label: 'Learn', icon: <BookOpen size={20} /> },
  { to: '/student/analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
];

const companyNav: NavItem[] = [
  { to: '/company/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { to: '/company/profile', label: 'Company Profile', icon: <Building2 size={20} /> },
  { to: '/company/talents', label: 'Talent Pool', icon: <Users size={20} /> },
  { to: '/company/shortlist', label: 'Shortlist', icon: <Heart size={20} /> },
  { to: '/company/jobs', label: 'Job Roles', icon: <Briefcase size={20} /> },
  { to: '/company/analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
];

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { to: '/admin/users', label: 'Users', icon: <Users size={20} /> },
  { to: '/admin/analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
  { to: '/admin/settings', label: 'Settings', icon: <Settings size={20} /> },
];

const navByRole: Record<UserRole, NavItem[]> = {
  student: studentNav,
  college_admin: adminNav,
  company: companyNav,
  admin: adminNav,
};

export function Sidebar() {
  const { user, logout } = useAuth();
  const navItems = user ? navByRole[user.role] : [];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-purple-600" size={28} />
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            Talexis
          </h1>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-sm font-semibold">
              {user.full_name?.charAt(0)?.toUpperCase() ?? user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.full_name ?? user.email}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Logout
          </motion.button>
        </div>
      )}
    </aside>
  );
}
