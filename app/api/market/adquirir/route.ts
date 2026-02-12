import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth";

export async function POST() {
  const session = await getServerAuthSession();
  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json({ message: "No autenticado." }, { status: 401 });
  }

  return NextResponse.json(
    {
      ok: false,
      message: "La compra por evaluacion fue retirada. Usa el flujo de banqueos/suscripcion.",
    },
    { status: 410 },
  );
}
