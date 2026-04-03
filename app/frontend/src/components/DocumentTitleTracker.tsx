import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Sets the browser tab title for routes that are not overridden by dashboard tab state.
 * Partner/Admin dashboards set `SnapRoad Partner · …` / `SnapRoad Admin · …` via useLayoutEffect.
 */
export default function DocumentTitleTracker() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname.startsWith('/portal/partner/sign-in')) {
      document.title = 'SnapRoad Partner — Sign in'
      return
    }
    if (pathname.startsWith('/portal/partner/welcome')) {
      document.title = 'SnapRoad Partner'
      return
    }
    if (pathname.startsWith('/portal/partner/scanner')) {
      document.title = 'SnapRoad Partner — Scanner'
      return
    }
    if (pathname.startsWith('/portal/partner')) {
      return
    }

    if (pathname.startsWith('/portal/admin-sr2025secure/sign-in')) {
      document.title = 'SnapRoad Admin — Sign in'
      return
    }
    if (pathname.startsWith('/portal/admin-sr2025secure')) {
      return
    }

    if (pathname.startsWith('/driver')) {
      document.title = 'SnapRoad'
      return
    }
    if (pathname.startsWith('/auth/partner-signup') || pathname.startsWith('/join')) {
      document.title = 'SnapRoad Partner — Join'
      return
    }
    if (pathname.startsWith('/scan/')) {
      document.title = 'SnapRoad — Team scan'
      return
    }
    if (pathname.startsWith('/business')) {
      document.title = 'SnapRoad'
      return
    }
    document.title = 'SnapRoad'
  }, [pathname])

  return null
}
