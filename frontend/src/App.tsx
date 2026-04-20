import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Auth pages
import { HomePage } from './pages/auth/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { StudentPortalPage } from './pages/auth/StudentPortalPage';
import { PlacementPortalPage } from './pages/auth/PlacementPortalPage';
import { CompanyPortalPage } from './pages/auth/CompanyPortalPage';
import { PricingPage } from './pages/auth/PricingPage';
import { PaymentSuccessPage } from './pages/auth/PaymentSuccessPage';

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
import { StudentAnalyticsPage } from './pages/student/AnalyticsPage';
import { SkillsPage } from './pages/student/SkillsPage';
import { ScorecardPage } from './pages/student/ScorecardPage';
import { JobBoardPage } from './pages/student/JobBoardPage';

// Company pages
import { CompanyDashboardPage } from './pages/company/DashboardPage';
import { CompanyProfilePage } from './pages/company/ProfilePage';
import { TalentBrowsePage } from './pages/company/TalentBrowsePage';
import { TalentDetailPage } from './pages/company/TalentDetailPage';
import { ShortlistPage } from './pages/company/ShortlistPage';
import { JobsPage } from './pages/company/JobsPage';
import { CompanyAnalyticsPage } from './pages/company/AnalyticsPage';
import { SchedulePage } from './pages/company/SchedulePage';

// College admin pages
import { CollegeDashboardPage } from './pages/college/DashboardPage';
import { StudentRosterPage } from './pages/college/StudentRosterPage';
import { CollegeAnalyticsPage } from './pages/college/CollegeAnalyticsPage';
import { PlacementPage } from './pages/college/PlacementPage';

// Admin pages
import { AdminDashboardPage } from './pages/admin/DashboardPage';
import { UsersPage } from './pages/admin/UsersPage';
import { AdminAnalyticsPage } from './pages/admin/AnalyticsPage';
import { AntiCheatPage } from './pages/admin/AntiCheatPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { WorkflowPage } from './pages/admin/WorkflowPage';
import { MonitoringPage } from './pages/admin/MonitoringPage';
import { UserGuidePage } from './pages/admin/UserGuidePage';

import type { UserRole } from './types';

const dashboardByRole: Record<UserRole, string> = {
  student: '/student/dashboard',
  college_admin: '/college',
  company: '/company/dashboard',
  admin: '/admin',
};

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <HomePage />;
  return <Navigate to={dashboardByRole[user.role]} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/student/login" element={<StudentPortalPage />} />
      <Route path="/placement/login" element={<PlacementPortalPage />} />
      <Route path="/hire/login" element={<CompanyPortalPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/payment/success" element={<PaymentSuccessPage />} />

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
                <Route path="skills" element={<SkillsPage />} />
                <Route path="interviews" element={<InterviewSelectPage />} />
                <Route path="interviews/history" element={<InterviewHistoryPage />} />
                <Route path="interviews/:id" element={<LiveInterviewPage />} />
                <Route path="interviews/:id/results" element={<InterviewResultsPage />} />
                <Route path="interviews/:id/feedback" element={<InterviewResultsPage />} />
                <Route path="scorecard" element={<ScorecardPage />} />
                <Route path="readiness" element={<ReadinessPage />} />
                <Route path="learn" element={<LearningHubPage />} />
                <Route path="learn/:id" element={<LearningModulePage />} />
                <Route path="jobs" element={<JobBoardPage />} />
                <Route path="analytics" element={<StudentAnalyticsPage />} />
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
                <Route path="schedule" element={<SchedulePage />} />
                <Route path="analytics" element={<CompanyAnalyticsPage />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* College admin routes */}
      <Route
        path="/college/*"
        element={
          <ProtectedRoute allowedRoles={['college_admin']}>
            <AppLayout>
              <Routes>
                <Route index element={<CollegeDashboardPage />} />
                <Route path="students" element={<StudentRosterPage />} />
                <Route path="analytics" element={<CollegeAnalyticsPage />} />
                <Route path="placements" element={<PlacementPage />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout>
              <Routes>
                <Route index element={<AdminDashboardPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="anticheat" element={<AntiCheatPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="workflow" element={<WorkflowPage />} />
                <Route path="guide" element={<UserGuidePage />} />
                <Route path="monitoring" element={<MonitoringPage />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
