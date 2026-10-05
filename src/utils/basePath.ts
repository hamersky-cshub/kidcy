/**
 * Helpers for serving the site from a sub-path (Astro `base`), e.g. a GitHub
 * Pages project site at https://<owner>.github.io/<repo>/.
 *
 * BASE_PATH has no trailing slash: '' when the site is served from the domain
 * root, '/kidcy' when it is served from /kidcy/.
 */
export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/+$/, '')

/** Remove the base path from a pathname: /kidcy/about/ → /about/ */
export const stripBasePath = (pathname: string): string => {
  if (!BASE_PATH) return pathname
  if (pathname === BASE_PATH) return '/'
  return pathname.startsWith(`${BASE_PATH}/`) ? pathname.slice(BASE_PATH.length) : pathname
}

/** Prefix a root-relative path with the base path: /images/a.png → /kidcy/images/a.png */
export const withBasePath = (path: string): string =>
  path.startsWith('/') && !path.startsWith('//') ? `${BASE_PATH}${path}` : path
