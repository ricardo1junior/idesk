# iDesk

Sistema web de atendimento para loja de aparelhos Apple com assistência técnica: clientes PF/PJ, ordens de serviço, vendas, estoque (com IMEI/serial) e notas fiscais.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS · PostgreSQL · Prisma · Zod

## Como rodar

Requisitos: Node 20+ e um PostgreSQL.

```bash
cp .env.example .env        # ajuste DATABASE_URL
npm install
npm run db:migrate          # cria as tabelas
npm run dev                 # http://localhost:3000
```

No primeiro acesso, a tela de login pede para criar o usuário administrador. Os demais usuários são criados em **Usuários**.

Testes: `npm test` · Lint: `npm run lint`

## Situação

| Módulo | Situação |
|---|---|
| Clientes PF/PJ (CPF/CNPJ validados, busca de CEP, vários telefones, e-mails e endereços) | pronto |
| Ordens de serviço (ficha do aparelho, senha criptografada, checklist, acessórios, backup, orçamento, status, impressão) | pronto |
| Login e perfis (administrador, vendedor, técnico, financeiro) | pronto |
| Estoque: produtos, acessórios, peças e aparelhos por IMEI/série | pronto |
| Vendas: quantidade, desconto por item e geral (R$ ou %), vários pagamentos, troca de aparelho, recibo, cancelamento | pronto |
| Verificação de IMEI (Anatel roubo/furto, iCloud, blacklist GSMA, garantia Apple) com bloqueio da troca | pronto (precisa das chaves) |
| Entrada de NF-e (XML) | a fazer |
| Emissão de NF-e / NFC-e / NFS-e | a fazer |

## Verificação de IMEI

A Apple não tem API pública de garantia nem de bloqueio, então o sistema usa dois serviços pagos (configure as chaves no `.env`):

- **Infosimples** (`INFOSIMPLES_TOKEN`): consulta Anatel / Celular Legal (roubo, furto, aparelho irregular).
- **IMEI.org** (`IMEIORG_API_KEY`): iCloud / Buscar iPhone, blacklist GSMA, operadora e garantia Apple.

O botão **Verificar IMEI** aparece na troca (venda), na abertura e na tela da OS e nas unidades do estoque. Cada clique faz uma consulta cobrada e o resultado fica guardado com data. Com as chaves configuradas, a venda com troca só fecha se o IMEI do aparelho recebido tiver sido consultado nas últimas 24 horas sem restrição. Sem as chaves, o botão fica desativado e a troca funciona como antes.

A leitura das respostas é tolerante (`src/lib/verificacao/interpretar.ts`): o que não dá para interpretar aparece como "Conferir", com o texto original do serviço.
