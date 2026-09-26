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
| Clientes PF/PJ (CPF/CNPJ validados, busca de CEP) | pronto |
| Ordens de serviço (ficha do aparelho, senha criptografada, checklist, acessórios, backup, orçamento, status, impressão) | pronto |
| Login e perfis (administrador, vendedor, técnico, financeiro) | pronto |
| Estoque: produtos, acessórios, peças e aparelhos por IMEI/série | pronto |
| Vendas: quantidade, desconto por item e geral (R$ ou %), vários pagamentos, troca de aparelho, recibo, cancelamento | pronto |
| Entrada de NF-e (XML) | a fazer |
| Emissão de NF-e / NFC-e / NFS-e | a fazer |
