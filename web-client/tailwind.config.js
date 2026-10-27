/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Brand tokens inherited from Enterprise Design System
        ts: {
          primary: "var(--ts-primary)",
          "primary-hover": "var(--ts-primary-hover)",
          "primary-soft": "var(--ts-primary-soft)",
          cyan: "var(--ts-cyan)",
          "cyan-hover": "var(--ts-cyan-hover)",
          "cyan-soft": "var(--ts-cyan-soft)",
          dark: "var(--ts-dark)",
          light: "var(--ts-light)",
          surface: "var(--ts-surface)",
          border: "var(--ts-border)",
          "border-strong": "var(--ts-border-strong)",
          muted: "var(--ts-muted)",
          "muted-light": "var(--ts-muted-light)",
          // Refined Semantic Status Colors (Jade, Amber-Gold, Rose-Crimson)
          success: {
            DEFAULT: "var(--ts-success)",
            hover: "var(--ts-success-hover)",
            soft: "var(--ts-success-soft)",
            border: "var(--ts-success-border)",
            text: "var(--ts-success-text)",
            subtle: "var(--ts-success-subtle)",
          },
          warning: {
            DEFAULT: "var(--ts-warning)",
            hover: "var(--ts-warning-hover)",
            soft: "var(--ts-warning-soft)",
            border: "var(--ts-warning-border)",
            text: "var(--ts-warning-text)",
            subtle: "var(--ts-warning-subtle)",
          },
          danger: {
            DEFAULT: "var(--ts-danger)",
            hover: "var(--ts-danger-hover)",
            soft: "var(--ts-danger-soft)",
            border: "var(--ts-danger-border)",
            text: "var(--ts-danger-text)",
            subtle: "var(--ts-danger-subtle)",
          },
        },
      },
      backgroundImage: {
        "ts-gradient": "var(--ts-gradient)",
        "ts-gradient-cyan": "var(--ts-gradient-cyan)",
        "ts-gradient-subtle": "var(--ts-gradient-subtle)",
      },
      boxShadow: {
        "ts-xs": "var(--ts-shadow-xs)",
        "ts-soft": "var(--ts-shadow-soft)",
        "ts-hover": "var(--ts-shadow-hover)",
        "ts-glow": "var(--ts-shadow-glow)",
        "ts-card": "var(--ts-shadow-card)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "ts-xs": "var(--ts-radius-xs)",
        "ts-sm": "var(--ts-radius-sm)",
        "ts-md": "var(--ts-radius-md)",
        "ts-lg": "var(--ts-radius-lg)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
