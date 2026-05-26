import { invoke } from '@tauri-apps/api/core';

import { aiService, createAiService } from './aiService';
import { dialogService, createDialogService } from './dialogService';
import { createPluginService } from './pluginService';

export { aiService, createAiService };
export { dialogService, createDialogService };
export const pluginService = createPluginService(invoke);

export type {
  AiAssistRequestPreview,
  AiService,
  BuildPrepareContextSnapshotRequestInput,
  BuildSendAiChatRequestInput,
} from './aiService';
export { createPluginService } from './pluginService';
export type { DialogService, OpenDialog } from './dialogService';
export type { PluginService, TauriInvoke } from './pluginService';
