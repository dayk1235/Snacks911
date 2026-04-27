/**
 * cashStore.ts — Zustand store for Cash Management
 */
import { create } from 'zustand';

export interface CashSession {
  id: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  status: 'open' | 'closed';
  opened_by: string;
  notes: string;
}

export interface CashMovement {
  id: string;
  session_id: string;
  type: 'IN' | 'OUT';
  amount: number;
  concept: string;
  created_at: string;
}

interface CashState {
  session: CashSession | null;
  movements: CashMovement[];
  dailySales: number;
  salesByMethod: Record<string, number>;
  isLoading: boolean;
  error: string | null;

  fetchSession: () => Promise<void>;
  openSession: (openingAmount: number, openedBy?: string) => Promise<void>;
  closeSession: (sessionId: string, closingAmount: number, notes?: string) => Promise<{ expected: number; diff: number }>;
  addMovement: (sessionId: string, type: 'IN' | 'OUT', amount: number, concept: string) => Promise<void>;
}

export const useCashStore = create<CashState>()((set, get) => ({
  session: null,
  movements: [],
  dailySales: 0,
  salesByMethod: {},
  isLoading: false,
  error: null,

  fetchSession: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/cash');
      if (!res.ok) throw new Error('Error cargando caja');
      const data = await res.json();
      set({ session: data.session, movements: data.movements || [], dailySales: data.dailySales || 0, salesByMethod: data.salesByMethod || {}, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  openSession: async (openingAmount, openedBy = '') => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/cash', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'open', opening_amount: openingAmount, opened_by: openedBy }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await get().fetchSession();
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  closeSession: async (sessionId, closingAmount, notes = '') => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/cash', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'close', session_id: sessionId, closing_amount: closingAmount, notes }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      set({ session: data.session, isLoading: false });
      return { expected: data.expected, diff: data.diff };
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  addMovement: async (sessionId, type, amount, concept) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/cash', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'movement', session_id: sessionId, type, amount, concept }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      set(s => ({ movements: [data.movement, ...s.movements], isLoading: false }));
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },
}));
