-- AlterTable
ALTER TABLE "Asignacion" ADD COLUMN     "cargoId" INTEGER;

-- CreateTable
CREATE TABLE "Cargo" (
    "id" SERIAL NOT NULL,
    "institucionId" INTEGER NOT NULL,
    "numeroCargo" INTEGER,
    "tipoCargo" TEXT,
    "materiaId" INTEGER,
    "unidadId" INTEGER,
    "comisionId" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cargo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
