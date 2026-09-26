import { CHECKLIST, RESULTADOS_CHECKLIST, TIPOS_SENHA, type ResultadoChecklist } from "@/lib/os";
import type { OSCompleta } from "@/app/os/[id]/dados";

// Dados do aparelho registrados na entrada. Usado na tela da OS e na impressão.
export function FichaAparelho({ os, senha }: { os: OSCompleta; senha?: React.ReactNode }) {
  const a = os.aparelho;
  const checklist = (os.checklist ?? {}) as Record<string, ResultadoChecklist>;
  const icloud = os.icloudBloqueado == null ? "Não verificado" : os.icloudBloqueado ? "Ativo" : "Desativado";

  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        <Dado rotulo="Modelo" valor={[a?.modelo, a?.capacidade, a?.cor].filter(Boolean).join(" · ")} />
        <Dado rotulo="IMEI" valor={a?.imei} mono />
        <Dado rotulo="Nº de série" valor={a?.serial} mono />
        <Dado rotulo="Bateria" valor={a?.saudeBateria != null ? `${a.saudeBateria}%` : null} />
        <Dado rotulo="iCloud / Buscar" valor={icloud} />
        <Dado rotulo="Senha" valor={senha ?? TIPOS_SENHA[os.tipoSenha]} />
        <Dado rotulo="Backup" valor={os.precisaBackup ? `Sim${os.backupObs ? `: ${os.backupObs}` : ""}` : "Não"} />
        <Dado rotulo="Acessórios deixados" valor={os.acessorios.length ? os.acessorios.join(", ") : "Nenhum"} />
      </dl>
      <Dado rotulo="Marcas de uso" valor={os.marcasUso ?? "Nenhuma registrada"} />
      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Checklist de entrada</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
          {CHECKLIST.map((item) => {
            const r = checklist[item.id] ?? "NAO_TESTADO";
            const cor = r === "OK" ? "text-green-700" : r === "DEFEITO" ? "text-red-700" : "text-zinc-400";
            return (
              <div key={item.id} className="flex justify-between border-b border-zinc-100 py-0.5">
                <span>{item.label}</span>
                <span className={`font-medium ${cor}`}>{RESULTADOS_CHECKLIST[r]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Dado({ rotulo, valor, mono }: { rotulo: string; valor?: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{rotulo}</dt>
      <dd className={mono ? "font-mono" : ""}>{valor || "-"}</dd>
    </div>
  );
}
