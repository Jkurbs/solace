import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['var(--font-grotesk)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex)', 'ui-monospace', 'SFMono-Regular'],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
        muted: "var(--muted)",
      },
    },
  },
  plugins: [],
} satisfies Config;
