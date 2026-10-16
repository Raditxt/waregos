import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Paket workspace berisi source TypeScript, jadi dibundel ke dalam dist/index.js.
  // Dependensi npm lainnya tetap eksternal dan dibaca dari node_modules saat runtime.
  noExternal: [/^@waregos\//],
})