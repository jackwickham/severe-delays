/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "index.html"],
  theme: {
    extend: {
      colors: {
        "page-background": "var(--page-background)",
      }
    },
  },
  plugins: [],
};
