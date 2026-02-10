import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Body = {
  entryId?: unknown;
  resuelta?: unknown;
};

export async function PATCH(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const estudianteId = await resolveEstudianteIdFromSession({
      userId: session.user.id,
      email: session.user.email ?? null,
    });

    if (!estudianteId) {
      return NextResponse.json({ message: "Estudiante no encontrado." }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as Body | null;
    const entryId = typeof body?.entryId === "string" ? body.entryId.trim() : "";

    if (!entryId) {
      return NextResponse.json({ message: "entryId es obligatorio." }, { status: 400 });
    }

    const resuelta = body?.resuelta === true;

    const result = await prisma.bancoPreguntasFalladas.updateMany({
      where: {
        id: entryId,
        estudianteId,
      },
      data: {
        resuelta,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ message: "Registro no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, updated: result.count });
  } catch {
    return NextResponse.json(
      { message: "No se pudo actualizar la pregunta fallada." },
      { status: 500 },
    );
  }
}

async function resolveEstudianteIdFromSession(params: {
  userId?: string | null;
  email?: string | null;
}) {
  const userId = params.userId?.trim();
  const email = params.email?.trim();

  if (userId) {
    const usuarioEstudiante = await prisma.usuariosEstudiantes.findUnique({
      where: { id: userId },
      select: { estudianteId: true },
    });

    if (usuarioEstudiante?.estudianteId) {
      return usuarioEstudiante.estudianteId;
    }

    const estudiante = await prisma.estudiantes.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (estudiante?.id) {
      return estudiante.id;
    }
  }

  if (email) {
    const estudiante = await prisma.estudiantes.findFirst({
      where: {
        usuariosEstudiantes: {
          correo: email,
        },
      },
      select: { id: true },
    });

    if (estudiante?.id) {
      return estudiante.id;
    }
  }

  return null;
}
