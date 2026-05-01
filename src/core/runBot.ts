import { dbGetCustomer, dbGetProducts } from '@/lib/db';
import { dbSaveOrderServer } from '@/lib/dbServer';
import { supabase } from '@/lib/supabase';
import { validateOrderItems } from '@/core/validationService';
import { getCustomerProfile, updateCustomerFromOrder } from '@/core/customerProfileStore';
import { getBotResponse } from "@/core/botEngine";

console.log("STEP 3: RUNBOT FILE LOADED");

export interface BotInput {
  channel: 'WHATSAPP' | 'WEB' | 'POS';
  message: string;
  phone: string;
}

export async function runBot({ channel, message, phone }: BotInput) {
  console.log("STEP 4: RUNBOT FUNCTION EXECUTED");

  const reply = await getBotResponse({
    message: message,
    phone: phone
  });

  console.log("STEP 5: BOT RESPONSE:", reply);

  return {
    text: reply,
    type: "text" as const
  };
}