import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabaseServer';

/**
 * GET /api/whatsapp/health
 *
 * Health check for WhatsApp integration.
 * Validates env vars and Supabase connection.
 * For quick debugging in production.
 */

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    status: 'ok',
    checks: {},
  };

  // 1. Check WhatsApp env vars
  const whatsappVars = {
    WHATSAPP_TOKEN: {
      present: !!process.env.WHATSAPP_TOKEN,
      length: process.env.WHATSAPP_TOKEN?.length || 0,
    },
    WHATSAPP_PHONE_NUMBER_ID: {
      present: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
      value: process.env.WHATSAPP_PHONE_NUMBER_ID || 'MISSING',
    },
    WHATSAPP_PHONE_ID: {
      present: !!process.env.WHATSAPP_PHONE_ID,
      value: process.env.WHATSAPP_PHONE_ID || 'MISSING',
    },
    VERIFY_TOKEN: {
      present: !!process.env.VERIFY_TOKEN,
      length: process.env.VERIFY_TOKEN?.length || 0,
    },
    WHATSAPP_VERIFY_TOKEN: {
      present: !!process.env.WHATSAPP_VERIFY_TOKEN,
      length: process.env.WHATSAPP_VERIFY_TOKEN?.length || 0,
    },
  };

  // 2. Check Supabase env vars
  const supabaseVars = {
    NEXT_PUBLIC_SUPABASE_URL: {
      present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      value: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    },
  };

  // 3. Test Supabase connection
  let supabaseStatus = 'not_checked';
  let supabaseError = null;

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('count', { count: 'exact', head: true });

      if (error) {
        supabaseStatus = 'error';
        supabaseError = error.message;
      } else {
        supabaseStatus = 'connected';
      }
    } catch (e: any) {
      supabaseStatus = 'error';
      supabaseError = e.message;
    }
  } else {
    supabaseStatus = 'no_admin_client';
  }

  // 4. Test WhatsApp API (lightweight check)
  let whatsappStatus = 'not_checked';
  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          },
        }
      );
      if (response.ok) {
        whatsappStatus = 'token_valid';
      } else {
        whatsappStatus = `token_invalid (${response.status})`;
      }
    } catch (e: any) {
      whatsappStatus = `error: ${e.message}`;
    }
  } else {
    whatsappStatus = 'missing_credentials';
  }

  // Compile results
  results.checks = {
    whatsapp: {
      env_vars: whatsappVars,
      api_status: whatsappStatus,
    },
    supabase: {
      env_vars: supabaseVars,
      connection: supabaseStatus,
      error: supabaseError,
    },
  };

  // Determine overall status
  const allPresent =
    whatsappVars.WHATSAPP_TOKEN.present &&
    (whatsappVars.WHATSAPP_PHONE_NUMBER_ID.present || whatsappVars.WHATSAPP_PHONE_ID.present) &&
    whatsappVars.VERIFY_TOKEN.present &&
    supabaseVars.NEXT_PUBLIC_SUPABASE_URL.present &&
    supabaseVars.SUPABASE_SERVICE_ROLE_KEY.present;

  if (!allPresent) {
    results.status = 'missing_config';
  } else if (supabaseStatus !== 'connected') {
    results.status = 'supabase_error';
  } else if (whatsappStatus !== 'token_valid') {
    results.status = 'whatsapp_error';
  }

  console.log('[WA Health]', results);

  return NextResponse.json(results, {
    status: results.status === 'ok' ? 200 : 500,
  });
}
