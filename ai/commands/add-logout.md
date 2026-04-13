# add-logout

Add logout button to admin and orders pages.

## Steps

1. Find admin layout sidebar — replace any emoji logout with SVG logout icon
2. Logout handler: `await fetch('/api/admin/logout', { method: 'POST' })` → `router.push('/admin/login')`
3. Add logout to orders page header — top-right, clean button with SVG icon
4. Clear relevant localStorage keys on logout
5. Style: `rgba(255,69,0,0.08)` bg, `rgba(255,69,0,0.15)` border, `#FF4500` text
6. Build and verify
