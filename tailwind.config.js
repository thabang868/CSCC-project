/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  // Auto follow the user's OS preference (prefers-color-scheme).
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Brand palette is locked to the logo's blue gradient
        // (#3b82f6 → #1e3a8a) so every accent — eyebrows, buttons, links,
        // rings and hero gradients — matches the top-left logo exactly.
        brand: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
          800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
        },
        ink: {
          900: '#0b1220', 800: '#0f172a', 700: '#1e293b',
          500: '#475569', 400: '#64748b', 300: '#94a3b8',
        },
      },
      fontSize: {
        'display-2xl': ['4.5rem',  { lineHeight: '1', letterSpacing: '-0.03em' }],
        'display-xl':  ['3.75rem', { lineHeight: '1', letterSpacing: '-0.025em' }],
        'display-lg':  ['3rem',    { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display':     ['2.25rem', { lineHeight: '1.1',  letterSpacing: '-0.02em' }],
      },
      boxShadow: {
        soft: '0 8px 24px -8px rgba(15,23,42,0.08), 0 1px 0 rgba(255,255,255,0.6) inset',
        lift: '0 18px 36px -12px rgba(15,23,42,0.18), 0 1px 0 rgba(255,255,255,0.6) inset',
        glow: '0 18px 40px -12px rgba(37,99,235,0.55), 0 1px 0 rgba(255,255,255,0.20) inset',
        'glow-violet': '0 18px 40px -12px rgba(124,58,237,0.55), 0 1px 0 rgba(255,255,255,0.2) inset',
        ringed: '0 0 0 1px rgba(15,23,42,0.05), 0 8px 24px -8px rgba(15,23,42,0.08)',
        innerline: '0 0 0 1px rgba(15,23,42,0.06) inset',
      },
      backgroundImage: {
        'hero-grid':
          'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)',
        'mesh-light':
          'radial-gradient(at 20% 0%, rgba(99,102,241,0.10), transparent 55%),' +
          'radial-gradient(at 88% 8%, rgba(168,85,247,0.10), transparent 55%),' +
          'radial-gradient(at 50% 100%, rgba(20,184,166,0.08), transparent 60%)',
        'mesh-dark':
          'radial-gradient(at 22% 12%, rgba(99,102,241,0.45), transparent 50%),' +
          'radial-gradient(at 78% 8%, rgba(168,85,247,0.35), transparent 55%),' +
          'radial-gradient(at 50% 88%, rgba(56,189,248,0.30), transparent 60%)',
      },
      animation: {
        'pop-in': 'popIn .25s cubic-bezier(.2,.7,.3,1.4)',
        'shine':  'shine 2.4s linear infinite',
        'float':  'float 6s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2.6s ease-in-out infinite',
      },
      keyframes: {
        popIn:     { '0%': { transform: 'scale(.96)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        shine:     { '0%':   { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        float:     { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        pulseSoft: { '0%,100%': { opacity: '0.6' }, '50%': { opacity: '1' } },
      },
    },
  },
  plugins: [],
}
