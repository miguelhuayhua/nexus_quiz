import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth";

type Body = {
  entryId?: unknown;
  resuelta?: unknown;
};

export async function PATCH(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json({ message: "No autenticado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const entryId = typeof body?.entryId === "string" ? body.entryId.trim() : "";

  if (!entryId) {
    return NextResponse.json({ message: "entryId es obligatorio." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, updated: 0, message: "Sincronizacion no requerida." });
}
