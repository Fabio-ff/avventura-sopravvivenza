// Oggetto tenuto in mano: ricerca dell'osso e attacco di un modello statico.
import { Euler, Vector3, type Object3D } from 'three';
import type { Accessorio } from '../player/profiles';

/** Il GLTFLoader toglie da un nome `[ ] . : /` e trasforma gli spazi in `_`: si confronta così. */
export function nomeOssoPulito(nome: string): string {
  return nome.replace(/\s/g, '_').replace(/[[\].:/]/g, '');
}

/** Cerca l'osso per nome, con o senza la punteggiatura tolta dal loader; null se manca. */
export function trovaOsso(root: Object3D, nome: string): Object3D | null {
  const voluto = nomeOssoPulito(nome);
  let trovato: Object3D | null = null;
  root.traverse((o) => {
    if (!trovato && (o.name === nome || nomeOssoPulito(o.name) === voluto)) trovato = o;
  });
  return trovato;
}

/**
 * Attacca `oggetto` all'osso del modello. `altezza` è l'altezza dell'oggetto non scalato; la scala
 * locale si ricava dalla scala nel mondo dell'osso, perché l'oggetto misuri `acc.lunghezza` metri.
 * Il modello `root` deve già avere la scala e la posizione definitive. Restituisce false (con un
 * avviso) se l'osso non si trova: il personaggio resta senza oggetto.
 */
export function attaccaAccessorio(
  root: Object3D,
  oggetto: Object3D,
  altezza: number,
  acc: Accessorio,
): boolean {
  const osso = trovaOsso(root, acc.osso);
  if (!osso || !(altezza > 0)) {
    console.warn('[accessorio] osso o modello non utilizzabile, niente oggetto in mano:', acc.osso);
    return false;
  }
  root.updateWorldMatrix(true, true);
  const mondo = osso.getWorldScale(new Vector3());
  const k = acc.lunghezza / altezza;
  // la posizione è in metri del mondo: si divide per la scala dell'osso
  oggetto.scale.set(k / mondo.x, k / mondo.y, k / mondo.z);
  oggetto.position.set(
    acc.posizione[0] / mondo.x,
    acc.posizione[1] / mondo.y,
    acc.posizione[2] / mondo.z,
  );
  const r = Math.PI / 180;
  oggetto.rotation.copy(
    new Euler(acc.rotazione[0] * r, acc.rotazione[1] * r, acc.rotazione[2] * r),
  );
  osso.add(oggetto);
  return true;
}
