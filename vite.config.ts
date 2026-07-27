import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// `base` defaults to "/" (root deploy on Vercel / DigitalOcean). The
// `build:demo` script overrides it with --base=/demo/ecommerce-storefront/ so the
// app can be served from the Adminium demo sub-path.
export default defineConfig({
  plugins: [react()],
});
