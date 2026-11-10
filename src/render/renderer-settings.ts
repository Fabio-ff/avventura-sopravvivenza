export interface RendererSettings {
  antialias: boolean;
  pixelRatio: number;
}

/** Budget tablet: antialias solo su schermi a bassa densità, pixel ratio limitato a 2. */
export function rendererSettings(devicePixelRatio: number): RendererSettings {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return { antialias: dpr < 2, pixelRatio: Math.min(dpr, 2) };
}
