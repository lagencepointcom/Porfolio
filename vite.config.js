import { defineConfig } from 'vite';

// Changez 'Porfolio' si votre dépôt GitHub a un autre nom
const REPO_NAME = 'Porfolio';

// Port unique pour dev ET preview — toujours http://localhost:5173/
const PORT = 5173;

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? `/${REPO_NAME}/` : '/',
  server: {
    port: PORT,
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  preview: {
    port: PORT,
    strictPort: true,
  },
});
