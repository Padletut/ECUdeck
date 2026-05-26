import { WorkspaceScopeProvider } from './providers/WorkspaceScopeProvider';
import AppShell from '../layout/shell/AppShell';
import DashboardPage from '../features/workspace/components/DashboardPage';

export default function App() {
  return (
    <WorkspaceScopeProvider>
      <AppShell>
        <DashboardPage />
      </AppShell>
    </WorkspaceScopeProvider>
  );
}
