import { NextResponse } from "next/server";

import { BanqueoTipoCreado } from "@/generated/prisma/client";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const { id } = await params;
    const banqueoId = typeof id === "string" ? id.trim() : "";
    if (!banqueoId) {
      return NextResponse.json({ message: "ID invalido." }, { status: 400 });
    }

    const existing = await prisma.banqueo.findUnique({
      where: { id: banqueoId },
      select: { id: true, tipoCreado: true },
    });

    if (!existing) {
      return NextResponse.json({ message: "Banqueo no encontrado." }, { status: 404 });
    }

    if (existing.tipoCreado !== BanqueoTipoCreado.ESTUDIANTE) {
      return NextResponse.json(
        { message: "Solo se pueden eliminar banqueos creados por estudiantes." },
        { status: 403 },
      );
    }

    await prisma.banqueo.delete({
      where: { id: banqueoId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { message: "No se pudo eliminar el banqueo." },
      { status: 500 },
    );
  }
}
