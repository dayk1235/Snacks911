# toggle-password

Add password visibility toggle to login forms.

## Steps

1. Find all login pages (`/admin/login`, `/login`)
2. Add `useState<boolean>` for `showPassword`
3. Wrap password input in a flex container with a toggle button
4. Toggle button: SVG eye icon, `type={showPassword ? 'text' : 'password'}`
5. Icon: eye open (`/`) for visible, eye-off for hidden
6. Style: subtle, right-aligned inside input wrapper
7. Build and verify
