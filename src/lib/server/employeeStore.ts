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
  role: 'admin' | 'staff';
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
  const message = error instanceof Error ? error.message : String(error);
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
  role: 'admin' | 'staff';
}): Promise<Employee> {
  const db = getDb();
  if (!db) throw new Error('No database connection');

  const { hash, salt } = hashPassword(input.password);
  const now = new Date().toISOString();

  // Check for duplicate
  const existing = await getEmployeeByLoginId(input.employeeId);
  if (existing) {
    console.log(`[EmployeeStore] Employee "${input.employeeId}" already exists, returning existing`);
    return existing;
  }

  const employee: Employee = {
    id: `emp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    employeeId: input.employeeId,
    passwordHash: hash,
    passwordSalt: salt,
    name: input.name,
    role: input.role,
    active: true,
    createdAt: now,
  };

  try {
    const { error } = await db.from('employees').insert({
      id: employee.id,
      employee_id: employee.employeeId,
      password_hash: employee.passwordHash,
      password_salt: employee.passwordSalt,
      name: employee.name,
      role: employee.role,
      active: employee.active,
      created_at: employee.createdAt,
    });

    if (error) {
      // Check if it's a duplicate key error (race condition)
      if (error.code === '23505') {
        console.log(`[EmployeeStore] Duplicate employee_id "${input.employeeId}", fetching existing`);
        const existing = await getEmployeeByLoginId(input.employeeId);
        if (existing) return existing;
      }
      await logAndThrow(`Failed to create employee "${input.employeeId}"`, error);
    }

    console.log(`[EmployeeStore] Created employee: ${employee.employeeId} (${employee.role})`);
    return employee;
  } catch (err) {
    // Re-check for existing (race condition safety)
    const existing = await getEmployeeByLoginId(input.employeeId);
    if (existing) return existing;
    throw err;
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
