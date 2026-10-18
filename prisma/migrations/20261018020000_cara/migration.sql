-- De qué cara de su HU es cada nodo (FASE 17): lo real o el plan. Lo existente queda REAL; el Draft pasa al plan al
-- reimportarlo con --cara PLAN.
CREATE TYPE "Cara" AS ENUM ('REAL', 'PLAN');
ALTER TABLE "nodos" ADD COLUMN "cara" "Cara" NOT NULL DEFAULT 'REAL';
