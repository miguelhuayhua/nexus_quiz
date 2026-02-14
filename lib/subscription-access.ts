import { EstadoSuscripcion } from "@/prisma/generated";
import { prisma } from "@/lib/prisma";

type SessionIdentity = {
  userId?: string | null;
  email?: string | null;
};

export async function resolveUsuarioEstudianteIdFromSession({
  userId,
  email,
}: SessionIdentity) {
  const normalizedUserId = userId?.trim();
  const normalizedEmail = email?.trim();

  if (normalizedUserId) {
    const byId = await prisma.usuariosEstudiantes.findUnique({
      where: { id: normalizedUserId },
      select: { id: true },
    });
    if (byId?.id) {
      return byId.id;
    }
  }

  if (normalizedEmail) {
    const byEmail = await prisma.usuariosEstudiantes.findUnique({
      where: { correo: normalizedEmail },
      select: { id: true },
    });
    if (byEmail?.id) {
      return byEmail.id;
    }
  }

  return null;
}

export async function hasActiveProSubscription(
  usuarioEstudianteId?: string | null,
) {
  if (!usuarioEstudianteId) {
    return false;
  }

  const now = new Date();
  const active = await prisma.suscripciones.findFirst({
    where: {
      usuarioEstudianteId,
      estado: EstadoSuscripcion.ACTIVA,
      fechaFin: {
        gte: now,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(active);
}
