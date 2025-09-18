// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  output: "static",
  site: "https://unforknepal.org",
  integrations: [sitemap()],

  // Image optimization
  image: {
    // Enable image optimization with Sharp
    service: {
      entrypoint: "astro/assets/services/sharp",
    },
  },

  // Build optimizations
  build: {
    // Minify HTML and inline small stylesheets
    inlineStylesheets: "auto",
  },

  // Vite optimizations for better performance
  vite: {
    build: {
      // Chunk splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["astro"],
          },
        },
      },
      // Minify with esbuild (faster than terser)
      minify: "esbuild",
    },
  },
});
