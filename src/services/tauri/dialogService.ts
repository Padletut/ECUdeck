import { open } from '@tauri-apps/plugin-dialog';

export type OpenDialog = (options?: {
  defaultPath?: string;
  directory?: boolean;
  multiple?: boolean;
  title?: string;
}) => Promise<string | string[] | null>;

export interface DialogService {
  pickDirectory(defaultPath?: string): Promise<string | null>;
}

export function createDialogService(openDialog: OpenDialog): DialogService {
  return {
    async pickDirectory(defaultPath?: string): Promise<string | null> {
      const selection = await openDialog({
        defaultPath,
        directory: true,
        multiple: false,
        title: 'Select plugin directory',
      });

      if (typeof selection === 'string') {
        return selection;
      }

      if (Array.isArray(selection)) {
        return selection[0] ?? null;
      }

      return null;
    },
  };
}

export const dialogService = createDialogService(open);
