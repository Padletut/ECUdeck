import { useState } from 'react';

import DashboardPage from '../features/workspace/components/DashboardPage';
import PluginsPage from '../features/plugins/components/PluginsPage';
import AppShell, { type AppShellPage } from '../layout/shell/AppShell';
import { WorkspaceScopeProvider, useWorkspaceFirmware } from './providers/WorkspaceScopeProvider';

export default function App() {
  return (
    <WorkspaceScopeProvider>
      <WorkspaceApp />
    </WorkspaceScopeProvider>
  );
}

function WorkspaceApp() {
  const { closeMapEditor, openMapEditor } = useWorkspaceFirmware();
  const [activePage, setActivePage] = useState<AppShellPage>('dashboard');
  const [dashboardResetKey, setDashboardResetKey] = useState(0);
  const [pluginsResetKey, setPluginsResetKey] = useState(0);

  const navigate = (page: AppShellPage) => {
    closeMapEditor();
    setActivePage(page);

    if (page === 'dashboard') {
      setDashboardResetKey((currentValue) => currentValue + 1);
      return;
    }

    setPluginsResetKey((currentValue) => currentValue + 1);
  };

  const navigateToMapEditor = () => {
    setActivePage('dashboard');
    setDashboardResetKey((currentValue) => currentValue + 1);
    openMapEditor();
  };

  return (
    <AppShell activePage={activePage} onNavigate={navigate}>
      {activePage === 'dashboard' ? (
        <DashboardPage
          key={`dashboard-${dashboardResetKey}`}
          onOpenPluginsPage={() => navigate('plugins')}
        />
      ) : (
        <PluginsPage
          key={`plugins-${pluginsResetKey}`}
          onNavigateToDashboard={() => navigate('dashboard')}
          onOpenMapEditorFromPlugins={navigateToMapEditor}
        />
      )}
    </AppShell>
  );
}
