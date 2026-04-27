import { create } from 'zustand';

export interface StoreSettingsState {
  isOpen: boolean;
  closedMessage: string;
  promoBannerActive: boolean;
  promoBannerText: string;
  heroTitle: string;
  heroSubtitle: string;
  
  isLoading: boolean;
  error: string | null;

  fetchSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<Omit<StoreSettingsState, 'isLoading' | 'error' | 'fetchSettings' | 'updateSettings'>>) => Promise<void>;
}

export const useStoreSettings = create<StoreSettingsState>()((set, get) => ({
  isOpen: true,
  closedMessage: '¡Estamos cerrados por hoy! Vuelve pronto 🔥',
  promoBannerActive: false,
  promoBannerText: '',
  heroTitle: '',
  heroSubtitle: '',
  
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/store/settings');
      if (!res.ok) throw new Error('Error al cargar configuraciones');
      const data = await res.json();
      
      set({
        isOpen: data.is_open,
        closedMessage: data.closed_message || '¡Estamos cerrados por hoy! Vuelve pronto 🔥',
        promoBannerActive: data.promo_banner_active || false,
        promoBannerText: data.promo_banner_text || '',
        heroTitle: data.hero_title || '',
        heroSubtitle: data.hero_subtitle || '',
        isLoading: false
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  updateSettings: async (newSettings) => {
    set({ isLoading: true, error: null });
    try {
      // Convert camelCase to snake_case for the API
      const payload: Record<string, any> = {};
      if (newSettings.isOpen !== undefined) payload.is_open = newSettings.isOpen;
      if (newSettings.closedMessage !== undefined) payload.closed_message = newSettings.closedMessage;
      if (newSettings.promoBannerActive !== undefined) payload.promo_banner_active = newSettings.promoBannerActive;
      if (newSettings.promoBannerText !== undefined) payload.promo_banner_text = newSettings.promoBannerText;
      if (newSettings.heroTitle !== undefined) payload.hero_title = newSettings.heroTitle;
      if (newSettings.heroSubtitle !== undefined) payload.hero_subtitle = newSettings.heroSubtitle;

      const res = await fetch('/api/store/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al guardar configuración');
      }
      
      const data = await res.json();
      set({
        isOpen: data.is_open,
        closedMessage: data.closed_message,
        promoBannerActive: data.promo_banner_active,
        promoBannerText: data.promo_banner_text,
        heroTitle: data.hero_title,
        heroSubtitle: data.hero_subtitle,
        isLoading: false
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  }
}));
