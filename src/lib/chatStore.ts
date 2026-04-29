import { create } from 'zustand';

export type ChatPhase = 'HOOK' | 'CONFIRM_UPSELL' | 'CLOSE';

export interface ChatState {
  paso: ChatPhase;
  producto: string | null;
  extras: string[];
  bebida: string | null;
  total: number;
  lastMessage?: string | null;
  lastOrder?: {
    producto: string;
    extras: string[];
    bebida: string | null;
  } | null;
}

interface ChatStore {
  state: ChatState;
  setPhase: (phase: ChatPhase) => void;
  updateState: (newState: Partial<ChatState>) => void;
  reset: () => void;
}

const INITIAL_STATE: ChatState = {
  paso: 'HOOK',
  producto: null,
  extras: [],
  bebida: null,
  total: 0,
  lastOrder: null,
};

export const useChatStore = create<ChatStore>((set) => ({
  state: INITIAL_STATE,
  setPhase: (paso) => set((s) => ({ state: { ...s.state, paso } })),
  updateState: (newState) => set((s) => ({ state: { ...s.state, ...newState } })),
  reset: () => set((s) => ({ state: { ...INITIAL_STATE, lastOrder: s.state.lastOrder } })),
}));
