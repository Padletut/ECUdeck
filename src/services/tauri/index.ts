import { invoke } from '@tauri-apps/api/core';

import { dialogService, createDialogService } from './dialogService';
import { createPluginService } from './pluginService';

export { dialogService, createDialogService };
export const pluginService = createPluginService(invoke);

export { createPluginService } from './pluginService';
export type { DialogService, OpenDialog } from './dialogService';
export type { PluginService, TauriInvoke } from './pluginService';
