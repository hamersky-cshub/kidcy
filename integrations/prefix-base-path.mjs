import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Prefixes root-relative URLs in the built HTML with Astro's `base`.
 *
 * Content and data files reference public assets as `/materials/...`,
 * `/images/...` or `/fonts/...`. Those work when the site is served from the
 * domain root, but not from a sub-path such as a GitHub Pages project site
 * (https://<owner>.github.io/<repo>/). Instead of threading the base path
 * through every data entry, this rewrites href/src/poster/action attributes
 * after the build. URLs that already start with the base are left as they are.
 *
 * Does nothing when `base` is '/'.
 */
const URL_ATTRIBUTE = /(\s(?:href|src|poster|action)=)(["']?)(\/(?!\/)[^"'\s>]*)/g

const listHtmlFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true })
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => join(entry.parentPath ?? entry.path, entry.name))
}

export default function prefixBasePath() {
  let base = ''

  return {
    name: 'prefix-base-path',
    hooks: {
      'astro:config:done': ({ config }) => {
        base = config.base.replace(/\/+$/, '')
      },
      'astro:build:done': async ({ dir, logger }) => {
        if (!base) return

        const files = await listHtmlFiles(fileURLToPath(dir))
        let rewritten = 0

        await Promise.all(
          files.map(async (file) => {
            const html = await readFile(file, 'utf8')
            const updated = html.replace(URL_ATTRIBUTE, (match, attr, quote, url) => {
              if (url === base || url.startsWith(`${base}/`)) return match
              rewritten++
              return `${attr}${quote}${base}${url}`
            })
            if (updated !== html) await writeFile(file, updated)
          }),
        )

        logger.info(`Prefixed ${rewritten} root-relative URLs with ${base}`)
      },
    },
  }
}
