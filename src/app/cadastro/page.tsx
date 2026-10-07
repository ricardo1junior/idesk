import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { configSistema } from "@/lib/carteira";
import { prismaBase as prisma } from "@/lib/db";
import { cadastroAberto } from "@/lib/nova-loja";
import { FormCadastro } from "./Formulario";

export default async function Cadastro() {
  if (await usuarioAtual()) redirect("/");
  // Antes do primeiro administrador, a instalação é feita pela tela de login.
  if (!cadastroAberto() || (await prisma.usuario.count()) === 0) redirect("/login");
  const config = await configSistema();
  const diaria = Number(config.diariaPadrao);
  const diasTeste = diaria > 0 ? Math.floor(Number(config.creditoBoasVindas) / diaria) : 0;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg bg-cartao p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <div className="mb-2 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-zinc-900 text-lg font-semibold text-zinc-50">i</span>
          <h1 className="text-3xl font-semibold">iDesk</h1>
        </div>
        <p className="mb-6 text-sm text-zinc-600">
          Crie a conta da sua loja{diasTeste > 0 ? ` e use grátis por ${diasTeste} ${diasTeste === 1 ? "dia" : "dias"}` : ""}. Depois você cadastra a equipe em Usuários.
        </p>
        <FormCadastro pedirCodigo={!!process.env.CODIGO_CADASTRO?.trim()} />
        <p className="mt-6 text-center text-sm text-zinc-600">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-link hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
