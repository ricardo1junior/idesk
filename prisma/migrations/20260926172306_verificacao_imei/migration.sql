-- CreateEnum
CREATE TYPE "FonteVerificacao" AS ENUM ('ANATEL', 'IMEI_ORG');

-- CreateEnum
CREATE TYPE "SituacaoVerificacao" AS ENUM ('OK', 'ALERTA', 'RESTRICAO', 'ERRO');

-- CreateTable
CREATE TABLE "VerificacaoImei" (
    "id" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "aparelhoId" TEXT,
    "fonte" "FonteVerificacao" NOT NULL,
    "situacao" "SituacaoVerificacao" NOT NULL,
    "resumo" TEXT NOT NULL,
    "detalhes" JSONB,
    "usuarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificacaoImei_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificacaoImei_imei_criadoEm_idx" ON "VerificacaoImei"("imei", "criadoEm");

-- AddForeignKey
ALTER TABLE "VerificacaoImei" ADD CONSTRAINT "VerificacaoImei_aparelhoId_fkey" FOREIGN KEY ("aparelhoId") REFERENCES "Aparelho"("id") ON DELETE SET NULL ON UPDATE CASCADE;
