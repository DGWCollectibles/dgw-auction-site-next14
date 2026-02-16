import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Extract the authenticated user ID from the session cookie.
 * Used by /api/stripe/* routes to prevent user_id spoofing.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
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

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}
