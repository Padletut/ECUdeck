import { invoke } from '@tauri-apps/api/core';

import { createPluginService } from './pluginService';

export const pluginService = createPluginService(invoke);

export { createPluginService } from './pluginService';
export type { PluginService, TauriInvoke } from './pluginService';
