-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM ('CREAR', 'ACTUALIZAR', 'ESTADO', 'ELIMINAR');

-- CreateEnum
CREATE TYPE "EdicionEstado" AS ENUM ('ESPERA', 'ACTIVA', 'FINALIZADA');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'COMPLETADO', 'RECHAZADO', 'REEMBOLSADO');

-- CreateEnum
CREATE TYPE "EvaluacionEstado" AS ENUM ('BORRADOR', 'DISPONIBLE', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "EvaluacionTipo" AS ENUM ('PRUEBA', 'OFICIAL');

-- CreateEnum
CREATE TYPE "IntentoEstado" AS ENUM ('EN_PROGRESO', 'ENVIADO', 'EXPIRADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('YAPE', 'PLIN', 'PAYPAL', 'BINANCE', 'WESTER_UNION', 'TRANSFERENCIA', 'TRANSFERENCIA_DOLARES', 'EFECTIVO', 'OTRO');

-- CreateEnum
CREATE TYPE "Pais" AS ENUM ('PE', 'BO', 'AR', 'CL', 'CO', 'EC', 'MX', 'VE', 'ES', 'US');

-- CreateEnum
CREATE TYPE "PreguntaEstado" AS ENUM ('BORRADOR', 'DISPONIBLE', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "PreguntaTipo" AS ENUM ('ABIERTA', 'CERRADA');

-- CreateEnum
CREATE TYPE "Tabla" AS ENUM ('AUDITORIA', 'CATEGORIAS', 'USUARIOS_ESTUDIANTES', 'ESTUDIANTES', 'USUARIOS_ADMINISTRADORES', 'DOCENTE', 'CURSOS', 'CATEGORIAS_CURSOS', 'REVIEWS_CURSOS', 'EDICIONES_CURSOS', 'BENEFICIOS_CURSOS', 'OBJETIVOS_CURSOS', 'REQUISITOS_CURSOS', 'CLASES', 'MATERIALES', 'EXAMENES', 'CALIFICACIONES', 'INSCRIPCIONES', 'CERTIFICADOS', 'PRECIOS_CURSOS', 'COMPRAS', 'GRABACIONES', 'EVALUACIONES', 'TEMA', 'TEMA_PREGUNTA', 'PREGUNTA', 'PAGOS_DOCENTE');

-- CreateEnum
CREATE TYPE "TipoCertificado" AS ENUM ('PARTICIPACION', 'APROBACION');

-- CreateEnum
CREATE TYPE "TipoCuenta" AS ENUM ('ADMINISTRADOR', 'MODERADOR', 'DOCENTE');

-- CreateEnum
CREATE TYPE "TipoGenero" AS ENUM ('HOMBRE', 'MUJER');

-- CreateEnum
CREATE TYPE "TipoMaterial" AS ENUM ('PDF', 'DOCUMENTO', 'PRESENTACION', 'HOJA_DE_CALCULO', 'VIDEO', 'AUDIO', 'IMAGEN', 'ENLACE', 'CODIGO', 'ZIP', 'TAREA', 'CUESTIONARIO', 'EXAMEN', 'FORMULARIO', 'LIBRO', 'ARTICULO', 'PLANTILLA', 'INFORME', 'GUIA', 'TUTORIAL', 'EJERCICIO', 'SOLUCION', 'OTRO');

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "tabla" "Tabla" NOT NULL,
    "registroId" TEXT,
    "accion" "AccionAuditoria" NOT NULL,
    "detalles" JSONB,
    "usuarioId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bancoPreguntasFalladas" (
    "id" TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "evaluacionId" TEXT NOT NULL,
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluacionIntentosId" TEXT,

    CONSTRAINT "bancoPreguntasFalladas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiosCursos" (
    "id" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficiosCursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calificaciones" (
    "id" TEXT NOT NULL,
    "aprobado" BOOLEAN NOT NULL DEFAULT false,
    "comentarios" TEXT,
    "estudianteId" TEXT NOT NULL,
    "examenId" TEXT NOT NULL,
    "nota" DOUBLE PRECISION NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoriasCursos" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,

    CONSTRAINT "categoriasCursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificados" (
    "id" TEXT NOT NULL,
    "codigoUnico" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoCertificado" NOT NULL DEFAULT 'PARTICIPACION',
    "notaFinal" DOUBLE PRECISION,
    "urlCertificado" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clases" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "duracion" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL,
    "orden" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "urlYoutube" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "urlPresentacion" TEXT,

    CONSTRAINT "clases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "providerId" TEXT NOT NULL,
    "fechaCompra" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodo" "MetodoPago" NOT NULL DEFAULT 'TRANSFERENCIA',
    "deuda" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usuariosEstudiantesId" TEXT,
    "estadoPago" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "conDescuento" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "compras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos" (
    "id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "urlMiniatura" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "descripcionCorta" TEXT,
    "enVivo" BOOLEAN NOT NULL DEFAULT false,
    "urlCurso" TEXT,
    "cargaHoraria" INTEGER NOT NULL DEFAULT 0,
    "codigo" TEXT NOT NULL,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "docente" (
    "id" TEXT NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "celular" TEXT,
    "especialidad" TEXT NOT NULL,
    "experiencia" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "pais" TEXT NOT NULL DEFAULT 'PE',

    CONSTRAINT "docente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edicionesCursos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EdicionEstado" NOT NULL DEFAULT 'ESPERA',
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "notaMaxima" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "notaMinima" DOUBLE PRECISION NOT NULL DEFAULT 51.0,
    "urlWhatsapp" TEXT,
    "vigente" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "docenteId" TEXT,

    CONSTRAINT "edicionesCursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estudiantes" (
    "id" TEXT NOT NULL,
    "apellido" TEXT,
    "celular" TEXT,
    "pais" TEXT NOT NULL DEFAULT '',
    "genero" "TipoGenero" NOT NULL DEFAULT 'HOMBRE',
    "fechaNacimiento" TIMESTAMP(3),
    "nombre" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "nroUpdates" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "estudiantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluacionIntentos" (
    "id" TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "evaluacionId" TEXT NOT NULL,
    "estado" "IntentoEstado" NOT NULL DEFAULT 'EN_PROGRESO',
    "iniciadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vence_en" TIMESTAMP(3) NOT NULL,
    "enviadoEn" TIMESTAMP(3),
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "progreso" JSONB,
    "tiempoConsumido" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "evaluacionIntentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "temas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temaPreguntas" (
    "id" TEXT NOT NULL,
    "temaId" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "puntaje" DOUBLE PRECISION NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temaPreguntas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compraEvaluacion" (
    "id" TEXT NOT NULL,
    "evaluacionId" TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compraEvaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluaciones" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" "EvaluacionTipo" NOT NULL,
    "estado" "EvaluacionEstado" NOT NULL DEFAULT 'BORRADOR',
    "descripcion" TEXT,
    "tiempo_segundos" INTEGER NOT NULL,
    "nota_max" DOUBLE PRECISION NOT NULL,
    "nota_min" DOUBLE PRECISION NOT NULL,
    "gestion" SMALLINT NOT NULL,
    "areas" JSONB NOT NULL,
    "capitulos" JSONB NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "evaluaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examenes" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaDisponible" TIMESTAMP(3) NOT NULL,
    "fechaLimite" TIMESTAMP(3) NOT NULL,
    "notaMaxima" DOUBLE PRECISION NOT NULL,
    "notaMinima" DOUBLE PRECISION NOT NULL,
    "titulo" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "examenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grabaciones" (
    "id" TEXT NOT NULL,
    "claseId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "duracionSegundos" INTEGER,
    "completada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "grabaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "estudianteId" TEXT NOT NULL,
    "inscritoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "compraId" TEXT NOT NULL,

    CONSTRAINT "inscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiales" (
    "id" TEXT NOT NULL,
    "claseId" TEXT NOT NULL,
    "tipo" "TipoMaterial" NOT NULL DEFAULT 'PDF',
    "titulo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objetivosCursos" (
    "id" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "objetivosCursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagosDocentes" (
    "id" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "deuda" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estadoPago" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "fechaPago" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagosDocentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preciosCursos" (
    "id" TEXT NOT NULL,
    "edicionId" TEXT NOT NULL,
    "esDescuento" BOOLEAN NOT NULL DEFAULT false,
    "esPrecioDefault" BOOLEAN NOT NULL DEFAULT false,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "nombre" TEXT NOT NULL,
    "porcentajeDescuento" DOUBLE PRECISION,
    "precio" DOUBLE PRECISION NOT NULL,
    "precioOriginal" DOUBLE PRECISION,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preciosCursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preguntas" (
    "id" TEXT NOT NULL,
    "enunciado" TEXT NOT NULL,
    "tipo" "PreguntaTipo" NOT NULL,
    "estado" "PreguntaEstado" NOT NULL DEFAULT 'BORRADOR',
    "opciones" JSONB,
    "assets" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "codigo" TEXT NOT NULL,
    "explicacion" TEXT,
    "solucion" JSONB NOT NULL,

    CONSTRAINT "preguntas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisitosCursos" (
    "id" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requisitosCursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respuestasEstudiantes" (
    "id" TEXT NOT NULL,
    "intentoId" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "esCorrecta" BOOLEAN,
    "puntajeObtenido" DOUBLE PRECISION,
    "feedback" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respuestasEstudiantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviewsCursos" (
    "id" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comentario" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "usuariosEstudiantesId" TEXT,

    CONSTRAINT "reviewsCursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuariosAdministradores" (
    "id" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "contrasena" TEXT NOT NULL,
    "encargado" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoCuenta" NOT NULL,

    CONSTRAINT "usuariosAdministradores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuariosEstudiantes" (
    "id" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "contrasena" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "avatar" TEXT,
    "estudianteId" TEXT,
    "registrado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "usuariosEstudiantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_evaluacionesTotemas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_evaluacionesTotemas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "auditoria_accion_idx" ON "auditoria"("accion");

-- CreateIndex
CREATE INDEX "auditoria_creadoEn_idx" ON "auditoria"("creadoEn");

-- CreateIndex
CREATE INDEX "auditoria_registroId_idx" ON "auditoria"("registroId");

-- CreateIndex
CREATE INDEX "auditoria_tabla_idx" ON "auditoria"("tabla");

-- CreateIndex
CREATE INDEX "auditoria_usuarioId_idx" ON "auditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "bancoPreguntasFalladas_estudianteId_idx" ON "bancoPreguntasFalladas"("estudianteId");

-- CreateIndex
CREATE INDEX "bancoPreguntasFalladas_resuelta_idx" ON "bancoPreguntasFalladas"("resuelta");

-- CreateIndex
CREATE UNIQUE INDEX "bancoPreguntasFalladas_estudianteId_preguntaId_evaluacionId_key" ON "bancoPreguntasFalladas"("estudianteId", "preguntaId", "evaluacionId");

-- CreateIndex
CREATE INDEX "beneficiosCursos_cursoId_orden_idx" ON "beneficiosCursos"("cursoId", "orden");

-- CreateIndex
CREATE INDEX "calificaciones_aprobado_idx" ON "calificaciones"("aprobado");

-- CreateIndex
CREATE UNIQUE INDEX "calificaciones_estudianteId_examenId_key" ON "calificaciones"("estudianteId", "examenId");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- CreateIndex
CREATE INDEX "categorias_nombre_idx" ON "categorias"("nombre");

-- CreateIndex
CREATE INDEX "categoriasCursos_categoriaId_idx" ON "categoriasCursos"("categoriaId");

-- CreateIndex
CREATE INDEX "categoriasCursos_cursoId_idx" ON "categoriasCursos"("cursoId");

-- CreateIndex
CREATE UNIQUE INDEX "categoriasCursos_cursoId_categoriaId_key" ON "categoriasCursos"("cursoId", "categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "certificados_codigoUnico_key" ON "certificados"("codigoUnico");

-- CreateIndex
CREATE INDEX "clases_edicionId_orden_idx" ON "clases"("edicionId", "orden");

-- CreateIndex
CREATE INDEX "clases_fecha_idx" ON "clases"("fecha");

-- CreateIndex
CREATE INDEX "compras_fechaCompra_idx" ON "compras"("fechaCompra");

-- CreateIndex
CREATE UNIQUE INDEX "cursos_codigo_key" ON "cursos"("codigo");

-- CreateIndex
CREATE INDEX "cursos_codigo_idx" ON "cursos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "docente_usuarioId_key" ON "docente"("usuarioId");

-- CreateIndex
CREATE INDEX "docente_especialidad_idx" ON "docente"("especialidad");

-- CreateIndex
CREATE INDEX "edicionesCursos_codigo_idx" ON "edicionesCursos"("codigo");

-- CreateIndex
CREATE INDEX "edicionesCursos_estado_idx" ON "edicionesCursos"("estado");

-- CreateIndex
CREATE INDEX "edicionesCursos_fechaInicio_fechaFin_idx" ON "edicionesCursos"("fechaInicio", "fechaFin");

-- CreateIndex
CREATE INDEX "edicionesCursos_vigente_idx" ON "edicionesCursos"("vigente");

-- CreateIndex
CREATE UNIQUE INDEX "edicionesCursos_cursoId_codigo_docenteId_key" ON "edicionesCursos"("cursoId", "codigo", "docenteId");

-- CreateIndex
CREATE INDEX "estudiantes_nombre_apellido_idx" ON "estudiantes"("nombre", "apellido");

-- CreateIndex
CREATE INDEX "evaluacionIntentos_estado_idx" ON "evaluacionIntentos"("estado");

-- CreateIndex
CREATE INDEX "evaluacionIntentos_estudianteId_evaluacionId_idx" ON "evaluacionIntentos"("estudianteId", "evaluacionId");

-- CreateIndex
CREATE INDEX "evaluacionIntentos_vence_en_idx" ON "evaluacionIntentos"("vence_en");

-- CreateIndex
CREATE INDEX "temaPreguntas_temaId_orden_idx" ON "temaPreguntas"("temaId", "orden");

-- CreateIndex
CREATE INDEX "temaPreguntas_preguntaId_idx" ON "temaPreguntas"("preguntaId");

-- CreateIndex
CREATE UNIQUE INDEX "temaPreguntas_temaId_preguntaId_key" ON "temaPreguntas"("temaId", "preguntaId");

-- CreateIndex
CREATE UNIQUE INDEX "compraEvaluacion_evaluacionId_estudianteId_key" ON "compraEvaluacion"("evaluacionId", "estudianteId");

-- CreateIndex
CREATE INDEX "evaluaciones_gestion_estado_idx" ON "evaluaciones"("gestion", "estado");

-- CreateIndex
CREATE INDEX "evaluaciones_tipo_estado_idx" ON "evaluaciones"("tipo", "estado");

-- CreateIndex
CREATE INDEX "examenes_edicionId_idx" ON "examenes"("edicionId");

-- CreateIndex
CREATE INDEX "examenes_fechaDisponible_fechaLimite_idx" ON "examenes"("fechaDisponible", "fechaLimite");

-- CreateIndex
CREATE INDEX "grabaciones_claseId_idx" ON "grabaciones"("claseId");

-- CreateIndex
CREATE INDEX "grabaciones_completada_idx" ON "grabaciones"("completada");

-- CreateIndex
CREATE INDEX "grabaciones_fechaInicio_idx" ON "grabaciones"("fechaInicio");

-- CreateIndex
CREATE INDEX "grabaciones_usuarioId_idx" ON "grabaciones"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_compraId_key" ON "inscripciones"("compraId");

-- CreateIndex
CREATE INDEX "inscripciones_estado_idx" ON "inscripciones"("estado");

-- CreateIndex
CREATE INDEX "inscripciones_inscritoEn_idx" ON "inscripciones"("inscritoEn");

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_estudianteId_edicionId_key" ON "inscripciones"("estudianteId", "edicionId");

-- CreateIndex
CREATE INDEX "materiales_claseId_idx" ON "materiales"("claseId");

-- CreateIndex
CREATE INDEX "materiales_tipo_idx" ON "materiales"("tipo");

-- CreateIndex
CREATE INDEX "objetivosCursos_cursoId_orden_idx" ON "objetivosCursos"("cursoId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "pagosDocentes_edicionId_key" ON "pagosDocentes"("edicionId");

-- CreateIndex
CREATE INDEX "pagosDocentes_docenteId_idx" ON "pagosDocentes"("docenteId");

-- CreateIndex
CREATE INDEX "pagosDocentes_edicionId_idx" ON "pagosDocentes"("edicionId");

-- CreateIndex
CREATE INDEX "pagosDocentes_estadoPago_idx" ON "pagosDocentes"("estadoPago");

-- CreateIndex
CREATE INDEX "preciosCursos_edicionId_esPrecioDefault_idx" ON "preciosCursos"("edicionId", "esPrecioDefault");

-- CreateIndex
CREATE INDEX "preciosCursos_esDescuento_idx" ON "preciosCursos"("esDescuento");

-- CreateIndex
CREATE UNIQUE INDEX "preguntas_codigo_key" ON "preguntas"("codigo");

-- CreateIndex
CREATE INDEX "preguntas_estado_idx" ON "preguntas"("estado");

-- CreateIndex
CREATE INDEX "requisitosCursos_cursoId_orden_idx" ON "requisitosCursos"("cursoId", "orden");

-- CreateIndex
CREATE INDEX "respuestasEstudiantes_intentoId_idx" ON "respuestasEstudiantes"("intentoId");

-- CreateIndex
CREATE INDEX "respuestasEstudiantes_preguntaId_idx" ON "respuestasEstudiantes"("preguntaId");

-- CreateIndex
CREATE UNIQUE INDEX "respuestasEstudiantes_intentoId_preguntaId_key" ON "respuestasEstudiantes"("intentoId", "preguntaId");

-- CreateIndex
CREATE INDEX "reviewsCursos_creadoEn_idx" ON "reviewsCursos"("creadoEn");

-- CreateIndex
CREATE INDEX "reviewsCursos_cursoId_idx" ON "reviewsCursos"("cursoId");

-- CreateIndex
CREATE INDEX "reviewsCursos_rating_idx" ON "reviewsCursos"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "usuariosAdministradores_correo_key" ON "usuariosAdministradores"("correo");

-- CreateIndex
CREATE INDEX "usuariosAdministradores_correo_idx" ON "usuariosAdministradores"("correo");

-- CreateIndex
CREATE INDEX "usuariosAdministradores_estado_idx" ON "usuariosAdministradores"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "usuariosEstudiantes_correo_key" ON "usuariosEstudiantes"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "usuariosEstudiantes_usuario_key" ON "usuariosEstudiantes"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "usuariosEstudiantes_estudianteId_key" ON "usuariosEstudiantes"("estudianteId");

-- CreateIndex
CREATE INDEX "usuariosEstudiantes_correo_idx" ON "usuariosEstudiantes"("correo");

-- CreateIndex
CREATE INDEX "usuariosEstudiantes_estado_idx" ON "usuariosEstudiantes"("estado");

-- CreateIndex
CREATE INDEX "_evaluacionesTotemas_B_index" ON "_evaluacionesTotemas"("B");

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuariosAdministradores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bancoPreguntasFalladas" ADD CONSTRAINT "bancoPreguntasFalladas_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bancoPreguntasFalladas" ADD CONSTRAINT "bancoPreguntasFalladas_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "evaluaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bancoPreguntasFalladas" ADD CONSTRAINT "bancoPreguntasFalladas_evaluacionIntentosId_fkey" FOREIGN KEY ("evaluacionIntentosId") REFERENCES "evaluacionIntentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bancoPreguntasFalladas" ADD CONSTRAINT "bancoPreguntasFalladas_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "preguntas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiosCursos" ADD CONSTRAINT "beneficiosCursos_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_examenId_fkey" FOREIGN KEY ("examenId") REFERENCES "examenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categoriasCursos" ADD CONSTRAINT "categoriasCursos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categoriasCursos" ADD CONSTRAINT "categoriasCursos_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "edicionesCursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clases" ADD CONSTRAINT "clases_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "edicionesCursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "edicionesCursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_usuariosEstudiantesId_fkey" FOREIGN KEY ("usuariosEstudiantesId") REFERENCES "usuariosEstudiantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docente" ADD CONSTRAINT "docente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuariosAdministradores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edicionesCursos" ADD CONSTRAINT "edicionesCursos_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edicionesCursos" ADD CONSTRAINT "edicionesCursos_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "docente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacionIntentos" ADD CONSTRAINT "evaluacionIntentos_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacionIntentos" ADD CONSTRAINT "evaluacionIntentos_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "evaluaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temaPreguntas" ADD CONSTRAINT "temaPreguntas_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "preguntas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temaPreguntas" ADD CONSTRAINT "temaPreguntas_temaId_fkey" FOREIGN KEY ("temaId") REFERENCES "temas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compraEvaluacion" ADD CONSTRAINT "compraEvaluacion_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compraEvaluacion" ADD CONSTRAINT "compraEvaluacion_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "evaluaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examenes" ADD CONSTRAINT "examenes_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "edicionesCursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grabaciones" ADD CONSTRAINT "grabaciones_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "clases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grabaciones" ADD CONSTRAINT "grabaciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuariosAdministradores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "edicionesCursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiales" ADD CONSTRAINT "materiales_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "clases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objetivosCursos" ADD CONSTRAINT "objetivosCursos_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagosDocentes" ADD CONSTRAINT "pagosDocentes_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "docente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagosDocentes" ADD CONSTRAINT "pagosDocentes_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "edicionesCursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preciosCursos" ADD CONSTRAINT "preciosCursos_edicionId_fkey" FOREIGN KEY ("edicionId") REFERENCES "edicionesCursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitosCursos" ADD CONSTRAINT "requisitosCursos_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestasEstudiantes" ADD CONSTRAINT "respuestasEstudiantes_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "evaluacionIntentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestasEstudiantes" ADD CONSTRAINT "respuestasEstudiantes_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "preguntas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewsCursos" ADD CONSTRAINT "reviewsCursos_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewsCursos" ADD CONSTRAINT "reviewsCursos_usuariosEstudiantesId_fkey" FOREIGN KEY ("usuariosEstudiantesId") REFERENCES "usuariosEstudiantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuariosEstudiantes" ADD CONSTRAINT "usuariosEstudiantes_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_evaluacionesTotemas" ADD CONSTRAINT "_evaluacionesTotemas_A_fkey" FOREIGN KEY ("A") REFERENCES "evaluaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_evaluacionesTotemas" ADD CONSTRAINT "_evaluacionesTotemas_B_fkey" FOREIGN KEY ("B") REFERENCES "temas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

