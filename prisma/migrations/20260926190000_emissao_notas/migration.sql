-- CreateEnum
CREATE TYPE "RegimeTributario" AS ENUM ('SIMPLES_NACIONAL', 'SIMPLES_EXCESSO', 'NORMAL', 'MEI');

-- CreateEnum
CREATE TYPE "AmbienteFiscal" AS ENUM ('HOMOLOGACAO', 'PRODUCAO');

-- CreateEnum
CREATE TYPE "ModeloNota" AS ENUM ('NFE', 'NFCE');

-- CreateEnum
CREATE TYPE "StatusNota" AS ENUM ('PROCESSANDO', 'AUTORIZADA', 'REJEITADA', 'CANCELADA', 'ERRO');

-- AlterTable
ALTER TABLE "MovimentoEstoque" ADD COLUMN     "notaEntradaId" TEXT;

-- CreateTable
CREATE TABLE "EmpresaFiscal" (
    "id" TEXT NOT NULL DEFAULT 'empresa',
    "cnpj" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "inscricaoEstadual" TEXT,
    "uf" CHAR(2) NOT NULL,
    "regime" "RegimeTributario" NOT NULL DEFAULT 'SIMPLES_NACIONAL',
    "ambiente" "AmbienteFiscal" NOT NULL DEFAULT 'HOMOLOGACAO',
    "icmsSituacao" TEXT NOT NULL DEFAULT '102',
    "icmsAliquota" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "pisCofinsCst" TEXT NOT NULL DEFAULT '07',
    "cfopDentroEstado" TEXT NOT NULL DEFAULT '5102',
    "cfopForaEstado" TEXT NOT NULL DEFAULT '6102',
    "origemPadrao" TEXT NOT NULL DEFAULT '0',
    "naturezaOperacao" TEXT NOT NULL DEFAULT 'Venda de mercadoria',
    "informacoesFisco" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmpresaFiscal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotaFiscal" (
    "id" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "modelo" "ModeloNota" NOT NULL,
    "ambiente" "AmbienteFiscal" NOT NULL,
    "status" "StatusNota" NOT NULL DEFAULT 'PROCESSANDO',
    "vendaId" TEXT NOT NULL,
    "numero" TEXT,
    "serie" TEXT,
    "chave" TEXT,
    "mensagem" TEXT,
    "caminhoDanfe" TEXT,
    "caminhoXml" TEXT,
    "usuarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "canceladaEm" TIMESTAMP(3),

    CONSTRAINT "NotaFiscal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotaFiscal_referencia_key" ON "NotaFiscal"("referencia");

-- CreateIndex
CREATE INDEX "NotaFiscal_vendaId_idx" ON "NotaFiscal"("vendaId");

-- AddForeignKey
ALTER TABLE "MovimentoEstoque" ADD CONSTRAINT "MovimentoEstoque_notaEntradaId_fkey" FOREIGN KEY ("notaEntradaId") REFERENCES "NotaEntrada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaFiscal" ADD CONSTRAINT "NotaFiscal_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

