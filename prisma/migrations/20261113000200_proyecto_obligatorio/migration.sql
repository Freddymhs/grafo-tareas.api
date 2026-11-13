/*
  Warnings:

  - Made the column `proyecto_id` on table `nodos` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "nodos" ALTER COLUMN "proyecto_id" SET NOT NULL;
