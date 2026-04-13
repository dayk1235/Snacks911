# manage-staff

Add staff management system to admin panel.

## Steps

1. Create `/admin/staff/page.tsx` with staff list + create form
2. Staff CRUD: create, edit, deactivate users
3. Roles: `admin` (full access) and `staff` (orders only)
4. Store in Supabase `profiles` table or `adminStore.ts` with localStorage fallback
5. Add "Staff" nav link to admin sidebar
6. Create form fields: name, email, password, role dropdown
7. Password: use same hashing as existing auth system
8. List shows: name, role, status (active/inactive), last login
9. Add to admin sidebar navigation between Pedidos and Ventas
10. Build and verify
