/*
  Warnings:

  - You are about to drop the column `option_id` on the `Options` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Options_option_id_key";

-- AlterTable
ALTER TABLE "Options" DROP COLUMN "option_id";
