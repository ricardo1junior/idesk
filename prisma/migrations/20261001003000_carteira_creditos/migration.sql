-- CreateEnum
CREATE TYPE "TipoCredito" AS ENUM ('RECARGA', 'DIARIA', 'BONUS', 'AJUSTE');

-- CreateEnum
CREATE TYPE "FormaRecarga" AS ENUM ('PIX', 'BOLETO', 'CARTAO');

-- CreateEnum
CREATE TYPE "StatusRecarga" AS ENUM ('PENDENTE', 'PAGA', 'CANCELADA');

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "asaasClienteId" TEXT,
ADD COLUMN     "cobradoAte" DATE,
ADD COLUMN     "diaria" DECIMAL(10,2),
ADD COLUMN     "isenta" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ConfigSistema" (
    "id" TEXT NOT NULL DEFAULT 'sistema',
    "diariaPadrao" DECIMAL(10,2) NOT NULL DEFAULT 3.30,
    "diasTolerancia" INTEGER NOT NULL DEFAULT 3,
    "creditoBoasVindas" DECIMAL(10,2) NOT NULL DEFAULT 23.10,
    "recargaMinima" DECIMAL(10,2) NOT NULL DEFAULT 20,

    CONSTRAINT "ConfigSistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentoCredito" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" "TipoCredito" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "descricao" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "usuarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentoCredito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recarga" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "forma" "FormaRecarga" NOT NULL,
    "status" "StatusRecarga" NOT NULL DEFAULT 'PENDENTE',
    "cobrancaId" TEXT NOT NULL,
    "link" TEXT,
    "pixCopiaCola" TEXT,
    "pixQrCode" TEXT,
    "vencimento" DATE NOT NULL,
    "pagaEm" TIMESTAMP(3),
    "usuarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recarga_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovimentoCredito_empresaId_criadoEm_idx" ON "MovimentoCredito"("empresaId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "MovimentoCredito_empresaId_referencia_key" ON "MovimentoCredito"("empresaId", "referencia");

-- CreateIndex
CREATE UNIQUE INDEX "Recarga_cobrancaId_key" ON "Recarga"("cobrancaId");

-- CreateIndex
CREATE INDEX "Recarga_empresaId_criadoEm_idx" ON "Recarga"("empresaId", "criadoEm");


-- Configuração inicial e a loja principal (do dono do sistema) não paga.
INSERT INTO "ConfigSistema" ("id") VALUES ('sistema') ON CONFLICT DO NOTHING;
UPDATE "Empresa" SET "isenta" = true WHERE "id" = 'loja_principal';
