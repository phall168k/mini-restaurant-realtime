// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_URL
    }
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@element-plus/nuxt',
    '@nuxtjs/google-fonts',
    '@nuxtjs/i18n',
  ],
  googleFonts: {
    families: {
      Nokora: true,
    }
  },
  tailwindcss: {
    config: {
      theme: {
        fontFamily: {
          sans: ['"Nokora"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
          Nokora: ['"Nokora"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        }
      }
    }
  },
  i18n: {
    locales: [
      { code: 'en', file: 'en.json', language: 'en-US' },
      { code: 'km', file: 'km.json', language: 'KH' }
    ],
    defaultLocale: 'en',
    langDir: 'locales/',     // folder name
    strategy: 'no_prefix',   // /page (no /en/page)
  },
})