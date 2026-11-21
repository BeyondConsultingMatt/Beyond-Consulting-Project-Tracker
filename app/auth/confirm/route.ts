import {NextRequest,NextResponse} from 'next/server';
import {database} from '../../../lib/server';
import {configured} from '../../../lib/config';

export async function GET(request: NextRequest) {
  const origin = process.env.APP_URL || request.nextUrl.origin;
  const token = request.nextUrl.searchParams.get('token_hash');
  const code = request.nextUrl.searchParams.get('code');
  if (configured && (token || code)) {
    const db = await database();
    const result = token
      ? await db.auth.verifyOtp({type:'recovery',token_hash:token})
      : await db.auth.exchangeCodeForSession(code!);
    if (!result.error) return NextResponse.redirect(new URL('/login?mode=update',origin));
  }
  return NextResponse.redirect(new URL('/login?mode=request&expired=1',origin));
}
