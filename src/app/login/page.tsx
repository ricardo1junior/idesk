import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FormLogin, FormPrimeiroAcesso } from "./Formularios";

export default async function Login() {
  if (await usuarioAtual()) redirect("/");
  const primeiroAcesso = (await prisma.usuario.count()) === 0;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6">
        <h1 className="mb-6 text-2xl font-bold">iDesk</h1>
        {primeiroAcesso ? <FormPrimeiroAcesso /> : <FormLogin />}
      </div>
    </div>
  );
}
