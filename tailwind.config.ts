import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // WoW Gold - Primary accent
        wow: {
          gold: {
            DEFAULT: "#FFD700",
            50: "#FFFBEB",
            100: "#FFF5C2",
            200: "#FFEE85",
            300: "#FFE748",
            400: "#FFE01C",
            500: "#FFD700",
            600: "#CCAC00",
            700: "#998100",
            800: "#665600",
            900: "#332B00",
          },
        },
        // TRON Silver - Secondary
        tron: {
          silver: {
            DEFAULT: "#C0C0C0",
            50: "#F8F9FA",
            100: "#E9ECEF",
            200: "#DEE2E6",
            300: "#CED4DA",
            400: "#ADB5BD",
            500: "#C0C0C0",
            600: "#999999",
            700: "#737373",
            800: "#4D4D4D",
            900: "#262626",
          },
        },
        // Sapphire Blue - Accent
        sapphire: {
          DEFAULT: "#1E90FF",
          50: "#E6F4FF",
          100: "#BAE0FF",
          200: "#8CC8FF",
          300: "#5DAFFF",
          400: "#3FA6FF",
          500: "#1E90FF",
          600: "#0078D4",
          700: "#005A9E",
          800: "#004269",
          900: "#002B45",
        },
        // Shadow Purple - Accent
        shadow: {
          purple: {
            DEFAULT: "#8B5CF6",
            50: "#F5F3FF",
            100: "#EDE9FE",
            200: "#DDD6FE",
            300: "#C4B5FD",
            400: "#A78BFA",
            500: "#8B5CF6",
            600: "#7C3AED",
            700: "#6D28D9",
            800: "#5B21B6",
            900: "#4C1D95",
          },
        },
        // Void Purple - Background
        void: {
          purple: {
            DEFAULT: "#2D1B4E",
            50: "#F5F3FF",
            100: "#EBE7FE",
            200: "#D9D0FC",
            300: "#C4B5F8",
            400: "#A78BF0",
            500: "#8B5CE6",
            600: "#6D28D9",
            700: "#5B21B6",
            800: "#4C1D95",
            900: "#2D1B4E",
            950: "#1A0F2E",
          },
        },
        // Dark backgrounds
        dark: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#020617",
        },
        // Theme colors
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      fontFamily: {
        display: ["var(--font-cinzel)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      backgroundImage: {
        "gradient-main":
          "linear-gradient(180deg, #020617 0%, #0F172A 50%, #1E293B 100%)",
        "gradient-epic":
          "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)",
        "gradient-mystic":
          "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 50%, #5B21B6 100%)",
        "gradient-sapphire":
          "linear-gradient(135deg, #1E90FF 0%, #0078D4 50%, #005A9E 100%)",
        "gradient-void":
          "linear-gradient(135deg, #2D1B4E 0%, #1A0F2E 50%, #0F172A 100%)",
        "gradient-card":
          "linear-gradient(180deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)",
      },
      boxShadow: {
        epic: "0 0 20px rgba(255, 215, 0, 0.3)",
        mystic: "0 0 20px rgba(139, 92, 246, 0.3)",
        sapphire: "0 0 20px rgba(30, 144, 255, 0.3)",
        elevated: "0 10px 25px rgba(0, 0, 0, 0.5)",
        glow: "0 0 30px rgba(255, 215, 0, 0.4)",
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "pulse-gold": "pulse-gold 2s infinite",
        glow: "glow 2s infinite",
        float: "float 3s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-gold": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 15px rgba(255, 215, 0, 0.3)",
          },
          "50%": {
            opacity: "0.8",
            boxShadow: "0 0 25px rgba(255, 215, 0, 0.5)",
          },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(255, 215, 0, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(255, 215, 0, 0.5)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
