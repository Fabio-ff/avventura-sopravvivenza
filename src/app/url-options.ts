/** Opzioni lette dall'indirizzo (query string). */
export interface UrlOptions {
  /** Mostra il contatore fps; `?fps=0` lo nasconde. */
  showFps: boolean;
}

export function readUrlOptions(search: string): UrlOptions {
  const params = new URLSearchParams(search);
  return { showFps: params.get('fps') !== '0' };
}
