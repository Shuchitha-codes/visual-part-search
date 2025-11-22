import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Safely inject the API URL specifically
      'process.env.REACT_APP_API_URL': JSON.stringify(env.REACT_APP_API_URL),
      // Also inject full process.env for other potential needs, but properly stringified
      'process.env': JSON.stringify(env)
    },
    server: {
      port: 3000,
      open: true
    }
  };
});