import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import compress from 'astro-compress'
import icon from 'astro-icon'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'
import prefixBasePath from './integrations/prefix-base-path.mjs'

// https://astro.build/config
export default defineConfig({
  compressHTML: true,
  // SITE_URL and BASE_PATH are set by the deploy workflow from the GitHub Pages
  // settings, e.g. https://<owner>.github.io and /<repo> for a project site.
  // Locally the site is served from the root.
  site: process.env.SITE_URL || 'https://kidcyproject.github.io/',
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'cs', 'de', 'lt', 'no'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  output: 'static',
  integrations: [mdx(), icon(), prefixBasePath(), compress()],
  vite: {
    build: {
      cssCodeSplit: false,
    },
    css: {
      preprocessorOptions: {
        scss: {
          logger: {
            warn: () => {},
          },
        },
      },
    },
    plugins: [tailwindcss()],
    // Pin the tsconfig Vite 8 / oxc uses for transforms. Without this, oxc auto-discovers a
    // tsconfig per transformed file by walking up the directory tree (into node_modules and
    // above the project root) and hard-fails on any it finds whose "extends" it can't resolve
    // through a package exports map -- e.g. "astro/tsconfigs/base".
    // See https://github.com/vitejs/vite/issues/23459
    tsconfig: './tsconfig.json',
    resolve: {
      // Same discovery walk, for path-alias resolution. All aliases below are explicit,
      // so turning it off doesn't affect module resolution.
      tsconfigPaths: false,
      alias: {
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
        '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
        '@content': fileURLToPath(new URL('./src/content', import.meta.url)),
        '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
        '@public': fileURLToPath(new URL('./public', import.meta.url)),
        '@post-images': fileURLToPath(new URL('./public/posts', import.meta.url)),
        '@project-images': fileURLToPath(new URL('./public/projects', import.meta.url)),
        '@i18n': fileURLToPath(new URL('./src/i18n', import.meta.url)),
        'src/i18n': fileURLToPath(new URL('./src/i18n', import.meta.url)),
        'src/data': fileURLToPath(new URL('./src/data', import.meta.url)),
      },
    },
  },
})
