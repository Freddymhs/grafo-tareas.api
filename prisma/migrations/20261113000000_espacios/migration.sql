-- Los enums TipoNodo/TipoConexion pasan a texto validado contra tablas: los datos se conservan (cast a text).
ALTER TABLE "conexiones" ALTER COLUMN "tipo" TYPE TEXT USING "tipo"::text;

ALTER TABLE "nodos" ALTER COLUMN "tipo" TYPE TEXT USING "tipo"::text;
ALTER TABLE "nodos" ALTER COLUMN "estado" DROP NOT NULL;
ALTER TABLE "nodos" ADD COLUMN "proyecto_id" TEXT;

-- CreateTable
CREATE TABLE "espacios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "archivado" BOOLEAN NOT NULL DEFAULT false,
    "metodo" TEXT,
    "etapas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "espacios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyectos" (
    "id" TEXT NOT NULL,
    "espacio_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "archivado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyectos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_nodo" (
    "id" TEXT NOT NULL,
    "espacio_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT,
    "forma" TEXT,
    "tiene_ciclo" BOOLEAN NOT NULL DEFAULT true,
    "accionable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tipos_nodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_conexion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "bloquea" BOOLEAN NOT NULL DEFAULT false,
    "contiene" BOOLEAN NOT NULL DEFAULT false,
    "simetrica" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tipos_conexion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "espacios_nombre_key" ON "espacios"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "proyectos_espacio_id_nombre_key" ON "proyectos"("espacio_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_nodo_espacio_id_nombre_key" ON "tipos_nodo"("espacio_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_conexion_nombre_key" ON "tipos_conexion"("nombre");

-- CreateIndex
CREATE INDEX "nodos_proyecto_id_idx" ON "nodos"("proyecto_id");

-- AddForeignKey
ALTER TABLE "nodos" ADD CONSTRAINT "nodos_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_espacio_id_fkey" FOREIGN KEY ("espacio_id") REFERENCES "espacios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_nodo" ADD CONSTRAINT "tipos_nodo_espacio_id_fkey" FOREIGN KEY ("espacio_id") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropEnum
DROP TYPE "TipoConexion";

-- DropEnum
DROP TYPE "TipoNodo";
