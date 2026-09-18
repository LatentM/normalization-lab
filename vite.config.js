import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SINGLE_FILE=1 produces one JavaScript chunk instead of code-splitting, which
// is what the self-contained single-file build of the lab needs: a lazily
// imported chunk cannot be fetched when the whole application is one inlined
// <script>. The normal build keeps the split, so jsPDF (about 400 kB) is only
// downloaded when somebody actually asks for a PDF.
const singleFile = process.env.SINGLE_FILE === '1';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: singleFile ? { inlineDynamicImports: true } : {},
    },
  },
});
