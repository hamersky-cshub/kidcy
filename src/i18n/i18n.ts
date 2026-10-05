import { getRelativeLocaleUrl } from 'astro:i18n'
import { stripBasePath } from '../utils/basePath'

export const DEFAULT_LOCALE = 'en'
export const SUPPORTED_LOCALES = ['en', 'cs', 'de', 'lt', 'no'] as const

export type SiteLocale = (typeof SUPPORTED_LOCALES)[number]

// Matches paths that end with a filename + extension (e.g. /fonts/foo.woff2,
// /materials/guide.pdf). These are static assets — prefixing them with a
// locale segment would produce broken URLs, so localizePath skips them.
const PUBLIC_FILE_PATTERN = /\/[^/?#]+\.[a-z0-9]+$/i

const splitUrlParts = (href: string) => {
  const [pathWithSearch, hash = ''] = href.split('#')
  const [pathname, search = ''] = pathWithSearch.split('?')

  return {
    hash: hash ? `#${hash}` : '',
    pathname,
    search: search ? `?${search}` : '',
  }
}

export const getCurrentLocale = (locale: string | undefined): SiteLocale =>
  SUPPORTED_LOCALES.includes(locale as SiteLocale) ? (locale as SiteLocale) : DEFAULT_LOCALE

export const isLocalizablePagePath = (href: string): boolean => {
  if (!href.startsWith('/') || href.startsWith('//')) {
    return false
  }

  const { pathname } = splitUrlParts(href)
  return !PUBLIC_FILE_PATTERN.test(pathname)
}

export const localizePath = (locale: string | undefined, href: string): string => {
  if (!isLocalizablePagePath(href)) {
    return href
  }

  const normalizedLocale = getCurrentLocale(locale)
  const { pathname, search, hash } = splitUrlParts(href)
  const route = pathname === '/' ? '' : pathname.replace(/^\/+|\/+$/g, '')

  return `${getRelativeLocaleUrl(normalizedLocale, route)}${search}${hash}`
}

export const stripLocaleFromPathname = (pathname: string): string => {
  const normalizedPath = stripBasePath(pathname).replace(/\/+$/, '') || '/'

  if (normalizedPath === '/') {
    return normalizedPath
  }

  const segments = normalizedPath.split('/').filter(Boolean)
  if (segments.length === 0 || !SUPPORTED_LOCALES.includes(segments[0] as SiteLocale)) {
    return normalizedPath
  }

  const strippedPath = `/${segments.slice(1).join('/')}`
  return strippedPath === '/' || strippedPath === '' ? '/' : strippedPath
}
