/**
 * /api/admin/staff
 * GET  — Lista todos los empleados
 * POST — Crea un empleado nuevo
 * PUT  — Actualiza empleado (nombre, rol, contraseña, active)
 * DELETE ?id=xxx — Elimina empleado
 */

import { NextResponse } from 'next/server';
import {
  listEmployees,
  createEmployee,
  hashPassword,
} from '@/lib/server/employeeStore';
import { verifySessionToken, ADMIN_SESSION_COOKIE, EMPLOYEE_SESSION_COOKIE } from '@/lib/server/adminSession';
import { getSupabaseAdmin, supabaseAnon } from '@/lib/db.server';

function getDb() { return getSupabaseAdmin() || supabaseAnon; }

import { authGuard } from '@/middleware/authGuard';

// Admin maestro — nunca se puede borrar ni desactivar
const MASTER_ADMIN_ID = 'admin001';

// ── GET — Listar empleados ──────────────────────────────────────────────────
export async function GET(req: Request) {
  const auth = await authGuard(req, ['admin']);
  if (!auth.ok) return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });

  const employees = await listEmployees();
  return NextResponse.json({
    staff: employees.map(e => ({
      id:          e.id,
      employeeId:  e.employeeId,
      name:        e.name,
      role:        e.role,
      active:      e.active,
      createdAt:   e.createdAt,
      lastLoginAt: e.lastLoginAt,
    })),
  });
}

// ── POST — Crear empleado ─────────────────────────────────────────────────────
export async function POST(req: Request) {
  const auth = await authGuard(req, ['admin']);
  if (!auth.ok) return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });

  const body = await req.json().catch(() => null) as {
    employeeId?: string;
    name?: string;
    role?: 'admin' | 'gerente' | 'staff';
    password?: string;
  } | null;

  if (!body?.employeeId || !body?.name || !body?.password) {
    return NextResponse.json({ error: 'employeeId, name y password son requeridos' }, { status: 400 });
  }

  if (body.password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
  }

  try {
    const emp = await createEmployee({
      employeeId: body.employeeId.trim().toLowerCase(),
      name:       body.name.trim(),
      role:       body.role || 'staff',
      password:   body.password,
    });
    return NextResponse.json({ ok: true, employee: { id: emp.id, employeeId: emp.employeeId } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al crear';
    if (msg.includes('duplicate') || msg.includes('already')) {
      return NextResponse.json({ error: 'Ese número de empleado ya existe' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── PUT — Actualizar empleado ─────────────────────────────────────────────────
export async function PUT(req: Request) {
  const auth = await authGuard(req, ['admin']);
  if (!auth.ok) return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });

  const body = await req.json().catch(() => null) as {
    id?: string;
    name?: string;
    role?: 'admin' | 'gerente' | 'staff';
    password?: string;
    active?: boolean;
  } | null;

  if (!body?.id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Sin conexión' }, { status: 503 });

  // Protección: buscar el employeeId para verificar si es el admin maestro
  const { data: target } = await db.from('employees').select('employee_id').eq('id', body.id).maybeSingle();
  if (target?.employee_id === MASTER_ADMIN_ID) {
    // Solo permitir cambiar nombre o contraseña — no rol ni estado
    if (body.active === false) {
      return NextResponse.json({ error: 'El admin maestro no puede desactivarse' }, { status: 403 });
    }
    if (body.role && body.role !== 'admin') {
      return NextResponse.json({ error: 'El admin maestro no puede cambiar de rol' }, { status: 403 });
    }
  }

  const updates: Record<string, unknown> = {};
  if (body.name    !== undefined) updates.name   = body.name.trim();
  if (body.role    !== undefined) updates.role   = body.role;
  if (body.active  !== undefined) updates.active = body.active;
  if (body.password && body.password.length >= 6) {
    const { hash, salt } = hashPassword(body.password);
    updates.password_hash = hash;
    updates.password_salt = salt;
  }

  const { error } = await db.from('employees').update(updates).eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// ── DELETE — Eliminar empleado ──────────────────────────────────────────────
export async function DELETE(req: Request) {
  const auth = await authGuard(req, ['admin']);
  if (!auth.ok) return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Sin conexión' }, { status: 503 });

  // Protección: no se puede eliminar al admin maestro
  const { data: target } = await db.from('employees').select('employee_id').eq('id', id).maybeSingle();
  if (target?.employee_id === MASTER_ADMIN_ID) {
    return NextResponse.json({ error: 'El admin maestro no puede eliminarse' }, { status: 403 });
  }

  // Soft delete: marcar inactive en lugar de borrar permanentemente
  const { error } = await db.from('employees').update({ active: false }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
