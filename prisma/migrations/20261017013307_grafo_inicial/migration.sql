-- CreateEnum
CREATE TYPE "TipoNodo" AS ENUM ('TAREA', 'HISTORIA', 'FASE', 'RAMA', 'DUDA', 'PERSONA', 'PR', 'DAILY_ITEM');

-- CreateEnum
CREATE TYPE "EstadoNodo" AS ENUM ('ABIERTO', 'CERRADO');

-- CreateEnum
CREATE TYPE "TipoConexion" AS ENUM ('DEPENDE_DE', 'ESPERA_RESPUESTA_DE', 'BLOQUEADA_POR', 'PERTENECE_A', 'EN_DAILY_DE');

-- CreateTable
CREATE TABLE "nodos" (
    "id" TEXT NOT NULL,
    "tipo" "TipoNodo" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoNodo" NOT NULL DEFAULT 'ABIERTO',
    "color" TEXT,
    "externo_origen" TEXT,
    "externo_id" TEXT,
    "pos_x" DOUBLE PRECISION,
    "pos_y" DOUBLE PRECISION,
    "pos_z" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nodos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conexiones" (
    "id" TEXT NOT NULL,
    "origen_id" TEXT NOT NULL,
    "destino_id" TEXT NOT NULL,
    "tipo" "TipoConexion" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conexiones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nodos_tipo_estado_idx" ON "nodos"("tipo", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "nodos_externo_origen_externo_id_key" ON "nodos"("externo_origen", "externo_id");

-- CreateIndex
CREATE INDEX "conexiones_destino_id_idx" ON "conexiones"("destino_id");

-- CreateIndex
CREATE UNIQUE INDEX "conexiones_origen_id_destino_id_tipo_key" ON "conexiones"("origen_id", "destino_id", "tipo");

-- AddForeignKey
ALTER TABLE "conexiones" ADD CONSTRAINT "conexiones_origen_id_fkey" FOREIGN KEY ("origen_id") REFERENCES "nodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conexiones" ADD CONSTRAINT "conexiones_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "nodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
