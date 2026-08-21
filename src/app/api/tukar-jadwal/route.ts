import { NextResponse } from 'next/server';
import { getTukarJadwalRequestsSupabase, saveTukarJadwalRequestsSupabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const requests = await getTukarJadwalRequestsSupabase();
    return NextResponse.json({ success: true, requests });
  } catch (error) {
    return NextResponse.json({ success: false, requests: [], error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!Array.isArray(body.requests)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }
    const success = await saveTukarJadwalRequestsSupabase(body.requests);
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
