import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, getAdminClient } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabaseAdmin = getAdminClient();

  try {
    const { lot_id } = await request.json();

    if (!lot_id) {
      return NextResponse.json({ error: 'lot_id required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc('mark_lot_unsold', {
      lot_uuid: lot_id
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
