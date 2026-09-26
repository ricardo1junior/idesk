"use client";

import { useEffect, useState, useTransition } from "react";
import { historicoImei, verificarImei, type RespostaVerificacao } from "@/app/(app)/verificacao/actions";

const CORES: Record<string, string> = {
  OK: "bg-green-100 text-green-800",
  ALERTA: "bg-amber-100 text-amber-800",
  RESTRICAO: "bg-red-100 text-red-800",
  ERRO: "bg-zinc-200 text-zinc-700",
};
const ROTULOS: Record<string, string> = { OK: "Sem restrição", ALERTA: "Conferir", RESTRICAO: "Restrição", ERRO: "Erro" };
const FONTES: Record<string, string> = { ANATEL: "Anatel (roubo/furto)", IMEI_ORG: "iCloud, blacklist e garantia" };

// Botão "Verificar IMEI" com o último resultado de cada serviço.
export function VerificarImei({ imei, aparelhoId }: { imei: string; aparelhoId?: string }) {
  const [dados, setDados] = useState<RespostaVerificacao>();
  const [pendente, iniciar] = useTransition();
  const valido = /^\d{15}$/.test(imei);

  useEffect(() => {
    if (!valido) return;
    let ativo = true;
    historicoImei(imei).then((r) => ativo && setDados(r));
    return () => {
      ativo = false;
    };
  }, [imei, valido]);

  if (!valido) return <p className="text-xs text-zinc-500">Informe o IMEI (15 dígitos) para verificar restrições.</p>;

  const itens = dados?.itens ?? [];
  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-secundario"
          disabled={pendente || dados?.configurado === false}
          onClick={() => {
            if (itens.length && !confirm("Este IMEI já foi consultado. Consultar de novo? Cada consulta é cobrada.")) return;
            iniciar(async () => setDados(await verificarImei(imei, aparelhoId)));
          }}
        >
          {pendente ? "Consultando..." : "Verificar IMEI"}
        </button>
        {dados?.configurado === false && (
          <span className="text-xs text-zinc-500">Consulta de IMEI não configurada: faltam as chaves dos serviços no .env.</span>
        )}
        {dados?.erro && <span className="text-xs text-red-600">{dados.erro}</span>}
      </div>
      {itens.map((v) => (
        <div key={v.fonte + v.criadoEm} className="rounded-md border border-zinc-200 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CORES[v.situacao]}`}>{ROTULOS[v.situacao]}</span>
            <span className="text-xs font-medium">{FONTES[v.fonte] ?? v.fonte}</span>
            <span className="text-xs text-zinc-500">{new Date(v.criadoEm).toLocaleString("pt-BR")}</span>
          </div>
          <p className="mt-1 text-xs text-zinc-700">{v.resumo}</p>
        </div>
      ))}
    </div>
  );
}
