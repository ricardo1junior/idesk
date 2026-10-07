import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { usuarioAtual } from "@/lib/auth";

// Assistente de IA da bolinha flutuante: tira dúvidas sobre o mundo Apple (lançamentos, preços,
// backup, transferência de dados, recursos) com o Claude, pesquisando na web quando precisa.

export const maxDuration = 120;

const SISTEMA = `Você é o assistente Apple do iDesk, um sistema usado por lojas e assistências técnicas de produtos Apple no Brasil.
Quem conversa com você são vendedores e técnicos da loja, às vezes mostrando a tela ao cliente.

Seu assunto é o mundo Apple: iPhone, iPad, Mac, Apple Watch, AirPods, acessórios, iOS e demais sistemas, iCloud,
história e eventos de lançamento, preços de lançamento (em dólar nos EUA e em reais no Brasil, quando houver),
especificações, comparações entre modelos, backup e transferência de dados, configuração, solução de problemas comuns,
garantia e AppleCare. Se perguntarem algo fora disso, diga educadamente que você só ajuda com assuntos Apple.

Como responder:
- Sempre em português do Brasil, direto e fácil de ler no balcão da loja.
- Comece pela resposta; depois, se for útil, um passo a passo curto em lista numerada.
- Para preços, datas, lançamentos recentes e qualquer coisa que possa ter mudado, pesquise na web antes de responder
  e diga a fonte em uma linha no final (nome do site). Diferencie preço de lançamento de preço atual.
- Se não tiver certeza, diga isso em vez de inventar números.
- Use **negrito** só para destacar o essencial. Nada de tabelas largas.`;

const Entrada = z.object({
  mensagens: z
    .array(z.object({ papel: z.enum(["usuario", "assistente"]), texto: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(30),
});

export async function POST(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return Response.json({ erro: "Sessão expirada. Entre de novo no sistema." }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ erro: "O assistente ainda não foi configurado. Coloque a chave ANTHROPIC_API_KEY no arquivo .env." }, { status: 503 });
  }

  const dados = Entrada.safeParse(await req.json().catch(() => null));
  if (!dados.success || dados.data.mensagens.at(-1)?.papel !== "usuario") {
    return Response.json({ erro: "Mensagem inválida." }, { status: 400 });
  }

  const client = new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = dados.data.mensagens.map((m) => ({
    role: m.papel === "usuario" ? "user" : "assistant",
    content: m.texto,
  }));

  const corpo = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enviar = (t: string) => controller.enqueue(new TextEncoder().encode(t));
      try {
        // A busca na web roda no servidor da Anthropic; se a rodada for pausada (pause_turn), retoma.
        for (let rodada = 0; rodada < 4; rodada++) {
          const stream = client.beta.messages.stream({
            model: "claude-opus-5-5",
            max_tokens: 8000,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            output_config: { effort: "low" },
            system: [{ type: "text", text: SISTEMA, cache_control: { type: "ephemeral" } }],
            tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4, user_location: { type: "approximate", country: "BR", timezone: "America/Sao_Paulo" } }],
            messages,
          });
          let jaEscreveu = false;
          for await (const evento of stream) {
            if (evento.type === "content_block_start" && evento.content_block.type === "server_tool_use") {
              // Sinal para a interface mostrar "pesquisando…" (o cliente remove essa marca do texto).
              enviar("\u0000busca\u0000");
            }
            if (evento.type === "content_block_delta" && evento.delta.type === "text_delta") {
              if (!jaEscreveu && rodada > 0) enviar("\n\n");
              jaEscreveu = true;
              enviar(evento.delta.text);
            }
          }
          const final = await stream.finalMessage();
          if (final.stop_reason === "refusal") {
            enviar("\n\nNão consigo ajudar com esse pedido.");
            break;
          }
          if (final.stop_reason !== "pause_turn") break;
          messages.push({ role: "assistant", content: final.content });
        }
      } catch (erro) {
        console.error("assistente:", erro);
        if (erro instanceof Anthropic.AuthenticationError) enviar("\n\nA chave da IA (ANTHROPIC_API_KEY) é inválida.");
        else if (erro instanceof Anthropic.RateLimitError) enviar("\n\nMuitas perguntas ao mesmo tempo. Tente de novo em alguns segundos.");
        else enviar("\n\nNão consegui responder agora. Tente de novo.");
      } finally {
        controller.close();
      }
    },
  });

  return new Response(corpo, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
