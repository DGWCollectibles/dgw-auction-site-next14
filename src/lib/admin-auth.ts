import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Verify that the request is from an authenticated admin user.
 * Used by /api/admin/* routes to prevent unauthorized access.
 * 
 * Returns { authorized: true, userId } or { authorized: false, error }
 */
export async function verifyAdmin(request: NextRequest): Promise<
  | { authorized: true; userId: string }
  | { authorized: false; error: string; status: number }
> {
  try {
    // First check for cron secret (internal server calls)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      return { authorized: true, userId: 'cron-system' };
    }

    // For browser requests, check the session cookie
    const cookieStore = cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { authorized: false, error: 'Not authenticated', status: 401 };
    }

    // Check admin flag on profile (use admin client to bypass RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return { authorized: false, error: 'Admin access required', status: 403 };
    }

    return { authorized: true, userId: user.id };
  } catch (error) {
    return { authorized: false, error: 'Auth verification failed', status: 500 };
  }
}

/**
 * Get the admin Supabase client (service role, bypasses RLS).
 * Only use this after verifying admin status with verifyAdmin().
 */
export function getAdminClient() {
  return supabaseAdmin;
}
