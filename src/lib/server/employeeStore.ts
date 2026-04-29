/**
 * Employee authentication store — server-side only.
 * Uses Supabase service_role client (bypasses RLS).
 * Passwords hashed with PBKDF2 (Node.js crypto).
 */

import crypto from 'crypto';
import { supabaseAdmin, supabaseAnon } from './supabaseServer';

function getDb() {
  return supabaseAdmin || supabaseAnon;
}

// ── Types ──
export interface Employee {
  id: string;
  employeeId: string;
  passwordHash: string;
  passwordSalt: string;
  name: string;
  role: 'admin' | 'gerente' | 'staff';
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

// ── Password hashing (PBKDF2) ──
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 64;
const SALT_LENGTH = 32;

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512')
    .toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computed = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512')
    .toString('hex');
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

// ── Internal helpers ──
function mapRow(d: Record<string, unknown>): Employee {
  return {
    id: String(d.id),
    employeeId: String(d.employee_id),
    passwordHash: String(d.password_hash),
    passwordSalt: String(d.password_salt),
    name: String(d.name),
    role: String(d.role) as Employee['role'],
    active: Boolean(d.active),
    createdAt: String(d.created_at),
    lastLoginAt: d.last_login_at ? String(d.last_login_at) : undefined,
  };
}

async function logAndThrow(context: string, error: unknown): Promise<never> {
  // Supabase errors are plain objects with .message — not instanceof Error
  const message =
    error instanceof Error
      ? error.message
      : (error as { message?: string })?.message ||
        (error as { details?: string })?.details ||
        JSON.stringify(error);
  console.error(`[EmployeeStore] ${context}:`, message);
  throw new Error(message);
}

// ── Public API ──

export async function getEmployeeByLoginId(employeeId: string): Promise<Employee | null> {
  const db = getDb();
  if (!db) {
    console.error('[EmployeeStore] No database connection available');
    return null;
  }

  try {
    const { data, error } = await db
      .from('employees')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('active', true)
      .maybeSingle();

    if (error) {
      console.error('[EmployeeStore] Error fetching employee:', error.message);
      return null;
    }

    return data ? mapRow(data as Record<string, unknown>) : null;
  } catch (err) {
    console.error('[EmployeeStore] Exception fetching employee:', err);
    return null;
  }
}

export async function createEmployee(input: {
  employeeId: string;
  password: string;
  name: string;
  role: 'admin' | 'gerente' | 'staff';
}): Promise<Employee> {
  const db = getDb();
  if (!db) throw new Error('No database connection');

  const { hash, salt } = hashPassword(input.password);
  const now = new Date().toISOString();

  // Check for duplicate BEFORE inserting to give a clear error
  const alreadyExists = await getEmployeeByLoginId(input.employeeId);
  if (alreadyExists) {
    console.log(`[EmployeeStore] Employee "${input.employeeId}" already exists`);
    throw new Error(`El número de empleado "${input.employeeId}" ya existe`);
  }

  try {
    // Let Supabase auto-generate the UUID — do NOT pass id manually
    const { data, error } = await db.from('employees').insert({
      employee_id: input.employeeId,
      password_hash: hash,
      password_salt: salt,
      name: input.name,
      role: input.role,
      active: true,
      created_at: now,
    }).select().maybeSingle();

    if (error) {
      if (error.code === '23505') {
        throw new Error(`El número de empleado "${input.employeeId}" ya existe`);
      }
      await logAndThrow(`Failed to create employee "${input.employeeId}"`, error);
    }

    console.log(`[EmployeeStore] Created employee: ${input.employeeId} (${input.role})`);
    return mapRow(data as Record<string, unknown>);
  } catch (err) {
    if (err instanceof Error) throw err; // re-throw our custom errors
    throw new Error('Error inesperado al crear empleado');
  }
}


export async function updateLastLogin(employeeId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  const now = new Date().toISOString();
  const { error } = await db
    .from('employees')
    .update({ last_login_at: now })
    .eq('employee_id', employeeId);

  if (error) {
    console.error('[EmployeeStore] Failed to update last_login:', error.message);
  }
}

export async function deactivateEmployee(employeeId: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('No database connection');

  const { error } = await db
    .from('employees')
    .update({ active: false })
    .eq('employee_id', employeeId);

  if (error) await logAndThrow('Failed to deactivate employee', error);
}

export async function listEmployees(): Promise<Employee[]> {
  const db = getDb();
  if (!db) {
    console.error('[EmployeeStore] No database connection');
    return [];
  }

  const { data, error } = await db
    .from('employees')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[EmployeeStore] Failed to list employees:', error.message);
    return [];
  }

  return (data || []).map(d => mapRow(d as Record<string, unknown>));
}

export async function initDefaultAdmin(): Promise<boolean> {
  if (process.env.ALLOW_DEFAULT_ADMIN_BOOTSTRAP !== 'true') {
    return false;
  }

  const db = getDb();
  if (!db) {
    console.error('[EmployeeStore] CRITICAL: No database connection — cannot create default admin');
    return false;
  }

  try {
    // Count existing employees
    const { count, error: countErr } = await db
      .from('employees')
      .select('*', { count: 'exact', head: true });

    if (countErr) {
      console.error('[EmployeeStore] Failed to count employees:', countErr.message);
      return false;
    }

    if ((count || 0) > 0) {
      console.log(`[EmployeeStore] Database has ${count} employee(s) — skipping default admin creation`);
      return false;
    }

    console.log('[EmployeeStore] No employees found — creating default admin...');

    await createEmployee({
      employeeId: 'admin001',
      password: 'Snacks911!',
      name: 'Administrador',
      role: 'admin',
    });

    console.log('[EmployeeStore] Default admin "admin001" created successfully');
    return true;
  } catch (err) {
    console.error('[EmployeeStore] Failed to create default admin:', err);
    return false;
  }
}
