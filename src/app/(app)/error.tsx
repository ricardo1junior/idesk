"use client";

// Erro inesperado numa tela do sistema. O aviso de saldo (modo consulta) continua visível acima.
export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-xl space-y-3 rounded-lg border border-zinc-200 bg-cartao p-6">
      <h1 className="text-lg font-semibold">Não foi possível concluir esta ação</h1>
      <p className="text-sm text-zinc-600">
        Se os créditos do sistema acabaram, a loja fica em modo consulta: dá para ver tudo, mas não cadastrar nem alterar. Recarregue em Assinatura e tente de novo. Se não for isso, tente
        novamente em instantes.
      </p>
      <button onClick={reset} className="btn-primario">
        Tentar de novo
      </button>
    </div>
  );
}
