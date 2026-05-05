export async function loadApprovedExamples(limit: number = 10) {
  try {
    const { getSupabaseAdmin } = await import('@/lib/server/supabaseServer');
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('ai_suggestions')
      .select('suggested_response')
      .eq('status', 'approved')
      .limit(limit);
    
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}
