import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { BanqueoTipo, BanqueoTipoCreado, EstadoIntento, PreguntaEstado } from "@/generated/prisma/client";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  hasActiveProSubscription,
  resolveUsuarioEstudianteIdFromSession,
} from "@/lib/subscription-access";
import EvaluacionTake, { type EvaluacionForClient } from "@/app/prueba/[bancoId]/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = {
  bancoId: string;
};

type SearchParams = {
  intentoId?: string;
};

type Props = {
  params: Params | Promise<Params>;
  searchParams?: SearchParams | Promise<SearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const banco = await prisma.banqueo.findFirst({
    where: {
      id: resolvedParams.bancoId,
      tipoCreado: BanqueoTipoCreado.ESTUDIANTE,
    },
    select: { titulo: true },
  });

  return {
    title: banco ? `Prueba: ${banco.titulo}` : "Prueba",
    description: "Resolución de banqueo personal con temporizador y registro de respuestas.",
  };
}

type PreguntaAsset = NonNullable<EvaluacionForClient["preguntas"][number]["assets"]>[number];
type PreguntaOption = {
  label: string;
  value: string;
  kind?: string;
  alt?: string;
};

function normalizeAssets(): PreguntaAsset[] {
  return [];
}

function normalizeOpciones(value: unknown): PreguntaOption[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): PreguntaOption | null => {
      if (item && typeof item === "object") {
        const candidate = item as Record<string, unknown>;
        const rawValue = candidate.value;
        const rawLabel = candidate.label;
        const rawUrl = candidate.url;

        const optionValue =
          typeof rawValue === "string" || typeof rawValue === "number"
            ? String(rawValue)
            : typeof rawUrl === "string"
              ? rawUrl
              : null;

        if (!optionValue) return null;

        return {
          label:
            typeof rawLabel === "string" && rawLabel.trim().length > 0
              ? rawLabel
              : optionValue,
          value: optionValue,
          kind: typeof candidate.kind === "string" ? candidate.kind : undefined,
          alt: typeof candidate.alt === "string" ? candidate.alt : undefined,
        };
      }

      if (typeof item === "string" || typeof item === "number") {
        return {
          label: String(item),
          value: String(item),
        };
      }

      return null;
    })
    .filter((item): item is PreguntaOption => item !== null);
}

function inferPreguntaTipo(opciones: unknown): "ABIERTA" | "CERRADA" {
  return Array.isArray(opciones) && opciones.length > 0 ? "CERRADA" : "ABIERTA";
}

function coerceRespuestaToString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") return JSON.stringify(value);
  return "";
}

export default async function MisBanqueosPruebaPage({ params, searchParams }: Props) {
  const session = await getServerAuthSession();

  if (!session?.user?.id && !session?.user?.email) {
    return notFound();
  }

  const resolvedParams = await Promise.resolve(params);
  if (!resolvedParams?.bancoId) {
    return notFound();
  }

  const resolvedSearch = await Promise.resolve(searchParams ?? {});
  const intentoIdQuery =
    typeof resolvedSearch.intentoId === "string" ? resolvedSearch.intentoId.trim() : "";

  const usuarioEstudianteId = await resolveUsuarioEstudianteIdFromSession({
    userId: session?.user?.id,
    email: session?.user?.email ?? null,
  });
  if (!usuarioEstudianteId) {
    return notFound();
  }
  const hasPro = await hasActiveProSubscription(usuarioEstudianteId);

  const banco = await prisma.banqueo.findFirst({
    where: {
      id: resolvedParams.bancoId,
      tipoCreado: BanqueoTipoCreado.ESTUDIANTE,
    },
    select: {
      id: true,
      titulo: true,
      tipo: true,
      duracion: true,
      preguntas: {
        where: {
          estado: PreguntaEstado.DISPONIBLE,
        },
        select: {
          id: true,
          codigo: true,
          enunciado: true,
          explicacion: true,
          opciones: true,
          solucion: true,
          gestion: true,
          temas: {
            select: {
              titulo: true,
              descripcion: true,
            },
            orderBy: {
              titulo: "asc",
            },
          },
          capitulos: {
            select: {
              titulo: true,
            },
          },
          areas: {
            select: {
              titulo: true,
            },
          },
        },
      },
    },
  });

  if (!banco) {
    return notFound();
  }

  if (banco.tipo === BanqueoTipo.PRO && !hasPro) {
    return notFound();
  }

  const now = new Date();
  const intentosCount = await prisma.intentos.count({
    where: {
      banqueoId: banco.id,
      usuarioEstudianteId,
    },
  });

  let intentoActivo = intentoIdQuery
    ? await prisma.intentos.findFirst({
      where: {
        id: intentoIdQuery,
        banqueoId: banco.id,
        usuarioEstudianteId,
      },
      include: {
        respuestasIntentos: {
          select: {
            preguntaId: true,
            respuesta: true,
          },
        },
      },
    })
    : null;

  if (!intentoActivo) {
    if (intentosCount >= 3) {
      return (
        <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="font-semibold text-2xl">Límite de intentos alcanzado</h1>
          <p className="text-muted-foreground">
            Ya completaste los 3 intentos permitidos para este banqueo.
          </p>
        </main>
      );
    }

    intentoActivo = await prisma.intentos.create({
      data: {
        id: randomUUID(),
        banqueoId: banco.id,
        usuarioEstudianteId,
        correctas: 0,
        incorrectas: 0,
        tiempoDuracion: 0,
        estado: EstadoIntento.EN_PROGRESO,
        creadoEn: now,
        actualizadoEn: now,
      },
      include: {
        respuestasIntentos: {
          select: {
            preguntaId: true,
            respuesta: true,
          },
        },
      },
    });

    if (banco.preguntas.length > 0) {
      await prisma.respuestasIntentos.createMany({
        data: banco.preguntas.map((pregunta, index) => ({
          id: randomUUID(),
          intentoId: intentoActivo!.id,
          preguntaId: pregunta.id,
          respondida: false,
          visitada: false,
          marcadaRevision: false,
          tiempoConsumidoSeg: 0,
          orden: index,
          creadoEn: now,
          actualizadoEn: now,
        })),
      });
    }
  }

  const savedResponses = Object.fromEntries(
    intentoActivo.respuestasIntentos
      .map((item) => [item.preguntaId, coerceRespuestaToString(item.respuesta)] as const)
      .filter((entry) => entry[1].trim().length > 0),
  );

  const gestiones = banco.preguntas.map((pregunta) => pregunta.gestion);
  const areas = Array.from(
    new Set(banco.preguntas.flatMap((pregunta) => pregunta.areas.map((area) => area.titulo))),
  );
  const capitulos = Array.from(
    new Set(
      banco.preguntas.flatMap((pregunta) => pregunta.capitulos.map((capitulo) => capitulo.titulo)),
    ),
  );

  const payload: EvaluacionForClient = {
    id: banco.id,
    titulo: banco.titulo,
    descripcion: null,
    tipo: banco.tipo,
    estado: "DISPONIBLE",
    gestion: gestiones.length > 0 ? Math.max(...gestiones) : new Date().getFullYear(),
    tiempoSegundos: banco.duracion,
    initialTimeLeft: Math.max(0, banco.duracion - Math.max(0, intentoActivo.tiempoDuracion)),
    initialCurrentIndex: 0,
    initialIsPaused: false,
    savedResponses,
    intentoId: intentoActivo.id,
    resultBasePath: `/mis-banqueos/${banco.id}`,
    areas,
    capitulos,
    preguntas: banco.preguntas.map((pregunta) => ({
      id: pregunta.id,
      codigo: pregunta.codigo,
      temaNombre: pregunta.temas[0]?.titulo ?? null,
      temaDescripcion: pregunta.temas[0]?.descripcion ?? null,
      enunciado: pregunta.enunciado,
      tipo: inferPreguntaTipo(pregunta.opciones),
      opciones: normalizeOpciones(pregunta.opciones),
      assets: normalizeAssets(),
      solucionKind: extractSolucionKind(pregunta.solucion),
    })),
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-10">
      <EvaluacionTake evaluacion={payload} />
    </main>
  );
}

function extractSolucionKind(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const kind = candidate.kind;
  return typeof kind === "string" && kind.trim().length > 0 ? kind : null;
}
