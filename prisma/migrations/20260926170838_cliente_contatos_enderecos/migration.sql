-- CreateEnum
CREATE TYPE "TipoContato" AS ENUM ('TELEFONE', 'EMAIL');

-- CreateTable
CREATE TABLE "ClienteContato" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" "TipoContato" NOT NULL,
    "valor" TEXT NOT NULL,
    "rotulo" TEXT,
    "whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ClienteContato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClienteEndereco" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "rotulo" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" CHAR(2),
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ClienteEndereco_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClienteContato_clienteId_idx" ON "ClienteContato"("clienteId");

-- CreateIndex
CREATE INDEX "ClienteContato_valor_idx" ON "ClienteContato"("valor");

-- CreateIndex
CREATE INDEX "ClienteEndereco_clienteId_idx" ON "ClienteEndereco"("clienteId");

-- AddForeignKey
ALTER TABLE "ClienteContato" ADD CONSTRAINT "ClienteContato_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteEndereco" ADD CONSTRAINT "ClienteEndereco_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
