-- Cuándo nació cada nodo en su fuente (FASE 15). Nunca vacía: lo existente toma su fecha de creación acá, y el
-- importador de Todoist la reemplaza por la de la tarjeta en la próxima corrida.
ALTER TABLE "nodos" ADD COLUMN "fecha_origen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "nodos" SET "fecha_origen" = "created_at";
