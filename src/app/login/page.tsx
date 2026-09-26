import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FormLogin, FormPrimeiroAcesso } from "./Formularios";

export default async function Login() {
  if (await usuarioAtual()) redirect("/");
  const primeiroAcesso = (await prisma.usuario.count()) === 0;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg bg-cartao p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-zinc-900 text-lg font-semibold text-zinc-50">i</span>
          <h1 className="text-3xl font-semibold">iDesk</h1>
        </div>
        {primeiroAcesso ? <FormPrimeiroAcesso pedirCodigo={!!process.env.CODIGO_PRIMEIRO_ACESSO} /> : <FormLogin />}
      </div>
    </div>
  );
}
