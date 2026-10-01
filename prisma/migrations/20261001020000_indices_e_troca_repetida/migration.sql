-- DropIndex
DROP INDEX "Agendamento_inicio_idx";

-- DropIndex
DROP INDEX "Cliente_nome_idx";

-- DropIndex
DROP INDEX "Lancamento_pagoEm_idx";

-- DropIndex
DROP INDEX "Lancamento_tipo_status_idx";

-- DropIndex
DROP INDEX "Lancamento_vencimento_idx";

-- DropIndex
DROP INDEX "OrdemServico_status_idx";

-- DropIndex
DROP INDEX "Pagamento_aparelhoTrocaId_key";

-- CreateIndex
CREATE INDEX "Agendamento_empresaId_inicio_idx" ON "Agendamento"("empresaId", "inicio");

-- CreateIndex
CREATE INDEX "Aparelho_produtoId_situacao_idx" ON "Aparelho"("produtoId", "situacao");

-- CreateIndex
CREATE INDEX "Aparelho_clienteId_idx" ON "Aparelho"("clienteId");

-- CreateIndex
CREATE INDEX "Cliente_empresaId_nome_idx" ON "Cliente"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "Entrega_osId_idx" ON "Entrega"("osId");

-- CreateIndex
CREATE INDEX "Entrega_empresaId_status_idx" ON "Entrega"("empresaId", "status");

-- CreateIndex
CREATE INDEX "HistoricoOS_osId_criadoEm_idx" ON "HistoricoOS"("osId", "criadoEm");

-- CreateIndex
CREATE INDEX "ItemOS_osId_idx" ON "ItemOS"("osId");

-- CreateIndex
CREATE INDEX "ItemVenda_vendaId_idx" ON "ItemVenda"("vendaId");

-- CreateIndex
CREATE INDEX "Lancamento_vendaId_idx" ON "Lancamento"("vendaId");

-- CreateIndex
CREATE INDEX "Lancamento_empresaId_pagoEm_idx" ON "Lancamento"("empresaId", "pagoEm");

-- CreateIndex
CREATE INDEX "Lancamento_empresaId_status_vencimento_idx" ON "Lancamento"("empresaId", "status", "vencimento");

-- CreateIndex
CREATE INDEX "Lancamento_osId_idx" ON "Lancamento"("osId");

-- CreateIndex
CREATE INDEX "Lancamento_clienteId_idx" ON "Lancamento"("clienteId");

-- CreateIndex
CREATE INDEX "OrdemServico_clienteId_idx" ON "OrdemServico"("clienteId");

-- CreateIndex
CREATE INDEX "OrdemServico_empresaId_status_idx" ON "OrdemServico"("empresaId", "status");

-- CreateIndex
CREATE INDEX "Pagamento_vendaId_idx" ON "Pagamento"("vendaId");

-- CreateIndex
CREATE INDEX "Pagamento_aparelhoTrocaId_idx" ON "Pagamento"("aparelhoTrocaId");

-- CreateIndex
CREATE INDEX "Venda_empresaId_criadoEm_idx" ON "Venda"("empresaId", "criadoEm");

