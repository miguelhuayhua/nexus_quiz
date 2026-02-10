import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | { evaluacionId?: unknown }
      | null;
    const evaluacionId =
      typeof body?.evaluacionId === "string" ? body.evaluacionId.trim() : "";

    if (!evaluacionId) {
      return NextResponse.json(
        { message: "evaluacionId es obligatorio." },
        { status: 400 },
      );
    }

    const estudiante = await prisma.estudiantes.findFirst({
      where: {
        usuariosEstudiantes: {
          correo: session.user.email,
        },
      },
      select: {
        id: true,
      },
    });

    if (!estudiante) {
      return NextResponse.json(
        { message: "Estudiante no encontrado." },
        { status: 404 },
      );
    }

    const evaluacion = await prisma.evaluaciones.findFirst({
      where: {
        id: evaluacionId,
        estado: "DISPONIBLE",
      },
      select: {
        id: true,
      },
    });

    if (!evaluacion) {
      return NextResponse.json(
        { message: "Evaluacion no disponible." },
        { status: 404 },
      );
    }

    const now = new Date();

    const compra = await prisma.compraEvaluacion.upsert({
      where: {
        evaluacionId_estudianteId: {
          evaluacionId,
          estudianteId: estudiante.id,
        },
      },
      create: {
        id: randomUUID(),
        evaluacionId,
        estudianteId: estudiante.id,
        estado: "COMPLETADO",
        actualizadoEn: now,
      },
      update: {
        estado: "COMPLETADO",
        actualizadoEn: now,
      },
      select: {
        id: true,
        estado: true,
      },
    });

    return NextResponse.json({
      ok: true,
      compraId: compra.id,
      estado: compra.estado,
    });
  } catch {
    return NextResponse.json(
      { message: "Error al procesar la compra." },
      { status: 500 },
    );
  }
}

