import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const { PORT = '3000' } = loadEnv(mode, '..', 'PORT');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': `http://localhost:${PORT}`,
      },
    },
  };
});
