import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUsuarioEstudianteIdFromSession } from "@/lib/subscription-access";

type FinalizarRepasoBody = {
  bancoId?: unknown;
  resultados?: unknown;
};

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const usuarioEstudianteId = await resolveUsuarioEstudianteIdFromSession({
      userId: session.user.id,
      email: session.user.email ?? null,
    });
    if (!usuarioEstudianteId) {
      return NextResponse.json({ message: "Estudiante no encontrado." }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as FinalizarRepasoBody | null;
    const bancoId = typeof body?.bancoId === "string" ? body.bancoId.trim() : "";
    if (!bancoId) {
      return NextResponse.json({ message: "bancoId es obligatorio." }, { status: 400 });
    }

    const rawResultados = Array.isArray(body?.resultados) ? body?.resultados : [];
    const resultados = rawResultados
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const candidato = item as Record<string, unknown>;
        const preguntaId =
          typeof candidato.preguntaId === "string" ? candidato.preguntaId.trim() : "";
        const esCorrecta = candidato.esCorrecta === true;
        if (!preguntaId) return null;
        return { preguntaId, esCorrecta };
      })
      .filter((item): item is { preguntaId: string; esCorrecta: boolean } => item !== null);

    if (resultados.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 });
    }

    const now = new Date();
    await prisma.repasoRegistros.createMany({
      data: resultados.map((item) => ({
        id: randomUUID(),
        usuarioEstudianteId,
        banqueoId: bancoId,
        preguntaId: item.preguntaId,
        esCorrecta: item.esCorrecta,
        creadoEn: now,
      })),
    });

    return NextResponse.json({ ok: true, inserted: resultados.length });
  } catch {
    return NextResponse.json({ message: "No se pudo guardar el repaso." }, { status: 500 });
  }
}

