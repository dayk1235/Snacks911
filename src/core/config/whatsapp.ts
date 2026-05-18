/**
 * core/config/whatsapp.ts — Configuración de WhatsApp Cloud API
 *
 * Centraliza el acceso a las variables de entorno de WhatsApp.
 * Todos los servicios deben importar desde aquí, NUNCA leer
 * process.env directamente en el código de negocio.
 *
 * ⚠️  Solo para uso en Server Side (API routes, Server Actions).
 *     NO exportar con el prefijo NEXT_PUBLIC_.
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface WhatsAppConfig {
  /** Token de acceso de la app de Meta (nunca expira si es Permanent Token) */
  token: string;
  /** ID del número de teléfono registrado en Meta Business */
  phoneNumberId: string;
  /** Token secreto para verificar el webhook de Meta */
  verifyToken: string;
  /** ID del catálogo de productos vinculado a Commerce Manager */
  catalogId: string;
  /** URL base de la API de WhatsApp Cloud (Graph API) */
  apiUrl: string;
  /** Versión de la API */
  apiVersion: string;
}

// ─── Validación lazy (solo en runtime, no en build) ──────────────────────────

function getWhatsAppConfig(): WhatsAppConfig {
  const token           = process.env.WHATSAPP_TOKEN ?? '';
  const phoneNumberId   = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
  const verifyToken     = process.env.WHATSAPP_VERIFY_TOKEN ?? '';
  const catalogId       = process.env.WHATSAPP_CATALOG_ID ?? '';
  const apiVersion      = process.env.WHATSAPP_API_VERSION ?? 'v19.0';

  // Advertir en desarrollo si faltan variables críticas
  if (process.env.NODE_ENV === 'development') {
    if (!token)         console.warn('[WhatsApp] ⚠️  WHATSAPP_TOKEN no configurado');
    if (!phoneNumberId) console.warn('[WhatsApp] ⚠️  WHATSAPP_PHONE_NUMBER_ID no configurado');
    if (!verifyToken)   console.warn('[WhatsApp] ⚠️  WHATSAPP_VERIFY_TOKEN no configurado');
    if (!catalogId)     console.warn('[WhatsApp] ⚠️  WHATSAPP_CATALOG_ID no configurado (requerido para catálogo)');
  }

  return {
    token,
    phoneNumberId,
    verifyToken,
    catalogId,
    apiUrl: `https://graph.facebook.com/${apiVersion}`,
    apiVersion,
  };
}

/** Config singleton — se evalúa en el primer uso, no en import */
export const whatsappConfig = getWhatsAppConfig();

// ─── Helpers de URL ───────────────────────────────────────────────────────────

/**
 * URL base para envío de mensajes al número configurado.
 * Ejemplo: POST {messagesUrl} con body { to, type, ... }
 */
export const whatsappMessagesUrl = (): string =>
  `${whatsappConfig.apiUrl}/${whatsappConfig.phoneNumberId}/messages`;

/**
 * Headers estándar para todas las llamadas a la Cloud API.
 */
export const whatsappHeaders = (): Record<string, string> => ({
  'Authorization': `Bearer ${whatsappConfig.token}`,
  'Content-Type':  'application/json',
});

/**
 * Verifica que las variables críticas estén presentes.
 * Lanza un error descriptivo si falta alguna en producción.
 */
export function assertWhatsAppConfigured(): void {
  const missing: string[] = [];

  if (!whatsappConfig.token)         missing.push('WHATSAPP_TOKEN');
  if (!whatsappConfig.phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!whatsappConfig.verifyToken)   missing.push('WHATSAPP_VERIFY_TOKEN');

  if (missing.length > 0) {
    throw new Error(
      `[WhatsApp] Variables de entorno faltantes: ${missing.join(', ')}.\n` +
      `Revisa tu .env.local y asegúrate que estén configuradas.`
    );
  }
}
