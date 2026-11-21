// UV in scala mondo per una scatola: la texture si ripete ogni `TILE` metri su tutte le facce,
// qualunque sia la dimensione. Funzione pura, nessuna dipendenza da three.
import type { Vec3 } from './solids';

/** Lato in metri di una ripetizione della texture. */
export const TILE = 2;

/**
 * UV nell'ordine di `BoxGeometry` (+x, -x, +y, -y, +z, -z; 4 vertici per faccia: in alto a sinistra,
 * in alto a destra, in basso a sinistra, in basso a destra). Restituisce 48 numeri (u, v).
 * Le coordinate partono dall'angolo minimo della scatola in coordinate mondo, così facce vicine
 * di scatole diverse hanno lo stesso passo. Con ripetizione a specchio non servono altri accorgimenti.
 */
export function worldBoxUVs(center: Vec3, size: Vec3, tile: number = TILE): Float32Array {
  const min = {
    x: (center.x - size.x / 2) / tile,
    y: (center.y - size.y / 2) / tile,
    z: (center.z - size.z / 2) / tile,
  };
  const s = { x: size.x / tile, y: size.y / tile, z: size.z / tile };
  const out = new Float32Array(48);
  let o = 0;
  // u0, du: asse orizzontale della faccia; v0, dv: asse verticale (v cresce verso l'alto o la profondità)
  const face = (u0: number, du: number, v0: number, dv: number): void => {
    // vertici: (u0, v1) (u1, v1) (u0, v0) (u1, v0), con v1 = v0 + dv
    const u1 = u0 + du;
    const v1 = v0 + dv;
    out.set([u0, v1, u1, v1, u0, v0, u1, v0], o);
    o += 8;
  };
  face(min.z, s.z, min.y, s.y); // +x: u lungo z, v lungo y
  face(min.z, s.z, min.y, s.y); // -x
  face(min.x, s.x, min.z, s.z); // +y: u lungo x, v lungo z
  face(min.x, s.x, min.z, s.z); // -y
  face(min.x, s.x, min.y, s.y); // +z: u lungo x, v lungo y
  face(min.x, s.x, min.y, s.y); // -z
  return out;
}
