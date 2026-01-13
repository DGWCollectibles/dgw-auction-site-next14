import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: {},
    errors: [],
  };

  // Check env vars
  results.checks.env = {
    RESEND_API_KEY: !!process.env.RESEND_API_KEY ? '✅ Set' : '❌ Missing',
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || '❌ Missing',
    FROM_EMAIL: process.env.FROM_EMAIL || '❌ Missing (will use default)',
  };

  // Check Supabase connection
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if table exists
    const { data: tableCheck, error: tableError } = await supabaseAdmin
      .from('outbid_notifications')
      .select('id')
      .limit(1);

    if (tableError) {
      results.checks.table = `❌ Error: ${tableError.message}`;
      results.errors.push(`Table error: ${tableError.message}`);
    } else {
      results.checks.table = '✅ outbid_notifications table exists';
    }

    // Count pending notifications
    const { count: pendingCount, error: countError } = await supabaseAdmin
      .from('outbid_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('email_sent', false);

    if (countError) {
      results.checks.pending = `❌ Error: ${countError.message}`;
    } else {
      results.checks.pending = `📬 ${pendingCount} pending notifications`;
    }

    // Count sent notifications
    const { count: sentCount } = await supabaseAdmin
      .from('outbid_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('email_sent', true);

    results.checks.sent = `📨 ${sentCount} emails sent`;

    // Try to call the function
    const { data: fnData, error: fnError } = await supabaseAdmin.rpc(
      'get_pending_outbid_notifications',
      { batch_size: 5 }
    );

    if (fnError) {
      results.checks.function = `❌ Function error: ${fnError.message}`;
      results.errors.push(`Function error: ${fnError.message}`);
    } else {
      results.checks.function = '✅ get_pending_outbid_notifications works';
      results.checks.functionData = fnData;
    }

    // Get raw notifications for debugging
    const { data: rawNotifications } = await supabaseAdmin
      .from('outbid_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    results.recentNotifications = rawNotifications;

  } catch (e: any) {
    results.checks.supabase = `❌ Connection error: ${e.message}`;
    results.errors.push(`Supabase error: ${e.message}`);
  }

  // Check Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/domains', {
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
      });
      
      if (res.ok) {
        const domains = await res.json();
        results.checks.resend = '✅ Resend API key valid';
        results.checks.resendDomains = domains.data?.map((d: any) => ({
          name: d.name,
          status: d.status,
        }));
      } else {
        const err = await res.text();
        results.checks.resend = `❌ Resend error: ${err}`;
        results.errors.push(`Resend error: ${err}`);
      }
    } catch (e: any) {
      results.checks.resend = `❌ Resend connection error: ${e.message}`;
    }
  }

  return NextResponse.json(results, { 
    status: results.errors.length > 0 ? 500 : 200 
  });
}
