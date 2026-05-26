import { describe, expect, it, jest } from '@jest/globals';

import { createDialogService, type OpenDialog } from './dialogService';

describe('createDialogService', () => {
  it('returns the selected directory path', async () => {
    const openDialog = jest.fn(async () => '/tmp/plugins');
    const service = createDialogService(openDialog as unknown as OpenDialog);

    await expect(service.pickDirectory('/tmp')).resolves.toBe('/tmp/plugins');
    expect(openDialog).toHaveBeenCalledWith({
      defaultPath: '/tmp',
      directory: true,
      multiple: false,
      title: 'Select plugin directory',
    });
  });

  it('normalizes canceled selections to null', async () => {
    const openDialog = jest.fn(async () => null);
    const service = createDialogService(openDialog as unknown as OpenDialog);

    await expect(service.pickDirectory()).resolves.toBeNull();
  });

  it('normalizes array selections to the first path', async () => {
    const openDialog = jest.fn(async () => ['/tmp/plugins', '/tmp/other']);
    const service = createDialogService(openDialog as unknown as OpenDialog);

    await expect(service.pickDirectory()).resolves.toBe('/tmp/plugins');
  });

  it('returns the selected manifest file path', async () => {
    const openDialog = jest.fn(async () => '/tmp/plugins/metadata.json');
    const service = createDialogService(openDialog as unknown as OpenDialog);

    await expect(service.pickManifestFile('/tmp/plugins')).resolves.toBe(
      '/tmp/plugins/metadata.json',
    );
    expect(openDialog).toHaveBeenCalledWith({
      defaultPath: '/tmp/plugins',
      directory: false,
      filters: [
        {
          name: 'Plugin manifests',
          extensions: ['json'],
        },
      ],
      multiple: false,
      title: 'Select plugin manifest',
    });
  });

  it('normalizes canceled manifest selections to null', async () => {
    const openDialog = jest.fn(async () => null);
    const service = createDialogService(openDialog as unknown as OpenDialog);

    await expect(service.pickManifestFile()).resolves.toBeNull();
  });
});
