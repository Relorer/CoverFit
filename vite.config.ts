import { defineConfig, type Plugin } from 'vite';
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve, sep } from 'node:path';

const require = createRequire(import.meta.url);

const ORT_RUNTIME_FILES = [
  'ort-wasm-simd-threaded.asyncify.mjs',
  'ort-wasm-simd-threaded.asyncify.wasm',
];

const ORT_RUNTIME_DIR = dirname(require.resolve('onnxruntime-web'));

function ortRuntime(): Plugin {
  return {
    name: 'coverfit-ort-runtime',

    configureServer(server) {
      const prefix = '/ort';
      server.middlewares.use((req, res, next) => {
        const q = req.url.indexOf('?');
        const path = q >= 0 ? decodeURIComponent(req.url.slice(0, q)) : decodeURIComponent(req.url);
        if (!path.startsWith(prefix)) {
          return next();
        }
        const rel = path.slice(prefix.length).replace(/^\//, '');
        const filePath = resolve(ORT_RUNTIME_DIR, rel);
        if (!filePath.startsWith(ORT_RUNTIME_DIR + sep)) {
          return next();
        }
        try {
          const stats = statSync(filePath);
          if (!stats.isFile()) return next();
          const type = filePath.endsWith('.wasm')
            ? 'application/wasm'
            : filePath.endsWith('.mjs') || filePath.endsWith('.js')
              ? 'text/javascript; charset=utf-8'
              : 'application/octet-stream';
          res.writeHead(200, {
            'content-type': type,
            'content-length': String(stats.size),
            'cache-control': 'no-cache',
          });
          createReadStream(filePath).pipe(res);
        } catch {
          next();
        }
      });
    },

    generateBundle() {
      for (const name of ORT_RUNTIME_FILES) {
        this.emitFile({
          type: 'asset',
          fileName: `ort/${name}`,
          source: readFileSync(join(ORT_RUNTIME_DIR, name)),
        });
      }
    },
  };
}

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4096,
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  resolve: {
    conditions: ['onnxruntime-web-use-extern-wasm', 'module', 'browser', 'default'],
  },
  plugins: [ortRuntime()],
});
