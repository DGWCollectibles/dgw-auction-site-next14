import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, getAdminClient } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabaseAdmin = getAdminClient();
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('id');
  const statusFilter = searchParams.get('status') || 'open';

  try {
    // Single conversation with all messages
    if (conversationId) {
      const { data: conversation, error: convError } = await supabaseAdmin
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      // Get messages
      const { data: messages } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      // Get user info if authenticated user
      let userInfo = null;
      if (conversation.user_id) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', conversation.user_id)
          .single();
        userInfo = profile;
      }

      // Mark as read by admin
      await supabaseAdmin
        .from('conversations')
        .update({ unread_by_admin: false })
        .eq('id', conversationId);

      return NextResponse.json({
        conversation: { ...conversation, user: userInfo },
        messages: messages || [],
      });
    }

    // List all conversations
    let query = supabaseAdmin
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: conversations, error } = await query.limit(100);
    if (error) throw error;

    // Get user profiles for authenticated conversations
    const userIds = [...new Set((conversations || []).filter(c => c.user_id).map(c => c.user_id))];
    let profiles: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      (profileData || []).forEach(p => { profiles[p.id] = p; });
    }

    // Get last message for each
    const convIds = (conversations || []).map(c => c.id);
    const { data: allMessages } = await supabaseAdmin
      .from('messages')
      .select('conversation_id, body, sender_type, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });

    const lastMessages: Record<string, any> = {};
    const messageCounts: Record<string, number> = {};
    (allMessages || []).forEach(m => {
      if (!lastMessages[m.conversation_id]) lastMessages[m.conversation_id] = m;
      messageCounts[m.conversation_id] = (messageCounts[m.conversation_id] || 0) + 1;
    });

    const formatted = (conversations || []).map(conv => ({
      ...conv,
      user: conv.user_id ? profiles[conv.user_id] || null : null,
      sender_name: conv.user_id ? profiles[conv.user_id]?.full_name || 'User' : conv.guest_name || 'Guest',
      sender_email: conv.user_id ? profiles[conv.user_id]?.email : conv.guest_email,
      last_message: lastMessages[conv.id] || null,
      message_count: messageCounts[conv.id] || 0,
    }));

    // Count unread
    const unreadCount = (conversations || []).filter(c => c.unread_by_admin).length;

    return NextResponse.json({ conversations: formatted, unread_count: unreadCount });
  } catch (error: any) {
    console.error('Admin messages error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update conversation status
export async function PATCH(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabaseAdmin = getAdminClient();

  try {
    const { conversation_id, status } = await request.json();

    if (!conversation_id || !status) {
      return NextResponse.json({ error: 'conversation_id and status required' }, { status: 400 });
    }

    if (!['open', 'closed', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('conversations')
      .update({ status })
      .eq('id', conversation_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
