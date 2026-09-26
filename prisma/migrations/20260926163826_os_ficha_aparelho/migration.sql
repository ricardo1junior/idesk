-- CreateEnum
CREATE TYPE "TipoSenha" AS ENUM ('NENHUMA', 'NUMERICA', 'ALFANUMERICA', 'PADRAO', 'NAO_INFORMADA');

-- AlterTable
ALTER TABLE "OrdemServico" ADD COLUMN     "acessorios" TEXT[],
ADD COLUMN     "backupObs" TEXT,
ADD COLUMN     "marcasUso" TEXT,
ADD COLUMN     "precisaBackup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tipoSenha" "TipoSenha" NOT NULL DEFAULT 'NENHUMA';
