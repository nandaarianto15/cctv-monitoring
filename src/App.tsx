import { useState } from 'react';
import { VisionProvider } from './state/VisionContext';
import { useVisionSnapshot } from './hooks/useVision';
import { Sidebar, type PageId } from './components/navigation/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { EmployeesPage } from './pages/EmployeesPage';
import { ActivityPage } from './pages/ActivityPage';
import { CameraManagementPage } from './pages/CameraManagementPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App(): JSX.Element {
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <VisionProvider>
      <AppShell
        activePage={activePage}
        onNavigate={setActivePage}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
    </VisionProvider>
  );
}

function AppShell({
  activePage,
  onNavigate,
  sidebarCollapsed,
  onToggleSidebar,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}): JSX.Element {
  const snapshot = useVisionSnapshot();

  return (
    <div className="flex min-h-screen bg-saas-bg text-saas-primary antialiased font-sans">
      {/* MANDATORY: LEFT SIDEBAR NAVIGATION (NO TOP NAVBAR) */}
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        snapshot={snapshot}
        collapsed={sidebarCollapsed}
        onToggleCollapse={onToggleSidebar}
      />

      {/* Main Content Beside the Sidebar */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 max-w-7xl w-full mx-auto">
          <PageRouter activePage={activePage} onNavigate={onNavigate} />
        </main>

        {/* Enterprise Bottom Subtle Status Line */}
        <footer className="border-t border-saas-border bg-white px-6 py-2.5 text-xs text-saas-secondary flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-saas-success" />
            <span className="font-medium text-[11px]">Employee Vision AI Enterprise Suite</span>
          </div>
          <span className="text-[11px] text-saas-secondary">
            Zero-persistence edge AI · No face recognition · Strict metadata logging
          </span>
        </footer>
      </div>
    </div>
  );
}

function PageRouter({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}): JSX.Element {
  switch (activePage) {
    case 'overview':
      return <OverviewPage navigate={onNavigate} />;
    case 'live':
      return <LiveMonitoringPage navigate={onNavigate} />;
    case 'workspace':
      return <WorkspacePage navigate={onNavigate} />;
    case 'employees':
      return <EmployeesPage navigate={onNavigate} />;
    case 'activity':
      return <ActivityPage />;
    case 'cameras':
      return <CameraManagementPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <OverviewPage navigate={onNavigate} />;
  }
}
