import { redirect } from 'next/navigation';

/**
 * Legacy admin login — server-side redirect to employee login.
 */
export default function LegacyAdminLogin() {
  redirect('/login');
}
