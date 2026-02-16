import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUserId } from '@/lib/auth-helpers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List conversations for authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select(`
        *,
        messages (
          id, body, sender_type, created_at
        )
      `)
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    // Get last message for each conversation
    const formatted = (conversations || []).map(conv => {
      const msgs = (conv.messages || []).sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return {
        ...conv,
        last_message: msgs[0] || null,
        message_count: msgs.length,
        messages: undefined,
      };
    });

    return NextResponse.json({ conversations: formatted });
  } catch (error: any) {
    console.error('Get conversations error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create new conversation with first message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subject, message, name, email } = body;

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    // Check if user is authenticated (optional - guests can message too)
    const userId = await getAuthenticatedUserId();

    // Guest must provide name + email
    if (!userId && (!name || !email)) {
      return NextResponse.json({ error: 'Name and email are required for guests' }, { status: 400 });
    }

    // Get user profile for name/email if authenticated
    let senderName = name;
    let senderEmail = email;
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();
      senderName = profile?.full_name || name || 'User';
      senderEmail = profile?.email || email;
    }

    // Create conversation
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .insert({
        user_id: userId || null,
        guest_name: userId ? null : senderName,
        guest_email: userId ? null : senderEmail,
        subject,
        status: 'open',
        unread_by_admin: true,
        unread_by_user: false,
      })
      .select()
      .single();

    if (convError) throw convError;

    // Create first message
    const { error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_type: userId ? 'user' : 'guest',
        sender_id: userId || null,
        body: message,
      });

    if (msgError) throw msgError;

    // Send notification email to admin via Resend
    try {
      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.FROM_EMAIL || 'noreply@dgw.auction';
      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: 'dgwcollectibles@gmail.com',
            subject: `New Message: ${subject}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #C9A962;">New Message on DGW Auctions</h2>
                <p><strong>From:</strong> ${senderName} (${senderEmail})</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <hr style="border-color: #333;" />
                <p style="white-space: pre-wrap;">${message}</p>
                <hr style="border-color: #333;" />
                <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://dgw.auction'}/admin/messages" style="color: #C9A962;">Reply in Admin Panel</a></p>
              </div>
            `,
          }),
        });
      }
    } catch (emailError) {
      console.error('Admin notification email failed:', emailError);
    }

    return NextResponse.json({ success: true, conversation_id: conversation.id });
  } catch (error: any) {
    console.error('Create conversation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
