import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Auth pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Student pages
import { StudentDashboardPage } from './pages/student/DashboardPage';
import { StudentProfilePage } from './pages/student/ProfilePage';
import { ResumePage } from './pages/student/ResumePage';
import { InterviewSelectPage } from './pages/student/InterviewSelectPage';
import { LiveInterviewPage } from './pages/student/LiveInterviewPage';
import { InterviewResultsPage } from './pages/student/InterviewResultsPage';
import { InterviewHistoryPage } from './pages/student/InterviewHistoryPage';
import { ReadinessPage } from './pages/student/ReadinessPage';
import { LearningHubPage } from './pages/student/LearningHubPage';
import { LearningModulePage } from './pages/student/LearningModulePage';

// Company pages
import { CompanyDashboardPage } from './pages/company/DashboardPage';
import { CompanyProfilePage } from './pages/company/ProfilePage';
import { TalentBrowsePage } from './pages/company/TalentBrowsePage';
import { TalentDetailPage } from './pages/company/TalentDetailPage';
import { ShortlistPage } from './pages/company/ShortlistPage';
import { JobsPage } from './pages/company/JobsPage';

// Admin pages
import { AdminDashboardPage } from './pages/admin/DashboardPage';
import { UsersPage } from './pages/admin/UsersPage';
import { AdminAnalyticsPage } from './pages/admin/AnalyticsPage';

// Placeholder for pages not yet built
import { PlaceholderPage } from './pages/PlaceholderPage';

import type { UserRole } from './types';

const dashboardByRole: Record<UserRole, string> = {
  student: '/student/dashboard',
  college_admin: '/admin',
  company: '/company/dashboard',
  admin: '/admin',
};

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={dashboardByRole[user.role]} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<RootRedirect />} />

      {/* Student routes */}
      <Route
        path="/student/*"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <AppLayout>
              <Routes>
                <Route path="dashboard" element={<StudentDashboardPage />} />
                <Route path="profile" element={<StudentProfilePage />} />
                <Route path="resume" element={<ResumePage />} />
                <Route path="skills" element={<PlaceholderPage title="Skill Assessment" />} />
                <Route path="interviews" element={<InterviewSelectPage />} />
                <Route path="interviews/history" element={<InterviewHistoryPage />} />
                <Route path="interviews/:id" element={<LiveInterviewPage />} />
                <Route path="interviews/:id/results" element={<InterviewResultsPage />} />
                <Route path="interviews/:id/feedback" element={<InterviewResultsPage />} />
                <Route path="scorecard" element={<PlaceholderPage title="Scorecard" />} />
                <Route path="readiness" element={<ReadinessPage />} />
                <Route path="learn" element={<LearningHubPage />} />
                <Route path="learn/:id" element={<LearningModulePage />} />
                <Route path="analytics" element={<PlaceholderPage title="Student Analytics" />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Company routes */}
      <Route
        path="/company/*"
        element={
          <ProtectedRoute allowedRoles={['company']}>
            <AppLayout>
              <Routes>
                <Route path="dashboard" element={<CompanyDashboardPage />} />
                <Route path="profile" element={<CompanyProfilePage />} />
                <Route path="talents" element={<TalentBrowsePage />} />
                <Route path="talents/:code" element={<TalentDetailPage />} />
                <Route path="shortlist" element={<ShortlistPage />} />
                <Route path="jobs" element={<JobsPage />} />
                <Route path="analytics" element={<PlaceholderPage title="Company Analytics" />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['admin', 'college_admin']}>
            <AppLayout>
              <Routes>
                <Route index element={<AdminDashboardPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="settings" element={<PlaceholderPage title="System Settings" />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
