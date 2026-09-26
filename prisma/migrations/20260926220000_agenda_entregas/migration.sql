-- CreateEnum
CREATE TYPE "MotivoAgendamento" AS ENUM ('REPARO', 'ORCAMENTO', 'COMPRA', 'RETIRADA', 'TROCA', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('AGENDADO', 'CONFIRMADO', 'ATENDIDO', 'FALTOU', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoEntrega" AS ENUM ('ENTREGA', 'COLETA');

-- CreateEnum
CREATE TYPE "StatusEntrega" AS ENUM ('PENDENTE', 'EM_ROTA', 'CONCLUIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "LojaConfig" (
    "id" TEXT NOT NULL DEFAULT 'loja',
    "endereco" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "abreAs" TEXT NOT NULL DEFAULT '09:00',
    "fechaAs" TEXT NOT NULL DEFAULT '18:00',
    "diasSemana" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "duracaoAtendimento" INTEGER NOT NULL DEFAULT 30,
    "atendimentosSimultaneos" INTEGER NOT NULL DEFAULT 1,
    "minutosNoLocalEntrega" INTEGER NOT NULL DEFAULT 10,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LojaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agendamento" (
    "id" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "clienteId" TEXT,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "motivo" "MotivoAgendamento" NOT NULL DEFAULT 'REPARO',
    "aparelho" TEXT,
    "observacoes" TEXT,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'AGENDADO',
    "usuarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrega" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "tipo" "TipoEntrega" NOT NULL DEFAULT 'ENTREGA',
    "status" "StatusEntrega" NOT NULL DEFAULT 'PENDENTE',
    "clienteId" TEXT NOT NULL,
    "vendaId" TEXT,
    "osId" TEXT,
    "endereco" TEXT NOT NULL,
    "agendadaPara" TIMESTAMP(3),
    "distanciaKm" DOUBLE PRECISION,
    "minutosIda" INTEGER,
    "minutosTotal" INTEGER,
    "taxa" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "responsavelId" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidaEm" TIMESTAMP(3),

    CONSTRAINT "Entrega_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Agendamento_inicio_idx" ON "Agendamento"("inicio");

-- CreateIndex
CREATE UNIQUE INDEX "Entrega_numero_key" ON "Entrega"("numero");

-- CreateIndex
CREATE INDEX "Entrega_agendadaPara_idx" ON "Entrega"("agendadaPara");

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_osId_fkey" FOREIGN KEY ("osId") REFERENCES "OrdemServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

