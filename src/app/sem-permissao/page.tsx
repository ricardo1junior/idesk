import Link from "next/link";

export default function SemPermissao() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 className="text-xl font-semibold">Sem permissão</h1>
      <p className="text-zinc-600">Seu perfil não tem acesso a esta área. Fale com o administrador.</p>
      <Link href="/" className="btn-secundario">
        Voltar ao início
      </Link>
    </div>
  );
}
