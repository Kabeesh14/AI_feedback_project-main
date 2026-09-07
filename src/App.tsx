import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';

import { LandingPage } from '@/pages/LandingPage';
import { RoleSelectionPage } from '@/pages/RoleSelectionPage';
import { LoginPage } from '@/pages/LoginPage';

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

// Management pages
import { ManagementDashboard } from '@/pages/management/ManagementDashboard';
import { ManagementPulse } from '@/pages/management/ManagementPulse';
import { DepartmentComparison } from '@/pages/management/DepartmentComparison';

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

import type { Role } from '@/types';
import type { ReactNode } from 'react';

function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/role-selection" element={<RoleSelectionPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Student */}
            <Route path="/student/dashboard" element={<ProtectedLayout><StudentDashboard /></ProtectedLayout>} />
            <Route path="/student/feedback" element={<ProtectedLayout><StudentFeedback /></ProtectedLayout>} />
            <Route path="/student/ai-assistant" element={<ProtectedLayout><StudentAIAssistant /></ProtectedLayout>} />
            <Route path="/student/history" element={<ProtectedLayout><StudentHistory /></ProtectedLayout>} />
            <Route path="/student/notifications" element={<ProtectedLayout><StudentNotifications /></ProtectedLayout>} />
            <Route path="/student/profile" element={<ProtectedLayout><StudentProfile /></ProtectedLayout>} />

            {/* HOD */}
            <Route path="/hod/dashboard" element={<ProtectedLayout><HodDashboard /></ProtectedLayout>} />
            <Route path="/hod/feedback" element={<ProtectedLayout><FeedbackPage role="hod" /></ProtectedLayout>} />
            <Route path="/hod/ai-insights" element={<ProtectedLayout><HodAIInsights /></ProtectedLayout>} />
            <Route path="/hod/themes" element={<ProtectedLayout><ThemeExplorer role="hod" /></ProtectedLayout>} />
            <Route path="/hod/issues" element={<ProtectedLayout><IssueExplorer role="hod" /></ProtectedLayout>} />
            <Route path="/hod/issues/:issueId" element={<ProtectedLayout><IssueIntelligence role="hod" /></ProtectedLayout>} />
            <Route path="/hod/root-cause" element={<ProtectedLayout><RootCauseExplorer role="hod" /></ProtectedLayout>} />
            <Route path="/hod/alerts" element={<ProtectedLayout><AlertsPage role="hod" /></ProtectedLayout>} />
            <Route path="/hod/actions" element={<ProtectedLayout><ActionsPage role="hod" /></ProtectedLayout>} />
            <Route path="/hod/actions/:actionId" element={<ProtectedLayout><ImpactTracking role="hod" /></ProtectedLayout>} />
            <Route path="/hod/reports" element={<ProtectedLayout><ReportsPage /></ProtectedLayout>} />
            <Route path="/hod/ai-assistant" element={<ProtectedLayout><AnalyticsAssistant role="hod" /></ProtectedLayout>} />

            {/* Management */}
            <Route path="/management/dashboard" element={<ProtectedLayout><ManagementDashboard /></ProtectedLayout>} />
            <Route path="/management/pulse" element={<ProtectedLayout><ManagementPulse /></ProtectedLayout>} />
            <Route path="/management/feedback" element={<ProtectedLayout><FeedbackPage role="management" /></ProtectedLayout>} />
            <Route path="/management/departments" element={<ProtectedLayout><DepartmentComparison /></ProtectedLayout>} />
            <Route path="/management/themes" element={<ProtectedLayout><ThemeExplorer role="management" /></ProtectedLayout>} />
            <Route path="/management/issues" element={<ProtectedLayout><IssueExplorer role="management" /></ProtectedLayout>} />
            <Route path="/management/issues/:issueId" element={<ProtectedLayout><IssueIntelligence role="management" /></ProtectedLayout>} />
            <Route path="/management/root-cause" element={<ProtectedLayout><RootCauseExplorer role="management" /></ProtectedLayout>} />
            <Route path="/management/alerts" element={<ProtectedLayout><AlertsPage role="management" /></ProtectedLayout>} />
            <Route path="/management/actions" element={<ProtectedLayout><ActionsPage role="management" /></ProtectedLayout>} />
            <Route path="/management/actions/:actionId" element={<ProtectedLayout><ImpactTracking role="management" /></ProtectedLayout>} />
            <Route path="/management/reports" element={<ProtectedLayout><ReportsPage /></ProtectedLayout>} />
            <Route path="/management/ai-assistant" element={<ProtectedLayout><AnalyticsAssistant role="management" /></ProtectedLayout>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
