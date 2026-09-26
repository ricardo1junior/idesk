-- AlterTable
ALTER TABLE "ItemVenda" ADD COLUMN     "desconto" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "descricao" TEXT NOT NULL,
ADD COLUMN     "garantiaDias" INTEGER;

-- AlterTable
ALTER TABLE "Pagamento" ADD COLUMN     "aparelhoTrocaId" TEXT;

-- AlterTable
ALTER TABLE "Venda" ADD COLUMN     "canceladaEm" TIMESTAMP(3),
ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Sessao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sessao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sessao_usuarioId_idx" ON "Sessao"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_aparelhoTrocaId_key" ON "Pagamento"("aparelhoTrocaId");

-- AddForeignKey
ALTER TABLE "Sessao" ADD CONSTRAINT "Sessao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_aparelhoTrocaId_fkey" FOREIGN KEY ("aparelhoTrocaId") REFERENCES "Aparelho"("id") ON DELETE SET NULL ON UPDATE CASCADE;

