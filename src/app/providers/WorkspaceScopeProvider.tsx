import { createContext, useContext, type ReactNode } from 'react';

import { useFirmwareWorkspaceState } from '../../features/workspace/hooks/useFirmwareWorkspaceState';
import { usePluginValidationScope } from '../../features/workspace/hooks/usePluginValidationScope';
import type { PluginReferenceOwnership } from '../../shared/types/plugins';

const defaultPluginValidationOwnership: PluginReferenceOwnership = {
  workspaceId: 'local-workspace',
  projectId: 'dashboard-plugin-validation',
  sessionId: 'dashboard-session',
};

type WorkspaceScopeContextValue = ReturnType<typeof usePluginValidationScope>;
type WorkspaceFirmwareContextValue = ReturnType<typeof useFirmwareWorkspaceState>;

const WorkspaceScopeContext = createContext<WorkspaceScopeContextValue | null>(null);
const WorkspaceFirmwareContext = createContext<WorkspaceFirmwareContextValue | null>(null);

export function WorkspaceScopeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const scopeState = usePluginValidationScope(defaultPluginValidationOwnership);
  const firmwareState = useFirmwareWorkspaceState(scopeState.ownership);

  return (
    <WorkspaceScopeContext.Provider value={scopeState}>
      <WorkspaceFirmwareContext.Provider value={firmwareState}>
        {children}
      </WorkspaceFirmwareContext.Provider>
    </WorkspaceScopeContext.Provider>
  );
}

export function useWorkspaceScope(): WorkspaceScopeContextValue {
  const contextValue = useContext(WorkspaceScopeContext);

  if (!contextValue) {
    throw new Error('useWorkspaceScope must be used within a WorkspaceScopeProvider.');
  }

  return contextValue;
}

export function useWorkspaceFirmware(): WorkspaceFirmwareContextValue {
  const contextValue = useContext(WorkspaceFirmwareContext);

  if (!contextValue) {
    throw new Error('useWorkspaceFirmware must be used within a WorkspaceScopeProvider.');
  }

  return contextValue;
}
