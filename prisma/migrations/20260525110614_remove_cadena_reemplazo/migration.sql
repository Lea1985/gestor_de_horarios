/*
  Warnings:

  - You are about to drop the column `reemplazoPadreId` on the `Reemplazo` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Reemplazo" DROP CONSTRAINT "Reemplazo_reemplazoPadreId_fkey";

-- DropIndex
DROP INDEX "Reemplazo_reemplazoPadreId_idx";

-- AlterTable
ALTER TABLE "Reemplazo" DROP COLUMN "reemplazoPadreId";
