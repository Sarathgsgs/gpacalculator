import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// If you run locally with `vercel dev`, you generally don't need a proxy.
// If you run with `npm run dev` (vite only), /api won't exist unless you host it separately.
export default defineConfig({
  plugins: [react()]
});