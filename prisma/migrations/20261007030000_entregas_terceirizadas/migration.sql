-- CreateEnum
CREATE TYPE "ModalidadeEntrega" AS ENUM ('LOJA', 'MOTOBOY', 'TERCEIRIZADO');

-- AlterTable
ALTER TABLE "Entrega" ADD COLUMN     "custo" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "minutosPrestador" INTEGER,
ADD COLUMN     "modalidade" "ModalidadeEntrega" NOT NULL DEFAULT 'LOJA',
ADD COLUMN     "prestador" TEXT;

-- AlterTable
ALTER TABLE "LojaConfig" ADD COLUMN     "motoboyMinutosRetirada" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "motoboyTaxaFixa" DECIMAL(12,2) NOT NULL DEFAULT 8,
ADD COLUMN     "motoboyValorKm" DECIMAL(12,2) NOT NULL DEFAULT 2;

