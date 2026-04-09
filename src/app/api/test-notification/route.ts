import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  return NextResponse.json({ error: 'Rota desativada' }, { status: 404 });
}
