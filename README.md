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
