const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  mode: "jit",
  purge: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", ...fontFamily.sans],
        sinkin: ['"Sinkin Sans"', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: "8px",
        secondary: "4px",
        container: "12px",
      },
      boxShadow: {
        DEFAULT: "0 1px 4px rgba(0, 0, 0, 0.1)",
        hover: "0 2px 8px rgba(0, 0, 0, 0.12)",
      },
      colors: {
        primary: {
          // Coffee brown primary
          DEFAULT: "#5C4033",
          hover: "#4A3328",
        },
        secondary: {
          DEFAULT: "#6B7280",
          hover: "#4B5563",
        },
        accent: {
          // Warm accent brown
          DEFAULT: "#A47148",
          hover: "#8B5A36",
        },
        // Override Tailwind's purple scale with a coffee-brown palette
        purple: {
          50: "#FDF6F1",
          100: "#F4E4D4",
          200: "#E6C9AD",
          300: "#D3A77F",
          400: "#B98055",
          500: "#965835",
          600: "#7A4228",
          700: "#5C301F",
          800: "#3F2016",
          900: "#2A140E",
        },
      },
      spacing: {
        "form-field": "16px",
        section: "32px",
      },
    },
  },
  variants: {
    extend: {
      boxShadow: ["hover", "active"],
    },
  },
};
