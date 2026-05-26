import { describe, expect, it } from '@jest/globals';

import type { PluginReferenceOwnership } from '../../shared/types/plugins';
import { createPluginValidationScopeStore, type StorageLike } from './pluginValidationScopeStore';

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('createPluginValidationScopeStore', () => {
  const defaultOwnership: PluginReferenceOwnership = {
    workspaceId: 'local-workspace',
    projectId: 'dashboard-plugin-validation',
    sessionId: 'dashboard-session',
  };

  it('returns the default ownership when no scope has been persisted', () => {
    const store = createPluginValidationScopeStore(new MemoryStorage());

    expect(store.loadScope(defaultOwnership)).toEqual({
      ownership: defaultOwnership,
    });
  });

  it('persists and normalizes scope ownership', () => {
    const store = createPluginValidationScopeStore(new MemoryStorage());

    const saved = store.saveScope(
      {
        workspaceId: '  project-lab  ',
        projectId: '  edc16-core  ',
        sessionId: '  plugin-review  ',
      },
      defaultOwnership,
    );

    expect(saved).toEqual({
      ownership: {
        workspaceId: 'project-lab',
        projectId: 'edc16-core',
        sessionId: 'plugin-review',
      },
    });
    expect(store.loadScope(defaultOwnership)).toEqual(saved);
  });
});
