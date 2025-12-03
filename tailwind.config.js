// tailwind.config.js
/** @type {import('tailwindcss').Config} */
import daisyui from "daisyui";

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,js,jsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                poppins: ["Poppins", "sans-serif"],
                inter: ["Inter", "sans-serif"],
            },
        },
    },
    plugins: [daisyui],
    daisyui: {
        themes: [
            {
                light: {
                    "primary": "#1D4ED8",
                    "primary-content": "#ffffff",
                    "secondary": "#93C5FD",
                    "accent": "#FACC15",
                    "neutral": "#6B7280",
                    "base-100": "#F3F4F6",
                    "info": "#93C5FD",
                    "success": "#16A34A",
                    "warning": "#FACC15",
                    "error": "#DC2626",
                },
            },
        ],
        darkTheme: "light",
        base: true,
        styled: true,
        utils: true,
    },
}