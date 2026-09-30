import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { BusScopeProvider } from '@/context/BusScopeContext';
import { HostelScopeProvider } from '@/context/HostelScopeContext';
import { AppLayout } from '@/components/layout/AppLayout';

import { LandingPage } from '@/pages/LandingPage';
import { PortalSelectionPage } from '@/pages/PortalSelectionPage';
import { RoleSelectionPage } from '@/pages/RoleSelectionPage';
import { LoginPage } from '@/pages/LoginPage';
import { StudentGoogleRegistration } from '@/pages/StudentGoogleRegistration';

// Student pages
import { StudentDashboard } from '@/pages/student/StudentDashboard';
import { StudentFeedback } from '@/pages/student/StudentFeedback';
import { StudentAIAssistant } from '@/pages/student/StudentAIAssistant';
import { StudentHistory } from '@/pages/student/StudentHistory';
import { StudentNotifications } from '@/pages/student/StudentNotifications';
import { StudentProfile } from '@/pages/student/StudentProfile';

// HOD pages
import { HodDashboard } from '@/pages/hod/HodDashboard';
import { HodAIInsights } from '@/pages/hod/HodAIInsights';
import { HodRecommendations } from '@/pages/hod/HodRecommendations';
import { HodFormParticipation } from '@/pages/hod/HodFormParticipation';

// Faculty pages
import { FacultyDashboard } from '@/pages/faculty/FacultyDashboard';
import { FacultySurvey } from '@/pages/faculty/FacultySurvey';
import { FacultyHistory } from '@/pages/faculty/FacultyHistory';

// Management pages
import { ManagementDashboard } from '@/pages/management/ManagementDashboard';
import { ManagementPulse } from '@/pages/management/ManagementPulse';
import { DepartmentComparison } from '@/pages/management/DepartmentComparison';
import { ManagementRecommendations } from '@/pages/management/ManagementRecommendations';

// Shared pages
import { FeedbackPage } from '@/pages/shared/FeedbackPage';
import { ThemeExplorer } from '@/pages/shared/ThemeExplorer';
import { IssueExplorer } from '@/pages/shared/IssueExplorer';
import { IssueIntelligence } from '@/pages/shared/IssueIntelligence';
import { RootCauseExplorer } from '@/pages/shared/RootCauseExplorer';
import { AlertsPage } from '@/pages/shared/AlertsPage';
import { ActionsPage } from '@/pages/shared/ActionsPage';
import { ImpactTracking } from '@/pages/shared/ImpactTracking';
import { ReportsPage } from '@/pages/shared/ReportsPage';
import { AnalyticsAssistant } from '@/pages/shared/AnalyticsAssistant';

import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import type { Role, PortalType } from '@/types';

// Bus Portal pages
import { BusDashboard } from '@/pages/bus/BusDashboard';
import { BusFeedbackPage } from '@/pages/bus/BusFeedbackPage';
import { BusIssuesPage } from '@/pages/bus/BusIssuesPage';
import { BusActionsPage } from '@/pages/bus/BusActionsPage';
import { BusAnalyticsPage } from '@/pages/bus/BusAnalyticsPage';

// Hostel Portal pages
import { HostelDashboard } from '@/pages/hostel/HostelDashboard';
import { HostelFeedbackPage } from '@/pages/hostel/HostelFeedbackPage';
import { HostelIssuesPage } from '@/pages/hostel/HostelIssuesPage';
import { HostelActionsPage } from '@/pages/hostel/HostelActionsPage';
import { HostelAnalyticsPage } from '@/pages/hostel/HostelAnalyticsPage';
import { useEffect, type ReactNode } from 'react';

function ProtectedLayout({
  children,
  allowedRoles,
  allowedPortals
}: {
  children: ReactNode;
  allowedRoles?: Role[];
  allowedPortals?: PortalType[];
}) {
  const { user, loading, switchPortal } = useAuth();

  useEffect(() => {
    if (user && user.role === 'management' && allowedPortals && allowedPortals.length === 1) {
      const target = allowedPortals[0];
      if (user.portal !== target) {
        switchPortal(target);
      }
    }
  }, [user?.role, user?.portal, allowedPortals]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 size={36} className="animate-spin mb-3 text-blue-500" />
        <p className="text-sm font-medium">Restoring session...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const roleDefaultRoutes: Record<Role, string> = {
    student: user.portal === 'bus' ? '/bus/dashboard' : user.portal === 'hostel' ? '/hostel/dashboard' : '/student/dashboard',
    faculty: '/faculty/dashboard',
    hod: '/hod/dashboard',
    management: '/management/dashboard',
    bus_incharge: '/bus/dashboard',
    transport_incharge: '/bus/dashboard',
    hostel_warden: '/hostel/dashboard',
  };

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleDefaultRoutes[user.role] || '/login'} replace />;
  }

  if (allowedPortals && user.role !== 'management' && !allowedPortals.includes(user.portal || 'education')) {
    return <Navigate to={roleDefaultRoutes[user.role] || '/login'} replace />;
  }

  return (
    <AppLayout>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </AppLayout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BusScopeProvider>
          <HostelScopeProvider>
            <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/portal-selection" element={<PortalSelectionPage />} />
            <Route path="/portal" element={<PortalSelectionPage />} />
            <Route path="/portal/bus" element={<RoleSelectionPage forcedPortal="bus" />} />
            <Route path="/portal/hostel" element={<RoleSelectionPage forcedPortal="hostel" />} />
            <Route path="/portal/education" element={<RoleSelectionPage forcedPortal="education" />} />
            <Route path="/role-selection" element={<RoleSelectionPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register-setup" element={<StudentGoogleRegistration />} />
            <Route path="/student/register-setup" element={<StudentGoogleRegistration />} />

            {/* Student */}
            <Route path="/student/dashboard" element={<ProtectedLayout allowedRoles={['student']} allowedPortals={['education']}><StudentDashboard /></ProtectedLayout>} />
            <Route path="/student/feedback" element={<ProtectedLayout allowedRoles={['student']} allowedPortals={['education']}><StudentFeedback /></ProtectedLayout>} />
            <Route path="/student/actions" element={<ProtectedLayout allowedRoles={['student']} allowedPortals={['education']}><ActionsPage role="student" /></ProtectedLayout>} />
            <Route path="/student/ai-assistant" element={<ProtectedLayout allowedRoles={['student']} allowedPortals={['education']}><StudentAIAssistant /></ProtectedLayout>} />
            <Route path="/student/history" element={<ProtectedLayout allowedRoles={['student']} allowedPortals={['education']}><StudentHistory /></ProtectedLayout>} />
            <Route path="/student/notifications" element={<ProtectedLayout allowedRoles={['student']}><StudentNotifications /></ProtectedLayout>} />
            <Route path="/student/alerts" element={<Navigate to="/student/notifications" replace />} />
            <Route path="/student/profile" element={<ProtectedLayout allowedRoles={['student']}><StudentProfile /></ProtectedLayout>} />

            {/* Bus Portal */}
            <Route path="/bus/dashboard" element={<ProtectedLayout allowedRoles={['student', 'bus_incharge', 'transport_incharge', 'management']} allowedPortals={['bus']}><BusDashboard /></ProtectedLayout>} />
            <Route path="/bus/feedback" element={<ProtectedLayout allowedRoles={['student', 'bus_incharge', 'transport_incharge', 'management']} allowedPortals={['bus']}><BusFeedbackPage /></ProtectedLayout>} />
            <Route path="/bus/issues" element={<ProtectedLayout allowedRoles={['student', 'bus_incharge', 'transport_incharge', 'management']} allowedPortals={['bus']}><BusIssuesPage /></ProtectedLayout>} />
            <Route path="/bus/actions" element={<ProtectedLayout allowedRoles={['student', 'bus_incharge', 'transport_incharge', 'management']} allowedPortals={['bus']}><BusActionsPage /></ProtectedLayout>} />
            <Route path="/bus/analytics" element={<ProtectedLayout allowedRoles={['bus_incharge', 'transport_incharge', 'management']} allowedPortals={['bus']}><BusAnalyticsPage /></ProtectedLayout>} />

            {/* Hostel Portal */}
            <Route path="/hostel/dashboard" element={<ProtectedLayout allowedRoles={['student', 'hostel_warden', 'management']} allowedPortals={['hostel']}><HostelDashboard /></ProtectedLayout>} />
            <Route path="/hostel/feedback" element={<ProtectedLayout allowedRoles={['student', 'hostel_warden', 'management']} allowedPortals={['hostel']}><HostelFeedbackPage /></ProtectedLayout>} />
            <Route path="/hostel/issues" element={<ProtectedLayout allowedRoles={['student', 'hostel_warden', 'management']} allowedPortals={['hostel']}><HostelIssuesPage /></ProtectedLayout>} />
            <Route path="/hostel/actions" element={<ProtectedLayout allowedRoles={['student', 'hostel_warden', 'management']} allowedPortals={['hostel']}><HostelActionsPage /></ProtectedLayout>} />
            <Route path="/hostel/analytics" element={<ProtectedLayout allowedRoles={['hostel_warden', 'management']} allowedPortals={['hostel']}><HostelAnalyticsPage /></ProtectedLayout>} />

            {/* Faculty */}
            <Route path="/faculty/dashboard" element={<ProtectedLayout allowedRoles={['faculty']}><FacultyDashboard /></ProtectedLayout>} />
            <Route path="/faculty/surveys" element={<ProtectedLayout allowedRoles={['faculty']}><FacultySurvey /></ProtectedLayout>} />
            <Route path="/faculty/feedback" element={<Navigate to="/faculty/dashboard" replace />} />
            <Route path="/faculty/student-feedback" element={<ProtectedLayout allowedRoles={['faculty']}><HodFormParticipation role="faculty" /></ProtectedLayout>} />
            <Route path="/faculty/student-feedback/:id" element={<ProtectedLayout allowedRoles={['faculty']}><HodFormParticipation role="faculty" /></ProtectedLayout>} />
            <Route path="/faculty/actions" element={<Navigate to="/faculty/dashboard" replace />} />
            <Route path="/faculty/history" element={<ProtectedLayout allowedRoles={['faculty']}><FacultyHistory /></ProtectedLayout>} />
            <Route path="/faculty/issues" element={<ProtectedLayout allowedRoles={['faculty']}><IssueExplorer role="faculty" /></ProtectedLayout>} />
            <Route path="/faculty/issues/:issueId" element={<ProtectedLayout allowedRoles={['faculty']}><IssueIntelligence role="faculty" /></ProtectedLayout>} />
            <Route path="/faculty/insights" element={<Navigate to="/faculty/dashboard" replace />} />
            <Route path="/faculty/ai-assistant" element={<ProtectedLayout allowedRoles={['faculty']}><AnalyticsAssistant role="faculty" /></ProtectedLayout>} />
            <Route path="/faculty/forms" element={<ProtectedLayout allowedRoles={['faculty']}><HodFormParticipation role="faculty" /></ProtectedLayout>} />
            <Route path="/faculty/forms/:id/participation" element={<ProtectedLayout allowedRoles={['faculty']}><HodFormParticipation role="faculty" /></ProtectedLayout>} />
            <Route path="/faculty/notifications" element={<ProtectedLayout allowedRoles={['faculty']}><StudentNotifications /></ProtectedLayout>} />
            <Route path="/faculty/profile" element={<ProtectedLayout allowedRoles={['faculty']}><StudentProfile /></ProtectedLayout>} />

            {/* HOD */}
            <Route path="/hod/dashboard" element={<ProtectedLayout allowedRoles={['hod']}><HodDashboard /></ProtectedLayout>} />
            <Route path="/hod/forms" element={<ProtectedLayout allowedRoles={['hod']}><HodFormParticipation role="hod" /></ProtectedLayout>} />
            <Route path="/hod/forms/:id/participation" element={<ProtectedLayout allowedRoles={['hod']}><HodFormParticipation role="hod" /></ProtectedLayout>} />
            <Route path="/hod/feedback" element={<Navigate to="/hod/forms" replace />} />
            <Route path="/hod/recommendations" element={<Navigate to="/hod/dashboard" replace />} />
            <Route path="/hod/ai-insights" element={<ProtectedLayout allowedRoles={['hod']}><HodAIInsights /></ProtectedLayout>} />
            <Route path="/hod/themes" element={<ProtectedLayout allowedRoles={['hod']}><ThemeExplorer role="hod" /></ProtectedLayout>} />
            <Route path="/hod/issues" element={<ProtectedLayout allowedRoles={['hod']}><IssueExplorer role="hod" /></ProtectedLayout>} />
            <Route path="/hod/issues/:issueId" element={<ProtectedLayout allowedRoles={['hod']}><IssueIntelligence role="hod" /></ProtectedLayout>} />
            <Route path="/hod/root-cause" element={<Navigate to="/hod/dashboard" replace />} />
            <Route path="/hod/alerts" element={<Navigate to="/hod/dashboard" replace />} />
            <Route path="/hod/actions" element={<Navigate to="/hod/dashboard" replace />} />
            <Route path="/hod/actions/:actionId" element={<Navigate to="/hod/dashboard" replace />} />
            <Route path="/hod/reports" element={<ProtectedLayout allowedRoles={['hod']}><ReportsPage /></ProtectedLayout>} />
            <Route path="/hod/ai-assistant" element={<ProtectedLayout allowedRoles={['hod']}><AnalyticsAssistant role="hod" /></ProtectedLayout>} />
            <Route path="/hod/profile" element={<ProtectedLayout allowedRoles={['hod']}><StudentProfile /></ProtectedLayout>} />

            {/* Management */}
            <Route path="/management/dashboard" element={<ProtectedLayout allowedRoles={['management']}><ManagementDashboard /></ProtectedLayout>} />
            <Route path="/management/feedback" element={<ProtectedLayout allowedRoles={['management']}><HodFormParticipation role="management" /></ProtectedLayout>} />
            <Route path="/management/feedback/:id" element={<ProtectedLayout allowedRoles={['management']}><HodFormParticipation role="management" /></ProtectedLayout>} />
            <Route path="/management/feedback/:id/participation" element={<ProtectedLayout allowedRoles={['management']}><HodFormParticipation role="management" /></ProtectedLayout>} />
            <Route path="/management/forms" element={<Navigate to="/management/feedback" replace />} />
            <Route path="/management/forms/:id" element={<Navigate to="/management/feedback" replace />} />
            <Route path="/management/forms/:id/participation" element={<Navigate to="/management/feedback" replace />} />
            <Route path="/management/pulse" element={<Navigate to="/management/dashboard" replace />} />
            <Route path="/management/recommendations" element={<Navigate to="/management/dashboard" replace />} />
            <Route path="/management/departments" element={<ProtectedLayout allowedRoles={['management']}><DepartmentComparison /></ProtectedLayout>} />
            <Route path="/management/themes" element={<ProtectedLayout allowedRoles={['management']}><ThemeExplorer role="management" /></ProtectedLayout>} />
            <Route path="/management/issues" element={<ProtectedLayout allowedRoles={['management']}><IssueExplorer role="management" /></ProtectedLayout>} />
            <Route path="/management/issues/:issueId" element={<ProtectedLayout allowedRoles={['management']}><IssueIntelligence role="management" /></ProtectedLayout>} />
            <Route path="/management/root-cause" element={<Navigate to="/management/dashboard" replace />} />
            <Route path="/management/alerts" element={<Navigate to="/management/dashboard" replace />} />
            <Route path="/management/actions" element={<Navigate to="/management/dashboard" replace />} />
            <Route path="/management/actions/:actionId" element={<Navigate to="/management/dashboard" replace />} />
            <Route path="/management/impact" element={<Navigate to="/management/dashboard" replace />} />
            <Route path="/management/reports" element={<ProtectedLayout allowedRoles={['management']}><ReportsPage /></ProtectedLayout>} />
            <Route path="/management/ai-assistant" element={<ProtectedLayout allowedRoles={['management']}><AnalyticsAssistant role="management" /></ProtectedLayout>} />
            <Route path="/management/profile" element={<ProtectedLayout allowedRoles={['management']}><StudentProfile /></ProtectedLayout>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </BrowserRouter>
          </HostelScopeProvider>
        </BusScopeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
