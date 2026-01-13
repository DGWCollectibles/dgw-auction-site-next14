import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  // Get the origin from the request to build the redirect URL
  const url = new URL('/', request.url)
  return NextResponse.redirect(url)
}
