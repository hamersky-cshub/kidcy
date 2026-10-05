/**
 * Navigation keyboard & interaction logic
 *
 * Extracted from Navigation.astro so this module can be:
 *   - Read and understood independently of the component markup
 *   - Unit-tested without a DOM render
 *   - Reused if a second navigation variant is ever added
 *
 * Entry point: call `initializeNavigation()` on DOMContentLoaded and on
 * every `astro:page-load` event (Astro view transitions re-fire the event).
 *
 * @see WCAG 2.1.1 — Keyboard
 * @see WCAG 2.4.5 — Multiple Ways
 * @see WCAG 4.1.2 — Name, Role, Value
 */

import { stripBasePath } from './basePath'

// ── Path helpers ──────────────────────────────────────────────────────────────

/** Strip trailing slashes; return '/' for empty paths */
export const normalizePath = (pathname: string): string => {
  const normalized = pathname.replace(/\/+$/, '')
  return normalized || '/'
}

/**
 * Remove the site base path and the locale prefix from a path.
 *
 * Examples (given localePrefixes = ['cs', 'de', 'lt', 'no']):
 *   /cs/about  →  /about
 *   /about     →  /about
 *   /          →  /
 *   /kidcy/cs/about  →  /about   (when the site base is /kidcy/)
 *
 * Uses the URL API internally to avoid issues with malformed paths
 * containing double slashes or encoded characters.
 */
export const stripLocalePrefix = (pathname: string, localePrefixes: string[]): string => {
  const normalized = normalizePath(stripBasePath(pathname))
  if (normalized === '/') return normalized

  // Use a dummy base so the URL constructor accepts relative paths
  let segments: string[]
  try {
    const url = new URL(normalized, 'http://x')
    segments = url.pathname.split('/').filter(Boolean)
  } catch {
    // Fallback for any edge-case where URL parsing fails
    segments = normalized.split('/').filter(Boolean)
  }

  if (!segments.length || !localePrefixes.includes(segments[0])) return normalized

  const stripped = `/${segments.slice(1).join('/')}`
  return stripped === '/' || stripped === '' ? '/' : stripped
}

// ── Active page detection ─────────────────────────────────────────────────────

/**
 * Check if a menu link matches the current URL.
 * Respects `data-nav-match` on the anchor for custom strategies:
 *   - "root"    — matches only "/"
 *   - "section" — matches a top-level section path via `data-nav-section`
 *   - "prefix"  — matches the link path and any child paths
 *   - "exact"   — (default) strict equality
 */
export const matchesMenuItem = (
  menuItem: HTMLAnchorElement,
  currentPathname: string,
  localePrefixes: string[],
): boolean => {
  const currentPath = stripLocalePrefix(currentPathname, localePrefixes)
  const menuPath = stripLocalePrefix(menuItem.pathname, localePrefixes)
  const matchType = menuItem.dataset.navMatch ?? 'exact'

  switch (matchType) {
    case 'root':
      return currentPath === '/'
    case 'section': {
      const section = menuItem.dataset.navSection
      return section
        ? currentPath === `/${section}` || currentPath.startsWith(`/${section}/`)
        : false
    }
    case 'prefix':
      return currentPath === menuPath || currentPath.startsWith(`${menuPath}/`)
    default:
      return currentPath === menuPath
  }
}

/** Apply aria-current="page" and .is-active to links that match the current URL */
export const setActiveMenuItem = (mainNav: HTMLElement, localePrefixes: string[]): void => {
  const menus = mainNav.querySelectorAll('nav > ul')
  const currentPath = window.location.pathname

  menus.forEach((menu) => {
    const links = [
      ...menu.querySelectorAll('a:not([rel*="external"]):not([data-nav-ignore])'),
    ] as HTMLAnchorElement[]

    links.forEach((link) => {
      const isActive = matchesMenuItem(link, currentPath, localePrefixes)
      link.classList.toggle('is-active', isActive)
      if (isActive) {
        link.setAttribute('aria-current', 'page')
      } else {
        link.removeAttribute('aria-current')
      }
    })
  })
}

// ── Dropdown management ───────────────────────────────────────────────────────

const isOutOfViewport = (el: Element): boolean =>
  el.getBoundingClientRect().right > (window.innerWidth || document.documentElement.clientWidth)

export const openDropdown = (btn: HTMLButtonElement): void => {
  const list = btn.parentNode?.querySelector('ul') as HTMLUListElement | null
  if (!list) return
  btn.classList.add('show')
  btn.setAttribute('aria-expanded', 'true')
  if (isOutOfViewport(list)) list.style.left = 'auto'
}

export const closeDropdown = (btn: HTMLButtonElement): void => {
  btn.classList.remove('show')
  btn.setAttribute('aria-expanded', 'false')
}

export const closeAllDropdowns = (dropdownMenus: HTMLButtonElement[]): void => {
  dropdownMenus.forEach(closeDropdown)
}

// ── Keyboard handler ──────────────────────────────────────────────────────────

/**
 * Handle keydown events on the main menu `<ul>`.
 *
 * Supported keys:
 *   ArrowRight / ArrowLeft  — move between top-level menu items
 *   ArrowDown               — open dropdown / move down within it
 *   ArrowUp                 — move up within an open dropdown
 *   Escape                  — close dropdown and return focus to trigger
 *   Tab                     — close dropdown when leaving the last item
 */
export const handleMenuKeydown = (
  event: KeyboardEvent,
  mainMenu: HTMLUListElement,
  dropdownMenus: HTMLButtonElement[],
): void => {
  const element = event.target as Element
  const currentMenuItem = element.closest('li')
  const menuItems = [...mainMenu.querySelectorAll('.menu-item')] as HTMLLIElement[]
  const currentDropdownBtn = element.closest('.has-dropdown button') as HTMLButtonElement | null
  const currentDropdownItem = element.closest('.has-dropdown li') as HTMLLIElement | null
  const currentIndex = currentMenuItem ? menuItems.indexOf(currentMenuItem as HTMLLIElement) : -1

  let targetItem: Element | null = null

  switch (event.key) {
    case 'ArrowRight':
      targetItem = menuItems[(currentIndex + 1) % menuItems.length] ?? null
      break

    case 'ArrowLeft':
      targetItem = menuItems[(currentIndex - 1 + menuItems.length) % menuItems.length] ?? null
      break

    case 'Escape':
      if (currentDropdownItem) {
        const triggerBtn = currentDropdownItem.parentElement?.previousElementSibling as HTMLButtonElement | null
        if (triggerBtn) {
          targetItem = triggerBtn.parentElement
          closeAllDropdowns(dropdownMenus)
        }
      } else if (currentDropdownBtn) {
        closeDropdown(currentDropdownBtn)
      } else {
        targetItem = menuItems[0]
      }
      break

    case 'ArrowDown':
      event.preventDefault()
      if (currentDropdownBtn) {
        openDropdown(currentDropdownBtn)
        const list = currentDropdownBtn.nextElementSibling
        targetItem = list?.querySelector('li') ?? null
      } else if (currentDropdownItem) {
        const siblings = [
          ...(currentDropdownItem.parentElement?.querySelectorAll('li') ?? []),
        ] as HTMLLIElement[]
        const idx = siblings.indexOf(currentDropdownItem)
        targetItem = siblings[(idx + 1) % siblings.length] ?? null
      }
      break

    case 'ArrowUp':
      if (currentDropdownItem) {
        event.preventDefault()
        const siblings = [
          ...(currentDropdownItem.parentElement?.querySelectorAll('li') ?? []),
        ] as HTMLLIElement[]
        const idx = siblings.indexOf(currentDropdownItem)
        targetItem = siblings[(idx - 1 + siblings.length) % siblings.length] ?? null
      }
      break

    case 'Tab':
      if (currentDropdownItem) {
        const siblings = [
          ...(currentDropdownItem.parentElement?.querySelectorAll('li') ?? []),
        ] as HTMLLIElement[]
        const isLast = siblings.indexOf(currentDropdownItem) === siblings.length - 1
        if (isLast) {
          const triggerBtn = currentDropdownItem.parentElement?.previousElementSibling as HTMLButtonElement | null
          if (triggerBtn) closeDropdown(triggerBtn)
        }
      }
      break
  }

  if (targetItem) {
    const focusable = targetItem.querySelector('a, button, input') as HTMLElement | null
    focusable?.focus()
  }
}

// ── Main initializer ──────────────────────────────────────────────────────────

/**
 * Initialize all navigation behaviour for `#main-navigation`.
 *
 * Safe to call multiple times — uses `data-nav-bound` to ensure event
 * listeners are only attached once per page lifecycle, even when Astro
 * view transitions cause this to run again on navigation.
 */
export const initializeNavigation = (): void => {
  const mainNav = document.querySelector('#main-navigation') as HTMLElement | null
  if (!mainNav) return

  const mainMenu = mainNav.querySelector('ul') as HTMLUListElement | null
  const dropdownMenus = [...document.querySelectorAll('.has-dropdown button')] as HTMLButtonElement[]
  const shouldBindInteractions = mainNav.dataset.navBound !== 'true'
  const localePrefixes = JSON.parse(mainNav.dataset.locales ?? '[]') as string[]

  if (shouldBindInteractions) {
    // Keyboard navigation within the main menu
    mainMenu?.addEventListener('keydown', (event: KeyboardEvent) => {
      handleMenuKeydown(event, mainMenu, dropdownMenus)
    })

    // Click to toggle dropdowns
    dropdownMenus.forEach((btn) => {
      btn.addEventListener('click', (event: MouseEvent) => {
        const target = event.currentTarget as HTMLButtonElement
        if (target.getAttribute('aria-expanded') === 'false') {
          closeAllDropdowns(dropdownMenus)
          openDropdown(target)
        } else {
          closeDropdown(target)
        }
      })
    })

    // Close dropdowns when clicking outside
    window.addEventListener('click', (event: MouseEvent) => {
      const el = event.target as Element
      if (!el.hasAttribute('aria-haspopup') && !el.classList.contains('submenu-item')) {
        closeAllDropdowns(dropdownMenus)
      }
    })

    mainNav.dataset.navBound = 'true'
  }

  setActiveMenuItem(mainNav, localePrefixes)
}
