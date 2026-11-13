/** Differenza d'angolo più corta da `from` a `to`, in (-π, π]. */
export function angleDelta(from: number, to: number): number {
  const twoPi = Math.PI * 2;
  let d = (to - from) % twoPi;
  if (d > Math.PI) d -= twoPi;
  else if (d <= -Math.PI) d += twoPi;
  return d;
}

/** Avvicina `current` a `target` per la via più corta, in modo morbido (esponenziale). */
export function approachAngle(current: number, target: number, rate: number, dt: number): number {
  return current + angleDelta(current, target) * (1 - Math.exp(-rate * Math.max(0, dt)));
}
