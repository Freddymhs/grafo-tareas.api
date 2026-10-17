-- AlterTable
ALTER TABLE "nodos" ADD COLUMN     "etapa" TEXT,
ADD COLUMN     "etiquetas" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "prioridad" INTEGER,
ADD COLUMN     "vence" DATE;

-- CreateIndex
CREATE INDEX "nodos_etapa_idx" ON "nodos"("etapa");
