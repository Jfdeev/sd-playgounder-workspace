import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { exportAccountData } from '@/db/account';

/** "Baixar meus dados" (LGPD, specs/conta-lgpd US3): JSON só com os dados da própria conta, como anexo. */
export async function GET(): Promise<Response> {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const data = await exportAccountData(userId);
  if (!data) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': 'attachment; filename="meus-dados-system-design-playground.json"',
      'cache-control': 'no-store',
    },
  });
}
