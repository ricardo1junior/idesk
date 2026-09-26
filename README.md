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

Testes: `npm test` · Lint: `npm run lint`

## Situação

| Módulo | Situação |
|---|---|
| Clientes PF/PJ (CPF/CNPJ validados, busca de CEP) | pronto |
| Modelo de dados de vendas e estoque | pronto (sem telas) |
| Ordens de serviço (ficha do aparelho, senha criptografada, checklist, acessórios, backup, orçamento, status, impressão) | pronto |
| Vendas / PDV | a fazer |
| Estoque | a fazer |
| Login e perfis | a fazer |
| Entrada de NF-e (XML) | a fazer |
| Emissão de NF-e / NFC-e / NFS-e | a fazer |
