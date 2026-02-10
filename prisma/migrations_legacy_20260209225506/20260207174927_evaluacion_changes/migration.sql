/*
  Warnings:

  - The values [EVALUACION_PREGUNTA] on the enum `Tabla` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `kind` on the `respuestasEstudiantes` table. All the data in the column will be lost.
  - You are about to drop the `evaluacionPreguntas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `soluciones` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `solucion` to the `preguntas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Tabla_new" AS ENUM ('AUDITORIA', 'CATEGORIAS', 'USUARIOS_ESTUDIANTES', 'ESTUDIANTES', 'USUARIOS_ADMINISTRADORES', 'DOCENTE', 'CURSOS', 'CATEGORIAS_CURSOS', 'REVIEWS_CURSOS', 'EDICIONES_CURSOS', 'BENEFICIOS_CURSOS', 'OBJETIVOS_CURSOS', 'REQUISITOS_CURSOS', 'CLASES', 'MATERIALES', 'EXAMENES', 'CALIFICACIONES', 'INSCRIPCIONES', 'CERTIFICADOS', 'PRECIOS_CURSOS', 'COMPRAS', 'GRABACIONES', 'EVALUACIONES', 'TEMA', 'TEMA_PREGUNTA', 'PREGUNTA', 'PAGOS_DOCENTE');
ALTER TABLE "auditoria" ALTER COLUMN "tabla" TYPE "Tabla_new" USING ("tabla"::text::"Tabla_new");
ALTER TYPE "Tabla" RENAME TO "Tabla_old";
ALTER TYPE "Tabla_new" RENAME TO "Tabla";
DROP TYPE "public"."Tabla_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "evaluacionPreguntas" DROP CONSTRAINT "evaluacionPreguntas_evaluacionId_fkey";

-- DropForeignKey
ALTER TABLE "evaluacionPreguntas" DROP CONSTRAINT "evaluacionPreguntas_preguntaId_fkey";

-- DropForeignKey
ALTER TABLE "soluciones" DROP CONSTRAINT "soluciones_preguntaId_fkey";

-- AlterTable
ALTER TABLE "preguntas" ADD COLUMN     "explicacion" TEXT,
ADD COLUMN     "solucion" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "respuestasEstudiantes" DROP COLUMN "kind";

-- DropTable
DROP TABLE "evaluacionPreguntas";

-- DropTable
DROP TABLE "soluciones";

-- DropEnum
DROP TYPE "SolucionKind";

-- CreateTable
CREATE TABLE "temas" (
    "id" TEXT NOT NULL,
    "evaluacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
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

-- CreateIndex
CREATE INDEX "temas_evaluacionId_orden_idx" ON "temas"("evaluacionId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "temas_evaluacionId_nombre_key" ON "temas"("evaluacionId", "nombre");

-- CreateIndex
CREATE INDEX "temaPreguntas_temaId_orden_idx" ON "temaPreguntas"("temaId", "orden");

-- CreateIndex
CREATE INDEX "temaPreguntas_preguntaId_idx" ON "temaPreguntas"("preguntaId");

-- CreateIndex
CREATE UNIQUE INDEX "temaPreguntas_temaId_preguntaId_key" ON "temaPreguntas"("temaId", "preguntaId");

-- CreateIndex
CREATE INDEX "preguntas_estado_idx" ON "preguntas"("estado");

-- AddForeignKey
ALTER TABLE "temas" ADD CONSTRAINT "temas_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "evaluaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temaPreguntas" ADD CONSTRAINT "temaPreguntas_temaId_fkey" FOREIGN KEY ("temaId") REFERENCES "temas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temaPreguntas" ADD CONSTRAINT "temaPreguntas_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "preguntas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
