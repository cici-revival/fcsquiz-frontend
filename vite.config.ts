import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@app": path.resolve(__dirname, "./src/app"),
        "@shared": path.resolve(__dirname, "./src/shared"),
        "@entities": path.resolve(__dirname, "./src/entities"),
        "@features": path.resolve(__dirname, "./src/features"),
        "@widgets": path.resolve(__dirname, "./src/widgets"),
        "@pages": path.resolve(__dirname, "./src/pages"),
        "@types": path.resolve(__dirname, "./src/types"),
      },
    },

    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Вся React-экосистема одной группой: она стабильна между
            // релизами, поэтому браузер переиспользует её из кэша.
            // Дробить её по отдельным чанкам нельзя — между ними возникает
            // порядок инициализации и получается "Cannot access before
            // initialization", причём только в prod-сборке.
            // Якоря [\\/] обязательны: без них под правило попали бы
            // react-hot-toast, react-widgets, @radix-ui/react-* и т.п.
            if (
              /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(
                id,
              )
            ) {
              return "react-vendor";
            }
          },
        },
      },
    },

    server: {
      host: true,
      port: 5173,
      hmr: {
        clientPort: 5173,
      },
      watch: {
        usePolling: true,
        interval: 1000,
      },
      proxy: {
        "/api": {
          target: env.API_PROXY_TARGET,
          changeOrigin: true,
        },
      },
    },
  };
});
