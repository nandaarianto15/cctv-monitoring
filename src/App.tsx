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
    <div className="flex min-h-screen flex-col bg-[#0A0D13] font-sans text-[#96A0B0] antialiased selection:bg-[#7AA2F7]/30 md:flex-row">
      {/* MANDATORY: LEFT SIDEBAR NAVIGATION (NO TOP NAVBAR) */}
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        snapshot={snapshot}
        collapsed={sidebarCollapsed}
        onToggleCollapse={onToggleSidebar}
      />

      {/* Main Content Beside the Sidebar - full-bleed, pages own their layout */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <PageRouter activePage={activePage} onNavigate={onNavigate} />
        </main>
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
