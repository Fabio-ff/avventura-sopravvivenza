import { defineConfig } from 'vite';

// BASE_PATH è impostato dal workflow di deploy su Pages (es. "/avventura-sopravvivenza/"); in locale vale "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  build: {
    target: 'es2022',
    sourcemap: 'hidden',
    // Three.js con GLTFLoader e SkeletonUtils pesa circa 630 kB minificato; il chunk dell'app resta molto sotto.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        // Vite 8 usa Rolldown: Three.js ha un chunk proprio, che il browser può tenere in cache a lungo.
        codeSplitting: { groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }] },
      },
    },
  },
});
