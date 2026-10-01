-- Várias lojas no mesmo sistema. Os dados que já existem passam a ser da loja principal.
-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "razaoSocial" TEXT,
    "documento" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "site" TEXT,
    "corDestaque" TEXT,
    "logo" BYTEA,
    "logoTipo" TEXT,
    "logoVersao" INTEGER NOT NULL DEFAULT 0,
    "smtpHost" TEXT,
    "smtpPorta" INTEGER,
    "smtpSeguro" BOOLEAN NOT NULL DEFAULT false,
    "smtpUsuario" TEXT,
    "smtpSenha" TEXT,
    "emailRemetente" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "Contador" (
    "empresaId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Contador_pkey" PRIMARY KEY ("empresaId","chave")
);

INSERT INTO "Empresa" ("id", "nome", "razaoSocial", "documento", "atualizadoEm")
SELECT 'loja_principal',
       COALESCE((SELECT COALESCE("nomeFantasia", "razaoSocial") FROM "EmpresaFiscal" LIMIT 1), 'Minha loja'),
       (SELECT "razaoSocial" FROM "EmpresaFiscal" LIMIT 1),
       (SELECT "cnpj" FROM "EmpresaFiscal" LIMIT 1),
       CURRENT_TIMESTAMP;

-- A numeração continua de onde parou.
INSERT INTO "Contador" ("empresaId", "chave", "valor")
SELECT 'loja_principal', 'os', COALESCE(MAX("numero"), 0) FROM "OrdemServico"
UNION ALL SELECT 'loja_principal', 'venda', COALESCE(MAX("numero"), 0) FROM "Venda"
UNION ALL SELECT 'loja_principal', 'entrega', COALESCE(MAX("numero"), 0) FROM "Entrega";

-- DropIndex
DROP INDEX "Aparelho_imei_key";

-- DropIndex
DROP INDEX "Aparelho_serial_key";

-- DropIndex
DROP INDEX "CategoriaFinanceira_nome_tipo_key";

-- DropIndex
DROP INDEX "Cliente_documento_key";

-- DropIndex
DROP INDEX "Entrega_numero_key";

-- DropIndex
DROP INDEX "Fornecedor_cnpj_key";

-- DropIndex
DROP INDEX "NotaEntrada_chave_key";

-- DropIndex
DROP INDEX "OrdemServico_numero_key";

-- DropIndex
DROP INDEX "Produto_codigoBarras_key";

-- DropIndex
DROP INDEX "Produto_sku_key";

-- DropIndex
DROP INDEX "Venda_numero_key";

-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "Aparelho" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "CategoriaFinanceira" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "ClienteContato" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "ClienteEndereco" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "EmpresaFiscal" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal',
ADD COLUMN     "focusTokenHomologacao" TEXT,
ADD COLUMN     "focusTokenProducao" TEXT,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Entrega" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal',
ALTER COLUMN "numero" SET DEFAULT (current_setting('idesk.numero'::text))::integer,
ALTER COLUMN "numero" DROP DEFAULT;
DROP SEQUENCE "Entrega_numero_seq";

-- AlterTable
ALTER TABLE "Fornecedor" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "FotoOS" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "HistoricoOS" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "ItemOS" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "ItemVenda" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "Lancamento" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "LojaConfig" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal',
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MovimentoEstoque" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "NotaEntrada" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "NotaFiscal" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "OrdemServico" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal',
ALTER COLUMN "numero" SET DEFAULT (current_setting('idesk.numero'::text))::integer,
ALTER COLUMN "numero" DROP DEFAULT;
DROP SEQUENCE "OrdemServico_numero_seq";

-- AlterTable
ALTER TABLE "Pagamento" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "Servico" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal',
ADD COLUMN     "superAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Venda" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal',
ALTER COLUMN "numero" SET DEFAULT (current_setting('idesk.numero'::text))::integer,
ALTER COLUMN "numero" DROP DEFAULT;
DROP SEQUENCE "Venda_numero_seq";

-- AlterTable
ALTER TABLE "VerificacaoImei" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';

-- AlterTable
ALTER TABLE "VinculoProdutoFornecedor" ADD COLUMN     "empresaId" TEXT NOT NULL DEFAULT 'loja_principal';



-- CreateIndex
CREATE INDEX "Agendamento_empresaId_idx" ON "Agendamento"("empresaId");

-- CreateIndex
CREATE INDEX "Aparelho_empresaId_idx" ON "Aparelho"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Aparelho_empresaId_imei_key" ON "Aparelho"("empresaId", "imei");

-- CreateIndex
CREATE UNIQUE INDEX "Aparelho_empresaId_serial_key" ON "Aparelho"("empresaId", "serial");

-- CreateIndex
CREATE INDEX "CategoriaFinanceira_empresaId_idx" ON "CategoriaFinanceira"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaFinanceira_empresaId_nome_tipo_key" ON "CategoriaFinanceira"("empresaId", "nome", "tipo");

-- CreateIndex
CREATE INDEX "Cliente_empresaId_idx" ON "Cliente"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_empresaId_documento_key" ON "Cliente"("empresaId", "documento");

-- CreateIndex
CREATE INDEX "ClienteContato_empresaId_idx" ON "ClienteContato"("empresaId");

-- CreateIndex
CREATE INDEX "ClienteEndereco_empresaId_idx" ON "ClienteEndereco"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "EmpresaFiscal_empresaId_key" ON "EmpresaFiscal"("empresaId");

-- CreateIndex
CREATE INDEX "Entrega_empresaId_idx" ON "Entrega"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Entrega_empresaId_numero_key" ON "Entrega"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "Fornecedor_empresaId_idx" ON "Fornecedor"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Fornecedor_empresaId_cnpj_key" ON "Fornecedor"("empresaId", "cnpj");

-- CreateIndex
CREATE INDEX "FotoOS_empresaId_idx" ON "FotoOS"("empresaId");

-- CreateIndex
CREATE INDEX "HistoricoOS_empresaId_idx" ON "HistoricoOS"("empresaId");

-- CreateIndex
CREATE INDEX "ItemOS_empresaId_idx" ON "ItemOS"("empresaId");

-- CreateIndex
CREATE INDEX "ItemVenda_empresaId_idx" ON "ItemVenda"("empresaId");

-- CreateIndex
CREATE INDEX "Lancamento_empresaId_idx" ON "Lancamento"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "LojaConfig_empresaId_key" ON "LojaConfig"("empresaId");

-- CreateIndex
CREATE INDEX "MovimentoEstoque_empresaId_idx" ON "MovimentoEstoque"("empresaId");

-- CreateIndex
CREATE INDEX "NotaEntrada_empresaId_idx" ON "NotaEntrada"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "NotaEntrada_empresaId_chave_key" ON "NotaEntrada"("empresaId", "chave");

-- CreateIndex
CREATE INDEX "NotaFiscal_empresaId_idx" ON "NotaFiscal"("empresaId");

-- CreateIndex
CREATE INDEX "OrdemServico_empresaId_idx" ON "OrdemServico"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemServico_empresaId_numero_key" ON "OrdemServico"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "Pagamento_empresaId_idx" ON "Pagamento"("empresaId");

-- CreateIndex
CREATE INDEX "Produto_empresaId_idx" ON "Produto"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Produto_empresaId_codigoBarras_key" ON "Produto"("empresaId", "codigoBarras");

-- CreateIndex
CREATE UNIQUE INDEX "Produto_empresaId_sku_key" ON "Produto"("empresaId", "sku");

-- CreateIndex
CREATE INDEX "Servico_empresaId_idx" ON "Servico"("empresaId");

-- CreateIndex
CREATE INDEX "Usuario_empresaId_idx" ON "Usuario"("empresaId");

-- CreateIndex
CREATE INDEX "Venda_empresaId_idx" ON "Venda"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Venda_empresaId_numero_key" ON "Venda"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "VerificacaoImei_empresaId_idx" ON "VerificacaoImei"("empresaId");

-- CreateIndex
CREATE INDEX "VinculoProdutoFornecedor_empresaId_idx" ON "VinculoProdutoFornecedor"("empresaId");


-- O valor fixo serviu só para os dados existentes; daqui em diante o sistema sempre informa a loja.
ALTER TABLE "Agendamento" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "Aparelho" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "CategoriaFinanceira" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "Cliente" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "ClienteContato" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "ClienteEndereco" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "EmpresaFiscal" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "Entrega" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "Fornecedor" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "FotoOS" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "HistoricoOS" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "ItemOS" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "ItemVenda" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "Lancamento" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "LojaConfig" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "MovimentoEstoque" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "NotaEntrada" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "NotaFiscal" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "OrdemServico" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "Pagamento" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "Produto" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "Servico" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "Usuario" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "Venda" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "VerificacaoImei" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);
ALTER TABLE "VinculoProdutoFornecedor" ALTER COLUMN "empresaId" SET DEFAULT current_setting('idesk.empresa_id'::text);

-- Quem já administrava a loja vira dono do sistema.
UPDATE "Usuario" SET "superAdmin" = true WHERE "perfil" = 'ADMIN';
