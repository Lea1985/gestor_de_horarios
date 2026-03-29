-- AlterTable
ALTER TABLE "Incidencia" ADD COLUMN     "codigarioItemId" INTEGER;

-- CreateTable
CREATE TABLE "Codigario" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Codigario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodigarioItem" (
    "id" SERIAL NOT NULL,
    "codigarioId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CodigarioItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Codigario_institucionId_idx" ON "Codigario"("institucionId");

-- CreateIndex
CREATE UNIQUE INDEX "Codigario_institucionId_nombre_key" ON "Codigario"("institucionId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "CodigarioItem_codigarioId_codigo_key" ON "CodigarioItem"("codigarioId", "codigo");

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_codigarioItemId_fkey" FOREIGN KEY ("codigarioItemId") REFERENCES "CodigarioItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Codigario" ADD CONSTRAINT "Codigario_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodigarioItem" ADD CONSTRAINT "CodigarioItem_codigarioId_fkey" FOREIGN KEY ("codigarioId") REFERENCES "Codigario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
