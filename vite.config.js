import { defineConfig } from "vite";
import { resolve } from "node:path";

// Multi-page build: Vite only bundles index.html unless every page is listed.
export default defineConfig({
  esbuild: { jsx: "automatic" },
  optimizeDeps: {
    entries: ["index.html", "work.html", "src/work/motion/runtime.jsx"],
    include: [
      "react",
      "react-dom/client",
      "motion/react",
      "three",
      "three/addons/environments/RoomEnvironment.js",
    ],
  },
  build: {
    rollupOptions: {
      // These pages run entirely in the browser; RSC directives have no role here.
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('"use client"')) return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three';
          if (/\/node_modules\/(react|react-dom|motion|motion-dom|motion-utils|framer-motion)\//.test(id)) return 'motion-ui';
        },
      },
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        work: resolve(import.meta.dirname, "work.html"),
        "work/designs/acidwave": resolve(
          import.meta.dirname,
          "work/designs/acidwave.html",
        ),
        "work/designs/y2k-futurism": resolve(
          import.meta.dirname,
          "work/designs/y2k-futurism.html",
        ),
        "work/designs/k-design": resolve(
          import.meta.dirname,
          "work/designs/k-design.html",
        ),
        "work/designs/dreamscape": resolve(
          import.meta.dirname,
          "work/designs/dreamscape.html",
        ),
        "work/designs/halftone": resolve(
          import.meta.dirname,
          "work/designs/halftone.html",
        ),
        "work/designs/hyperbloom": resolve(
          import.meta.dirname,
          "work/designs/hyperbloom.html",
        ),
        "work/designs/neo-brutalism": resolve(
          import.meta.dirname,
          "work/designs/neo-brutalism.html",
        ),
        "work/designs/neo-swiss": resolve(
          import.meta.dirname,
          "work/designs/neo-swiss.html",
        ),
        "work/designs/synthwave": resolve(
          import.meta.dirname,
          "work/designs/synthwave.html",
        ),
        "work/designs/vector-surrealism": resolve(
          import.meta.dirname,
          "work/designs/vector-surrealism.html",
        ),
        "work/motion/outform": resolve(
          import.meta.dirname,
          "work/motion/outform.html",
        ),
        "work/motion/helios": resolve(
          import.meta.dirname,
          "work/motion/helios.html",
        ),
        "work/motion/prism": resolve(
          import.meta.dirname,
          "work/motion/prism.html",
        ),
        "work/motion/bloomfield": resolve(
          import.meta.dirname,
          "work/motion/bloomfield.html",
        ),
        "work/motion/ribbon": resolve(
          import.meta.dirname,
          "work/motion/ribbon.html",
        ),
        "work/motion/shelf": resolve(
          import.meta.dirname,
          "work/motion/shelf.html",
        ),
        "work/motion/orbital": resolve(
          import.meta.dirname,
          "work/motion/orbital.html",
        ),
        "work/motion/totem": resolve(
          import.meta.dirname,
          "work/motion/totem.html",
        ),
        "work/motion/axiom": resolve(
          import.meta.dirname,
          "work/motion/axiom.html",
        ),
        "work/motion/synapse": resolve(
          import.meta.dirname,
          "work/motion/synapse.html",
        ),
        "work/motion/mina": resolve(
          import.meta.dirname,
          "work/motion/mina.html",
        ),
        "work/motion/softspot": resolve(
          import.meta.dirname,
          "work/motion/softspot.html",
        ),
        "work/motion/rail": resolve(
          import.meta.dirname,
          "work/motion/rail.html",
        ),
        "work/motion/echo-zero": resolve(
          import.meta.dirname,
          "work/motion/echo-zero.html",
        ),
        "work/motion/talia": resolve(
          import.meta.dirname,
          "work/motion/talia.html",
        ),
        "work/motion/akai": resolve(
          import.meta.dirname,
          "work/motion/akai.html",
        ),
        "work/clinic": resolve(import.meta.dirname, "work/clinic.html"),
        "work/restaurant": resolve(import.meta.dirname, "work/restaurant.html"),
        "work/realty": resolve(import.meta.dirname, "work/realty.html"),
        "work/dashboard": resolve(import.meta.dirname, "work/dashboard.html"),
        "work/bot-store": resolve(import.meta.dirname, "work/bot-store.html"),
        "work/conversy-app": resolve(
          import.meta.dirname,
          "work/conversy-app.html",
        ),
        "work/ninja-hr": resolve(import.meta.dirname, "work/ninja-hr.html"),
        "work/ninja-learn": resolve(
          import.meta.dirname,
          "work/ninja-learn.html",
        ),
        "work/curriculearn": resolve(
          import.meta.dirname,
          "work/curriculearn.html",
        ),
        "work/irina": resolve(import.meta.dirname, "work/irina.html"),
        "work/story": resolve(import.meta.dirname, "work/story.html"),
        "work/ninja-commerce": resolve(
          import.meta.dirname,
          "work/ninja-commerce.html",
        ),
        "work/trades": resolve(import.meta.dirname, "work/trades.html"),
        "work/dealer": resolve(import.meta.dirname, "work/dealer.html"),
      },
    },
  },
  server: {
    // Bot demos call the deployed relay while developing locally.
    proxy: {
      "/api": { target: "https://localninja.web.app", changeOrigin: true },
    },
  },
});
