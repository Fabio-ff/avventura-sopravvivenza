import { Bone, Group, Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { loadProfiles, profileFor } from '../src/player/profiles';
import { attaccaAccessorio, nomeOssoPulito, trovaOsso } from '../src/render/accessorio';

const acc = {
  modello: 'props/x.glb',
  osso: 'mixamorig:RightHand',
  lunghezza: 2,
  posizione: [0, 1, 0] as [number, number, number],
  rotazione: [0, 0, 0] as [number, number, number],
};

function scheletro(nomeOsso: string, scala = 1): { root: Group; osso: Bone } {
  const root = new Group();
  root.scale.setScalar(scala);
  const osso = new Bone();
  osso.name = nomeOsso;
  root.add(osso);
  return { root, osso };
}

describe('ricerca dell’osso', () => {
  it('ignora i due punti tolti dal loader', () => {
    expect(nomeOssoPulito('mixamorig:RightHand')).toBe('mixamorigRightHand');
    const { root, osso } = scheletro('mixamorigRightHand');
    expect(trovaOsso(root, 'mixamorig:RightHand')).toBe(osso);
  });

  it('trova anche il nome con i due punti e restituisce null se manca', () => {
    const { root, osso } = scheletro('mixamorig:RightHand');
    expect(trovaOsso(root, 'mixamorig:RightHand')).toBe(osso);
    expect(trovaOsso(root, 'mixamorig:LeftHand')).toBeNull();
  });
});

describe('attacco dell’accessorio', () => {
  it('ricava la scala locale da quella dell’osso nel mondo', () => {
    const { root, osso } = scheletro('mixamorigRightHand', 2);
    const oggetto = new Object3D();
    expect(attaccaAccessorio(root, oggetto, 1, acc)).toBe(true);
    expect(oggetto.parent).toBe(osso);
    // lunghezza 2 su altezza 1 = 2 nel mondo, osso x2 = 1 in locale
    expect(oggetto.scale.y).toBeCloseTo(1);
    expect(oggetto.position.y).toBeCloseTo(0.5);
  });

  it('senza osso avvisa e non attacca nulla', () => {
    const avviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { root } = scheletro('altro');
    const oggetto = new Object3D();
    expect(attaccaAccessorio(root, oggetto, 1, acc)).toBe(false);
    expect(oggetto.parent).toBeNull();
    expect(avviso).toHaveBeenCalled();
    avviso.mockRestore();
  });
});

describe('profilo: accessorio', () => {
  it('solo il Mago ha il bastone', () => {
    expect(profileFor('mago').accessorio?.modello).toBe('props/bastone-mago.glb');
    expect(profileFor('ninja').accessorio).toBeUndefined();
  });

  it('valida i campi', () => {
    const base = () => JSON.parse(JSON.stringify(loadProfiles())) as Record<string, unknown>[];
    const a = base();
    a[0].accessorio = { ...acc, lunghezza: 0 };
    expect(() => loadProfiles(a)).toThrow(/accessorio\.lunghezza/);
    const b = base();
    b[0].accessorio = { ...acc, posizione: [0, 1] };
    expect(() => loadProfiles(b)).toThrow(/accessorio\.posizione/);
    const c = base();
    c[0].accessorio = { ...acc, osso: '' };
    expect(() => loadProfiles(c)).toThrow(/accessorio\.osso/);
    const d = base();
    d[0].accessorio = acc;
    expect(loadProfiles(d)[0]!.accessorio?.osso).toBe('mixamorig:RightHand');
  });
});
