/*
  Warnings:

  - The values [SIMULACRO] on the enum `EvaluacionTipo` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
ALTER TABLE "evaluaciones"
  ALTER COLUMN "tipo" TYPE TEXT
  USING "tipo"::text;
-- si existen registros con SIMULACRO, pásalos a un valor permitido
UPDATE "evaluaciones"
SET "tipo" = 'PRUEBA'
WHERE "tipo" = 'SIMULACRO';
CREATE TYPE "EvaluacionTipo_new" AS ENUM ('PRUEBA', 'OFICIAL');
ALTER TABLE "evaluaciones" ALTER COLUMN "tipo" TYPE "EvaluacionTipo_new" USING ("tipo"::text::"EvaluacionTipo_new");
ALTER TYPE "EvaluacionTipo" RENAME TO "EvaluacionTipo_old";
ALTER TYPE "EvaluacionTipo_new" RENAME TO "EvaluacionTipo";
DROP TYPE "public"."EvaluacionTipo_old";
COMMIT;

-- AlterTable
ALTER TABLE "evaluaciones" ADD COLUMN     "precio" DOUBLE PRECISION NOT NULL DEFAULT 0;

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

-- CreateIndex
CREATE UNIQUE INDEX "compraEvaluacion_evaluacionId_estudianteId_key" ON "compraEvaluacion"("evaluacionId", "estudianteId");

-- AddForeignKey
ALTER TABLE "compraEvaluacion" ADD CONSTRAINT "compraEvaluacion_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compraEvaluacion" ADD CONSTRAINT "compraEvaluacion_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "evaluaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
