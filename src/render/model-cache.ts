import { Mesh, SkinnedMesh, type AnimationClip, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface LoadedModel {
  scene: Object3D;
  clips: AnimationClip[];
}

/** La parte del risultato di GLTFLoader che questo modulo legge; i test la simulano. */
export interface GltfLike {
  scene: Object3D;
  animations: AnimationClip[];
}

export interface ModelLoader {
  loadAsync(url: string): Promise<GltfLike>;
}

export interface LoadModelOptions {
  loader?: ModelLoader;
  /** Dopo questo tempo si rinuncia e si usa il segnaposto. */
  timeoutMs?: number;
  /** Dove vive `assets/`; Vite lo imposta, così Pages funziona sotto il suo sottopercorso. */
  baseUrl?: string;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const cache = new Map<string, Promise<LoadedModel | null>>();

/** Dimentica ogni modello caricato (test; una sessione non ne ha bisogno). */
export function clearModelCache(): void {
  cache.clear();
}

async function fetchModel(
  file: string,
  loader: ModelLoader,
  baseUrl: string,
  timeoutMs: number,
): Promise<LoadedModel> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`scaduto dopo ${timeoutMs} ms`)), timeoutMs);
  });
  try {
    const gltf = await Promise.race([loader.loadAsync(`${baseUrl}assets/${file}`), timeout]);
    return { scene: gltf.scene, clips: gltf.animations };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Carica `assets/<file>` una volta per sessione. Non rifiuta mai: un caricamento fallito o lento
 * scrive un avviso `[model] segnaposto per <file>` e risolve null, così il gioco parte comunque.
 */
export function loadCharacterModel(
  file: string,
  options: LoadModelOptions = {},
): Promise<LoadedModel | null> {
  const cached = cache.get(file);
  if (cached) return cached;
  const loader = options.loader ?? new GLTFLoader();
  const baseUrl = options.baseUrl ?? import.meta.env.BASE_URL;
  const pending = fetchModel(file, loader, baseUrl, options.timeoutMs ?? DEFAULT_TIMEOUT_MS).catch(
    (error: unknown) => {
      console.warn('[model] segnaposto per', file, error);
      return null;
    },
  );
  cache.set(file, pending);
  return pending;
}

/**
 * Un'istanza di un modello caricato per una vista: lo scheletro è clonato. Le mesh con scheletro
 * non vengono mai escluse dal frustum: three le esclude con i limiti della posa di base, che un
 * personaggio in posa può superare. Niente ombre dinamiche (budget tablet).
 */
export function instantiate(model: LoadedModel): LoadedModel {
  const scene = skeletonClone(model.scene);
  scene.traverse((object) => {
    if (object instanceof Mesh || object instanceof SkinnedMesh) object.frustumCulled = false;
  });
  return { scene, clips: model.clips };
}
