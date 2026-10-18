-- El pulido del grafo (FASE 16): lo descartado se archiva entero (no se borra) y cada cambio queda en la bitácora.
CREATE TYPE "TipoCambio" AS ENUM ('EDICION', 'DESCARTE', 'RESTAURACION');

CREATE TABLE "descartes" (
    "id" TEXT NOT NULL,
    "nodo_id" TEXT NOT NULL,
    "externo_origen" TEXT,
    "externo_id" TEXT,
    "titulo" TEXT NOT NULL,
    "nodo" JSONB NOT NULL,
    "conexiones" JSONB NOT NULL,
    "motivo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "descartes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "descartes_nodo_id_key" ON "descartes"("nodo_id");
CREATE UNIQUE INDEX "descartes_externo_origen_externo_id_key" ON "descartes"("externo_origen", "externo_id");

CREATE TABLE "cambios" (
    "id" TEXT NOT NULL,
    "nodo_id" TEXT NOT NULL,
    "externo_origen" TEXT,
    "externo_id" TEXT,
    "titulo" TEXT NOT NULL,
    "tipo" "TipoCambio" NOT NULL,
    "campo" TEXT,
    "antes" TEXT,
    "despues" TEXT,
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cambios_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cambios_nodo_id_idx" ON "cambios"("nodo_id");
CREATE INDEX "cambios_externo_origen_externo_id_idx" ON "cambios"("externo_origen", "externo_id");
