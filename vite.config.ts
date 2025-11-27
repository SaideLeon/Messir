import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseadas no modo atual (development/production)
  // O terceiro argumento '' permite carregar todas as variáveis, não apenas as que começam com VITE_
  // Fix: Cast process to any to bypass missing Node.js type definitions for cwd() in this context
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // CRÍTICO: Substitui 'process.env.API_KEY' pelo valor real da variável durante o build.
      // Isso corrige o erro "ReferenceError: process is not defined" no navegador e carrega sua chave.
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.API_KEY),
    },
    server: {
      port: 3004,
      host: true, // Libera acesso externo (0.0.0.0)
      allowedHosts: ['messir.nativespeak.app'],
    },
    preview: {
      port: 3004,
      host: true, // Libera acesso externo (0.0.0.0)
      allowedHosts: ['messir.nativespeak.app'],
    },
    build: {
      target: 'esnext', // Garante suporte a recursos modernos
    }
  };
});