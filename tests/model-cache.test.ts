import { Group } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearModelCache, loadCharacterModel, type ModelLoader } from '../src/render/model-cache';

describe('loadCharacterModel', () => {
  beforeEach(() => {
    clearModelCache();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('risolve null se il loader fallisce', async () => {
    const loader: ModelLoader = { loadAsync: () => Promise.reject(new Error('GLB malformato')) };
    await expect(loadCharacterModel('x.glb', { loader, baseUrl: '/' })).resolves.toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('risolve null se il loader va in timeout', async () => {
    const loader: ModelLoader = { loadAsync: () => new Promise(() => undefined) };
    const result = loadCharacterModel('y.glb', { loader, baseUrl: '/', timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    await expect(result).resolves.toBeNull();
  });

  it('risolve il modello se il loader riesce', async () => {
    const scene = new Group();
    const loader: ModelLoader = { loadAsync: () => Promise.resolve({ scene, animations: [] }) };
    const result = await loadCharacterModel('z.glb', { loader, baseUrl: '/' });
    expect(result?.scene).toBe(scene);
  });
});
