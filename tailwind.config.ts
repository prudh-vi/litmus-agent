import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0F",
        paper: "#F5F1E8",
        lime: "#D4F542",
        mist: "#EEF0F3",
        slate: "#64748B",
      },
      boxShadow: {
        brutal: "6px 6px 0px #0A0A0F",
        "brutal-sm": "4px 4px 0px #0A0A0F",
      },
    },
  },
  plugins: [],
};

export default config;
