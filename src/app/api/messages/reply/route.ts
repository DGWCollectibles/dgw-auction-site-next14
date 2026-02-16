import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUserId } from '@/lib/auth-helpers';
import { verifyAdmin } from '@/lib/admin-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { conversation_id, message } = await request.json();

    if (!conversation_id || !message) {
      return NextResponse.json({ error: 'conversation_id and message required' }, { status: 400 });
    }

    // Get conversation
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Determine if sender is admin or user
    const adminAuth = await verifyAdmin(request);
    const userId = await getAuthenticatedUserId();

    let senderType: 'admin' | 'user';
    let senderId: string | null = null;

    if (adminAuth.authorized) {
      senderType = 'admin';
      senderId = adminAuth.userId;
    } else if (userId && conversation.user_id === userId) {
      senderType = 'user';
      senderId = userId;
    } else {
      return NextResponse.json({ error: 'Not authorized to reply' }, { status: 403 });
    }

    // Insert message
    const { data: newMessage, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id,
        sender_type: senderType,
        sender_id: senderId,
        body: message,
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // Update conversation timestamps and read status
    const updateData: any = {
      last_message_at: new Date().toISOString(),
    };

    if (senderType === 'admin') {
      updateData.unread_by_user = true;
      updateData.unread_by_admin = false;
    } else {
      updateData.unread_by_admin = true;
      updateData.unread_by_user = false;
    }

    await supabaseAdmin
      .from('conversations')
      .update(updateData)
      .eq('id', conversation_id);

    // Send email notification
    try {
      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.FROM_EMAIL || 'noreply@dgw.auction';
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dgw.auction';

      if (resendKey && senderType === 'admin') {
        // Notify user that admin replied
        let toEmail: string | null = null;
        if (conversation.user_id) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('email')
            .eq('id', conversation.user_id)
            .single();
          toEmail = profile?.email || null;
        } else {
          toEmail = conversation.guest_email;
        }

        if (toEmail) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: toEmail,
              subject: `Re: ${conversation.subject} - DGW Collectibles`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; padding: 30px; color: #e8e8ec;">
                  <h2 style="color: #C9A962; margin-bottom: 5px;">DGW Collectibles & Estates</h2>
                  <p style="color: #747484; font-size: 12px; margin-top: 0;">RE: ${conversation.subject}</p>
                  <hr style="border-color: #1e1e22;" />
                  <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
                  <hr style="border-color: #1e1e22;" />
                  <p style="text-align: center;">
                    <a href="${siteUrl}/account?tab=messages" style="color: #C9A962; text-decoration: none;">View in your account</a>
                  </p>
                  <p style="color: #4d4d55; font-size: 11px; text-align: center;">DGW Collectibles & Estates - Poughkeepsie, NY 12603</p>
                </div>
              `,
            }),
          });
        }

        // Create in-app notification for user
        if (conversation.user_id) {
          await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: conversation.user_id,
              type: 'message',
              title: 'New reply from DGW',
              message: `Re: ${conversation.subject}`,
              link: '/account?tab=messages',
            });
        }
      }
    } catch (emailError) {
      console.error('Reply notification email failed:', emailError);
    }

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error: any) {
    console.error('Reply error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
