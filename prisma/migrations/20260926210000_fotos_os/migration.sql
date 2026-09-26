-- CreateEnum
CREATE TYPE "TipoFoto" AS ENUM ('GERAL', 'RISCO', 'AMASSADO', 'QUEBRADO', 'OUTRO');

-- CreateTable
CREATE TABLE "FotoOS" (
    "id" TEXT NOT NULL,
    "osId" TEXT,
    "tipo" "TipoFoto" NOT NULL DEFAULT 'GERAL',
    "legenda" TEXT,
    "mime" TEXT NOT NULL,
    "dados" BYTEA NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "usuarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoOS_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FotoOS_osId_idx" ON "FotoOS"("osId");

-- AddForeignKey
ALTER TABLE "FotoOS" ADD CONSTRAINT "FotoOS_osId_fkey" FOREIGN KEY ("osId") REFERENCES "OrdemServico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

