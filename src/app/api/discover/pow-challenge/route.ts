import { NextResponse } from 'next/server';
import { generatePoWChallenge } from '@/lib/pow';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const challenge = generatePoWChallenge(3); // difficulty 3 leading zeros
    return NextResponse.json(challenge);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to generate challenge';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
