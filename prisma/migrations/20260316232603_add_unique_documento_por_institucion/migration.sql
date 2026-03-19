/*
  Warnings:

  - Made the column `documento` on table `AgenteInstitucion` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "AgenteInstitucion" ALTER COLUMN "documento" SET NOT NULL;
