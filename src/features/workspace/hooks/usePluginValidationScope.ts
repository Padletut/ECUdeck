import { useState } from 'react';

import { pluginValidationScopeStore } from '../../../services/storage/pluginValidationScopeStore';
import type { PluginReferenceOwnership } from '../../../shared/types/plugins';

interface PluginValidationScopeState {
  ownership: PluginReferenceOwnership;
  draftOwnership: PluginReferenceOwnership;
  canApplyScope: boolean;
  setDraftField: (field: keyof PluginReferenceOwnership, value: string) => void;
  applyScope: () => void;
}

export function usePluginValidationScope(
  defaultOwnership: PluginReferenceOwnership,
): PluginValidationScopeState {
  const [ownership, setOwnership] = useState(
    () => pluginValidationScopeStore.loadScope(defaultOwnership).ownership,
  );
  const [draftOwnership, setDraftOwnership] = useState(ownership);

  const setDraftField = (field: keyof PluginReferenceOwnership, value: string) => {
    setDraftOwnership((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  };

  const applyScope = () => {
    const nextScope = pluginValidationScopeStore.saveScope(draftOwnership, defaultOwnership);

    setOwnership(nextScope.ownership);
    setDraftOwnership(nextScope.ownership);
  };

  return {
    ownership,
    draftOwnership,
    canApplyScope:
      draftOwnership.workspaceId.trim().length > 0 && !sameOwnership(ownership, draftOwnership),
    setDraftField,
    applyScope,
  };
}

function sameOwnership(left: PluginReferenceOwnership, right: PluginReferenceOwnership): boolean {
  return (
    left.workspaceId === right.workspaceId &&
    left.projectId === right.projectId &&
    left.sessionId === right.sessionId
  );
}
