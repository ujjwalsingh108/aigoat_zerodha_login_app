/**
 * app/api/start-login/route.js
 * Returns the Kite login URL. The client opens it via window.open().
 */

import { getLoginURL } from '@/lib/kite';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const loginUrl = getLoginURL();
    return NextResponse.json({ success: true, loginUrl });
  } catch (err) {
    console.error('[start-login]', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
