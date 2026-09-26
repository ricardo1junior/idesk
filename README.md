# iDesk

Sistema web de atendimento para loja de aparelhos Apple com assistência técnica: clientes PF/PJ, ordens de serviço, vendas, estoque (com IMEI/serial) e notas fiscais.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS · PostgreSQL · Prisma · Zod

## Como rodar

Requisitos: Node 20+ e um PostgreSQL.

```bash
npm install
npm run configurar          # pede a conexão do banco (ex.: Neon), cria o .env e as tabelas
npm run dev                 # http://localhost:3000
```

Ou manualmente: copie `.env.example` para `.env`, ajuste `DATABASE_URL`/`DIRECT_URL` e rode `npm run db:migrate`.

No primeiro acesso, a tela de login pede para criar o usuário administrador (com `CODIGO_PRIMEIRO_ACESSO` definido, pede também esse código). Os demais usuários são criados em **Usuários**.

Testes: `npm test` · Lint: `npm run lint`

### Publicar na Vercel + Neon

1. Na [Neon](https://neon.tech), crie um projeto (região São Paulo, se disponível) e copie as duas conexões: a *pooled* e a direta.
2. Na [Vercel](https://vercel.com), importe este repositório e cadastre as variáveis:
   - `DATABASE_URL` (pooled) e `DIRECT_URL` (direta), da Neon;
   - `APP_SECRET` (gere com `openssl rand -base64 32` e guarde; sem ela as senhas de aparelhos já salvas não abrem);
   - `CODIGO_PRIMEIRO_ACESSO` (qualquer código só seu);
   - as opcionais de IMEI, Focus NFe e e-mail (veja `.env.example`).
3. Faça o deploy. O script `vercel-build` aplica as migrações do banco antes de gerar o site.
4. Abra o link, informe o código de primeiro acesso e crie o administrador.

## Situação

| Módulo | Situação |
|---|---|
| Clientes PF/PJ (CPF/CNPJ validados, busca de CEP, vários telefones, e-mails e endereços) | pronto |
| Ordens de serviço (ficha do aparelho, senha criptografada, checklist, acessórios, backup, orçamento, status, impressão) | pronto |
| Login e perfis (administrador, vendedor, técnico, financeiro, estagiário) com tabela de permissões em Usuários | pronto |
| Estoque: produtos, acessórios, peças e aparelhos por IMEI/série | pronto |
| Vendas: quantidade, desconto por item e geral (R$ ou %), vários pagamentos, troca de aparelho, recibo, cancelamento | pronto |
| Verificação de IMEI (Anatel roubo/furto, iCloud, blacklist GSMA, garantia Apple) com bloqueio da troca | pronto (precisa das chaves) |
| Financeiro: lançamentos de entrada e saída, parcelas, contas a pagar e receber, fluxo de caixa com filtros, exportação CSV | pronto |
| Entrada de NF-e por XML (vínculo de produtos por fornecedor, fator de conversão, IMEIs, custo médio, contas a pagar) | pronto |
| Emissão de NF-e e NFC-e a partir da venda (Focus NFe), cancelamento, DANFE | pronto (precisa da conta Focus NFe) |
| Emissão de NFS-e (serviços da OS) | a fazer (depende da prefeitura) |

## Verificação de IMEI

A Apple não tem API pública de garantia nem de bloqueio, então o sistema usa dois serviços pagos (configure as chaves no `.env`):

- **Infosimples** (`INFOSIMPLES_TOKEN`): consulta Anatel / Celular Legal (roubo, furto, aparelho irregular).
- **IMEI.org** (`IMEIORG_API_KEY`): iCloud / Buscar iPhone, blacklist GSMA, operadora e garantia Apple.

O botão **Verificar IMEI** aparece na troca (venda), na abertura e na tela da OS e nas unidades do estoque. Cada clique faz uma consulta cobrada e o resultado fica guardado com data. Com as chaves configuradas, a venda com troca só fecha se o IMEI do aparelho recebido tiver sido consultado nas últimas 24 horas sem restrição. Sem as chaves, o botão fica desativado e a troca funciona como antes.

A leitura das respostas é tolerante (`src/lib/verificacao/interpretar.ts`): o que não dá para interpretar aparece como "Conferir", com o texto original do serviço.

## Financeiro

Toda venda finalizada gera lançamentos de entrada (um por parcela: crédito a cada 30 dias, boleto e a prazo mensais, dinheiro/PIX/débito já pagos). Pagamentos da OS e lançamentos manuais (aluguel, salários etc.) entram pelo mesmo cadastro. O fluxo de caixa filtra por período, visão realizada (data do pagamento) ou prevista (vencimento), tipo, situação, categoria e forma de pagamento, agrupa por dia, categoria ou forma e exporta em CSV.

## Notas fiscais

**Entrada:** em *Notas fiscais › Importar XML de compra*, envie o XML da NF-e do fornecedor. Cada item pode ser ligado a um produto existente, virar um produto novo ou ser ignorado. O vínculo fica guardado por fornecedor, então a próxima nota já vem conferida. Aparelhos pedem um IMEI por unidade (o sistema lê os IMEIs do texto do item quando o fornecedor informa). A importação dá entrada no estoque com custo médio, cadastra o fornecedor e cria as contas a pagar a partir das duplicatas.

**Emissão:** usa a API da [Focus NFe](https://focusnfe.com.br). Para ligar:

1. Crie a conta na Focus NFe, cadastre a empresa, envie o certificado digital A1 e, para NFC-e, o CSC da SEFAZ.
2. Coloque os tokens no `.env` (`FOCUSNFE_TOKEN_HOMOLOGACAO` e `FOCUSNFE_TOKEN_PRODUCAO`, ou só `FOCUSNFE_TOKEN`).
3. Em *Notas fiscais › Dados fiscais da empresa*, preencha CNPJ, UF e regime. Os códigos já vêm para o Simples Nacional (CSOSN 102, CFOP 5102/6102, PIS/COFINS 07) e devem ser confirmados com o contador.
4. Emita em **homologação** (sem valor fiscal) até conferir tudo; depois troque o ambiente para produção.

Na tela da venda, o botão sugere NFC-e no balcão e NF-e para empresa com inscrição estadual ou cliente de outro estado. Os produtos precisam ter NCM cadastrado. Nota autorizada precisa ser cancelada antes de cancelar a venda.

## WhatsApp e e-mail

Clicar no telefone do cliente (lista de clientes, ficha do cliente, OS e venda) abre a conversa no WhatsApp Web no computador ou no aplicativo no celular.

Os botões **Enviar por e-mail** na OS e na venda mandam um resumo (situação, aparelho, orçamento, itens, garantia, pagamentos e link da nota fiscal) para um dos e-mails cadastrados do cliente. Configure o SMTP no `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_REMETENTE`). No Gmail, use uma senha de app. O envio da OS fica registrado no andamento.

## Fotos do aparelho na OS

Na abertura da OS e depois, na tela da OS, dá para tirar ou escolher fotos do aparelho (até 20), marcando o tipo do dano (riscado, amassado, quebrado/trincado, outro) e onde está. No celular o botão abre a câmera. As fotos são reduzidas no navegador (até 1600 px) antes do envio e ficam guardadas no banco. Elas não saem na impressão da OS; vão anexadas no e-mail da OS enviado ao cliente.

## Agenda e entregas

**Agenda** (menu Agenda): horários do dia conforme o funcionamento da loja (Configurações: abertura, fechamento, dias, duração de cada horário e quantos clientes são atendidos ao mesmo tempo). Um horário cheio não aceita outro cliente. Cada agendamento tem motivo, aparelho, WhatsApp com mensagem de confirmação e os estados confirmado, atendido, faltou e cancelado. Reparo ou orçamento atendido abre a OS do cliente com um clique.

**Entregas** (menu Entregas, ou "Agendar entrega" na venda e na OS): escolha o cliente e um dos endereços cadastrados (ou digite outro), clique em **Calcular ida e volta** e o sistema mostra a distância e o tempo fora da loja (ida + tempo no local + volta). O cálculo usa a OpenRouteService (`ORS_API_KEY`, gratuita) a partir do endereço da loja em Configurações e não considera trânsito em tempo real; o botão "Abrir rota" abre o Google Maps com o trânsito do momento. As entregas com horário aparecem também na agenda do dia.
