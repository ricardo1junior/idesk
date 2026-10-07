// Dados fictícios para demonstração: clientes, estoque, ordens de serviço e vendas.
//   node --env-file=.env scripts/demo.mjs          cria os dados na loja (a primeira, ou --loja=<id>)
//   node --env-file=.env scripts/demo.mjs --apagar remove tudo o que foi criado por este script
// Tudo leva a marca [DEMO] (clientes, aparelhos, vendas, serviços) ou o SKU DEMO- (produtos).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MARCA = "[DEMO]";
const args = process.argv.slice(2);
const apagar = args.includes("--apagar");
const lojaArg = args.find((a) => a.startsWith("--loja="))?.slice(7);

const empresa = lojaArg ? await prisma.empresa.findUnique({ where: { id: lojaArg } }) : await prisma.empresa.findFirst({ orderBy: { criadoEm: "asc" } });
if (!empresa) throw new Error("Nenhuma loja encontrada.");
const E = empresa.id;
console.log(`Loja: ${empresa.nome}`);

// ---------- Apagar ----------
if (apagar) {
  const clientes = (await prisma.cliente.findMany({ where: { empresaId: E, observacoes: { startsWith: MARCA } }, select: { id: true } })).map((c) => c.id);
  const produtos = (await prisma.produto.findMany({ where: { empresaId: E, sku: { startsWith: "DEMO-" } }, select: { id: true } })).map((p) => p.id);
  const vendas = (await prisma.venda.findMany({ where: { empresaId: E, observacoes: { startsWith: MARCA } }, select: { id: true } })).map((v) => v.id);
  const os = (await prisma.ordemServico.findMany({ where: { empresaId: E, clienteId: { in: clientes } }, select: { id: true } })).map((o) => o.id);
  const fornecedores = (await prisma.fornecedor.findMany({ where: { empresaId: E, razaoSocial: { endsWith: MARCA } }, select: { id: true } })).map((f) => f.id);
  await prisma.$transaction([
    prisma.lancamento.deleteMany({ where: { empresaId: E, OR: [{ vendaId: { in: vendas } }, { osId: { in: os } }, { observacoes: { startsWith: MARCA } }, { fornecedorId: { in: fornecedores } }] } }),
    prisma.fornecedor.deleteMany({ where: { id: { in: fornecedores } } }),
    prisma.venda.deleteMany({ where: { id: { in: vendas } } }), // itens e pagamentos vão junto
    prisma.ordemServico.deleteMany({ where: { id: { in: os } } }), // itens e histórico vão junto
    prisma.movimentoEstoque.deleteMany({ where: { produtoId: { in: produtos } } }),
    prisma.aparelho.deleteMany({ where: { empresaId: E, OR: [{ observacoes: { contains: MARCA } }, { produtoId: { in: produtos } }, { clienteId: { in: clientes } }] } }),
    prisma.produto.deleteMany({ where: { id: { in: produtos } } }),
    prisma.servico.deleteMany({ where: { empresaId: E, descricao: { endsWith: MARCA } } }),
    prisma.cliente.deleteMany({ where: { id: { in: clientes } } }),
  ]);
  console.log(`Removidos: ${clientes.length} clientes, ${produtos.length} produtos, ${os.length} OS e ${vendas.length} vendas de demonstração.`);
  await prisma.$disconnect();
  process.exit(0);
}

async function categoriaPagar(nome) {
  await prisma.categoriaFinanceira.createMany({ data: [{ empresaId: E, nome, tipo: "SAIDA" }], skipDuplicates: true });
  return (await prisma.categoriaFinanceira.findFirst({ where: { empresaId: E, nome, tipo: "SAIDA" } })).id;
}

// ---------- Contas a pagar (fornecedores e despesas) ----------
if (!(await prisma.fornecedor.count({ where: { empresaId: E, razaoSocial: { endsWith: MARCA } } }))) {
  const catCompra = await categoriaPagar("Compra de mercadoria");
  const forn = [];
  for (const [cnpj, razao, fantasia] of [
    ["04252011000110", "Distribuidora Maçã Mobile Ltda", "Maçã Mobile"],
    ["18727053000174", "Peças Premium Assistência Ltda", "Peças Premium"],
    ["33041260065290", "Acessórios Brasil Importação Ltda", "Acessórios Brasil"],
  ]) {
    forn.push(await prisma.fornecedor.create({ data: { empresaId: E, cnpj, razaoSocial: `${razao} ${MARCA}`, nomeFantasia: fantasia, cidade: "São Paulo", uf: "SP" } }));
  }
  const hoje = new Date();
  const dia = (d) => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + d, 12);
  const contas = [
    // [descrição, valor, dias até vencer, fornecedor, categoria, parcela, total, pago]
    ["NF 4521 dup. 1", 6890.5, -20, 0, catCompra, 1, 3, true],
    ["NF 4521 dup. 2", 6890.5, -3, 0, catCompra, 2, 3, false],
    ["NF 4521 dup. 3", 6890.5, 27, 0, catCompra, 3, 3, false],
    ["NF 887 peças de reposição", 2140, 0, 1, catCompra, null, null, false],
    ["NF 1203 capas e películas", 1385.9, 5, 2, catCompra, null, null, false],
    ["Aluguel da loja", 4500, 8, null, await categoriaPagar("Aluguel"), null, null, false],
    ["Energia elétrica", 612.37, 2, null, await categoriaPagar("Energia, água e internet"), null, null, false],
    ["Internet fibra", 199.9, 12, null, await categoriaPagar("Energia, água e internet"), null, null, false],
    ["DAS Simples Nacional", 1874.22, 15, null, await categoriaPagar("Impostos"), null, null, false],
    ["Salários da equipe", 7800, 20, null, await categoriaPagar("Salários"), null, null, false],
  ];
  await prisma.lancamento.createMany({
    data: contas.map(([descricao, valor, d, f, categoriaId, parcela, totalParcelas, pago]) => ({
      empresaId: E,
      tipo: "SAIDA",
      status: pago ? "PAGO" : "PENDENTE",
      descricao,
      valor,
      vencimento: dia(d),
      pagoEm: pago ? dia(d) : null,
      forma: pago ? "BOLETO" : null,
      parcela,
      totalParcelas,
      categoriaId,
      fornecedorId: f == null ? null : forn[f].id,
      observacoes: `${MARCA} Conta fictícia`,
    })),
  });
  console.log(`Criadas ${contas.length} contas a pagar de demonstração (${forn.length} fornecedores).`);
}

if (await prisma.cliente.count({ where: { empresaId: E, observacoes: { startsWith: MARCA } } })) {
  console.log("Os demais dados de demonstração já existem. Para recriar, rode antes com --apagar.");
  await prisma.$disconnect();
  process.exit(0);
}

// ---------- Ajudantes ----------
let semente = 7;
const aleatorio = () => ((semente = (semente * 16807) % 2147483647) / 2147483647);
const escolher = (lista) => lista[Math.floor(aleatorio() * lista.length)];
const diasAtras = (d, hora = 10 + Math.floor(aleatorio() * 8)) => {
  const x = new Date();
  x.setDate(x.getDate() - d);
  x.setHours(hora, Math.floor(aleatorio() * 60), 0, 0);
  return x;
};

function cpf() {
  const n = Array.from({ length: 9 }, () => Math.floor(aleatorio() * 10));
  for (const t of [10, 11]) {
    const s = n.reduce((acc, d, i) => acc + d * (t - i), 0);
    n.push(((s * 10) % 11) % 10);
  }
  return n.join("");
}
function imei() {
  const n = [3, 5, ...Array.from({ length: 12 }, () => Math.floor(aleatorio() * 10))];
  const soma = n.reduce((acc, d, i) => acc + (i % 2 ? [0, 2, 4, 6, 8, 1, 3, 5, 7, 9][d] : d), 0);
  return n.join("") + ((10 - (soma % 10)) % 10);
}
const serial = () => Array.from({ length: 10 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"[Math.floor(aleatorio() * 34)]).join("");

async function numero(chave) {
  const [l] = await prisma.$queryRaw`
    INSERT INTO "Contador" ("empresaId", "chave", "valor") VALUES (${E}, ${chave}, 1)
    ON CONFLICT ("empresaId", "chave") DO UPDATE SET "valor" = "Contador"."valor" + 1 RETURNING "valor"`;
  return l.valor;
}
async function categoria(tipo, nome) {
  await prisma.categoriaFinanceira.createMany({ data: [{ empresaId: E, nome, tipo }], skipDuplicates: true });
  return (await prisma.categoriaFinanceira.findFirst({ where: { empresaId: E, nome, tipo } })).id;
}

const vendedor = await prisma.usuario.findFirst({ where: { empresaId: E }, orderBy: { criadoEm: "asc" } });

// ---------- Clientes ----------
const pessoas = [
  ["Ana Beatriz Souza", "São Paulo", "SP", "Moema"],
  ["Bruno Carvalho Lima", "São Paulo", "SP", "Pinheiros"],
  ["Camila Rodrigues", "Campinas", "SP", "Cambuí"],
  ["Diego Fernandes", "Santo André", "SP", "Centro"],
  ["Eduarda Martins", "São Paulo", "SP", "Vila Mariana"],
  ["Felipe Andrade Costa", "Osasco", "SP", "Centro"],
  ["Gabriela Nunes", "São Paulo", "SP", "Tatuapé"],
  ["Henrique Alves", "Guarulhos", "SP", "Vila Galvão"],
  ["Isabela Ribeiro", "São Paulo", "SP", "Perdizes"],
  ["João Pedro Mendes", "São Bernardo do Campo", "SP", "Rudge Ramos"],
  ["Larissa Gomes", "São Paulo", "SP", "Santana"],
  ["Marcelo Teixeira", "Barueri", "SP", "Alphaville"],
];
const ruas = ["Rua das Flores", "Av. Paulista", "Rua Augusta", "Rua Oscar Freire", "Av. Brasil", "Rua Bela Cintra", "Rua Haddock Lobo", "Av. Rebouças"];
const clientes = [];
for (const [i, [nome, cidade, uf, bairro]] of pessoas.entries()) {
  const fone = `119${String(80000000 + Math.floor(aleatorio() * 19999999)).slice(0, 8)}`;
  clientes.push(
    await prisma.cliente.create({
      data: {
        empresaId: E,
        tipo: "PF",
        nome,
        documento: cpf(),
        email: `${nome.split(" ")[0].toLowerCase()}.${nome.split(" ").at(-1).toLowerCase()}@exemplo.com.br`,
        telefone: fone,
        whatsapp: fone,
        cep: `0${1000 + Math.floor(aleatorio() * 8999)}000`,
        logradouro: escolher(ruas),
        numero: String(10 + Math.floor(aleatorio() * 1900)),
        bairro,
        cidade,
        uf,
        observacoes: `${MARCA} Cliente fictício para demonstração`,
        criadoEm: diasAtras(60 - i * 4),
      },
    }),
  );
}
clientes.push(
  await prisma.cliente.create({
    data: {
      empresaId: E,
      tipo: "PJ",
      nome: "Agência Pixel Criativo Ltda",
      nomeFantasia: "Pixel Criativo",
      documento: "11222333000181",
      inscricaoEstadual: "ISENTO",
      email: "compras@pixelcriativo.exemplo.com.br",
      telefone: "1133224455",
      cidade: "São Paulo",
      uf: "SP",
      bairro: "Vila Olímpia",
      observacoes: `${MARCA} Empresa fictícia para demonstração`,
      criadoEm: diasAtras(45),
    },
  }),
);

// ---------- Produtos e estoque ----------
const novos = [
  ["iPhone 16 Pro Max", "256 GB", 8999, 10499, ["Titânio-deserto", "Titânio preto"]],
  ["iPhone 16 Pro", "128 GB", 7299, 8499, ["Titânio natural", "Titânio branco"]],
  ["iPhone 16", "128 GB", 5199, 6299, ["Ultramarino", "Preto", "Rosa"]],
  ["iPhone 15", "128 GB", 4299, 5199, ["Azul", "Preto", "Rosa"]],
  ["iPhone 13", "128 GB", 3199, 3999, ["Meia-noite", "Estelar"]],
];
const seminovos = [
  ["iPhone 14 Pro", "128 GB", 3900, 4799, ["Roxo-profundo", "Preto-espacial"]],
  ["iPhone 13", "128 GB", 2300, 2899, ["Azul", "Meia-noite"]],
  ["iPhone 12", "64 GB", 1500, 1999, ["Branco", "Preto"]],
  ["iPhone 11", "64 GB", 1100, 1499, ["Roxo", "Preto"]],
];
const produtos = {};
const unidades = [];
let sku = 1;
async function produtoAparelho(modelo, cap, custo, preco, cores, condicao) {
  const semi = condicao !== "NOVO";
  const p = await prisma.produto.create({
    data: {
      empresaId: E,
      tipo: "APARELHO",
      descricao: `${modelo} ${cap}${semi ? " seminovo" : ""}`,
      modelo,
      sku: `DEMO-${String(sku++).padStart(3, "0")}`,
      ncm: "85171300",
      precoCusto: custo,
      precoVenda: preco,
      criadoEm: diasAtras(50),
    },
  });
  produtos[p.descricao] = p;
  const qtd = semi ? 2 : 3 + Math.floor(aleatorio() * 3);
  for (let i = 0; i < qtd; i++) {
    const a = await prisma.aparelho.create({
      data: {
        empresaId: E,
        produtoId: p.id,
        modelo: `${modelo} ${cap}`,
        capacidade: cap,
        cor: cores[i % cores.length],
        imei: imei(),
        serial: serial(),
        condicao: semi ? escolher(["SEMINOVO_A", "SEMINOVO_A", "SEMINOVO_B"]) : "NOVO",
        situacao: "EM_ESTOQUE",
        saudeBateria: semi ? 82 + Math.floor(aleatorio() * 15) : 100,
        custo,
        observacoes: `${MARCA} ${semi ? "Seminovo revisado" : "Lacrado"}`,
        criadoEm: diasAtras(40 - i),
      },
    });
    unidades.push({ ...a, produto: p });
  }
  await prisma.movimentoEstoque.create({
    data: { empresaId: E, produtoId: p.id, tipo: semi ? "AJUSTE" : "ENTRADA_NOTA", quantidade: qtd, custoUnit: custo, referencia: semi ? "Estoque inicial (demonstração)" : "NF 4521 (demonstração)", criadoEm: diasAtras(40) },
  });
}
for (const [m, c, custo, preco, cores] of novos) await produtoAparelho(m, c, custo, preco, cores, "NOVO");
for (const [m, c, custo, preco, cores] of seminovos) await produtoAparelho(m, c, custo, preco, cores, "SEMINOVO_A");

const itensSimples = [
  ["ACESSORIO", "Capa de silicone MagSafe iPhone 16", 120, 349, 14],
  ["ACESSORIO", "Capa transparente MagSafe iPhone 15", 95, 299, 10],
  ["ACESSORIO", "Película de vidro 3D iPhone 16 Pro", 8, 79, 40],
  ["ACESSORIO", "Película de vidro iPhone 13/14", 6, 59, 35],
  ["ACESSORIO", "Carregador USB-C 20W Apple", 85, 219, 18],
  ["ACESSORIO", "Cabo USB-C para Lightning 1 m", 45, 149, 22],
  ["ACESSORIO", "Cabo USB-C trançado 1 m", 55, 169, 3],
  ["ACESSORIO", "AirPods Pro (2ª geração) USB-C", 1350, 1899, 5],
  ["ACESSORIO", "Carregador MagSafe", 190, 399, 6],
  ["PECA", "Tela OLED iPhone 11 (compatível)", 180, 0, 6],
  ["PECA", "Tela OLED iPhone 13", 520, 0, 4],
  ["PECA", "Bateria iPhone 12", 95, 0, 8],
  ["PECA", "Bateria iPhone 13", 110, 0, 2],
  ["PECA", "Conector de carga Lightning iPhone 12", 45, 0, 5],
  ["PECA", "Vidro traseiro iPhone 14", 70, 0, 3],
];
for (const [tipo, descricao, custo, preco, estoque] of itensSimples) {
  const p = await prisma.produto.create({
    data: {
      empresaId: E,
      tipo,
      descricao,
      sku: `DEMO-${String(sku++).padStart(3, "0")}`,
      ncm: tipo === "PECA" ? "85177999" : "85444200",
      precoCusto: custo,
      precoVenda: preco,
      estoque,
      estoqueMinimo: 4,
      criadoEm: diasAtras(50),
    },
  });
  produtos[descricao] = p;
  await prisma.movimentoEstoque.create({
    data: { empresaId: E, produtoId: p.id, tipo: "ENTRADA_NOTA", quantidade: estoque, custoUnit: custo, referencia: "NF 4521 (demonstração)", criadoEm: diasAtras(40) },
  });
}

// ---------- Serviços ----------
const servicos = {};
for (const [descricao, valor] of [
  ["Troca de tela", 590],
  ["Troca de bateria", 289],
  ["Troca de conector de carga", 249],
  ["Troca de vidro traseiro", 450],
  ["Diagnóstico completo", 0],
  ["Limpeza interna e oxidação", 199],
]) {
  servicos[descricao] = await prisma.servico.create({ data: { empresaId: E, descricao: `${descricao} ${MARCA}`, valor } });
}

// ---------- Ordens de serviço ----------
const catOS = await categoria("ENTRADA", "Serviços (OS)");
const ordens = [
  { cli: 0, modelo: "iPhone 11 64 GB", cor: "Roxo", defeito: "Tela quebrada após queda, touch falhando no canto", status: "ENTREGUE", dias: 21, pecas: ["Tela OLED iPhone 11 (compatível)"], serv: ["Troca de tela"], diag: "Display trincado e touch com falha. Substituída a tela." },
  { cli: 3, modelo: "iPhone 12 128 GB", cor: "Azul", defeito: "Bateria descarregando rápido, saúde em 71%", status: "ENTREGUE", dias: 16, pecas: ["Bateria iPhone 12"], serv: ["Troca de bateria"], diag: "Bateria degradada (71%). Trocada." },
  { cli: 6, modelo: "iPhone 12 64 GB", cor: "Preto", defeito: "Não carrega, só funciona em ângulo", status: "CONCLUIDA", dias: 5, pecas: ["Conector de carga Lightning iPhone 12"], serv: ["Troca de conector de carga"], diag: "Conector com oxidação. Trocado." },
  { cli: 8, modelo: "iPhone 13 128 GB", cor: "Rosa", defeito: "Tela com listras verdes", status: "EM_EXECUCAO", dias: 3, pecas: ["Tela OLED iPhone 13"], serv: ["Troca de tela"], diag: "Falha no painel OLED." },
  { cli: 10, modelo: "iPhone 14 128 GB", cor: "Azul", defeito: "Vidro traseiro trincado", status: "APROVADA", dias: 2, pecas: ["Vidro traseiro iPhone 14"], serv: ["Troca de vidro traseiro"], diag: "Vidro traseiro trincado, câmera intacta." },
  { cli: 1, modelo: "iPhone 13 Pro 256 GB", cor: "Azul-sierra", defeito: "Caiu na piscina, não liga", status: "ORCAMENTO_ENVIADO", dias: 2, pecas: [], serv: ["Limpeza interna e oxidação", "Diagnóstico completo"], diag: "Oxidação na placa. Orçamento enviado ao cliente." },
  { cli: 11, modelo: "iPhone 15 Pro 256 GB", cor: "Titânio natural", defeito: "Face ID parou de funcionar", status: "EM_ANALISE", dias: 1, pecas: [], serv: ["Diagnóstico completo"], diag: null },
  { cli: 5, modelo: "iPhone 11 128 GB", cor: "Branco", defeito: "Bateria estufada", status: "ABERTA", dias: 0, pecas: [], serv: [], diag: null },
];
const ORDEM_STATUS = ["ABERTA", "EM_ANALISE", "ORCAMENTO_ENVIADO", "APROVADA", "EM_EXECUCAO", "CONCLUIDA", "ENTREGUE"];
for (const o of ordens) {
  const cliente = clientes[o.cli];
  const criadoEm = diasAtras(o.dias, 9 + Math.floor(aleatorio() * 3));
  const aparelho = await prisma.aparelho.create({
    data: { empresaId: E, clienteId: cliente.id, modelo: o.modelo, cor: o.cor, imei: imei(), serial: serial(), condicao: "SEMINOVO_B", situacao: "DO_CLIENTE", observacoes: `${MARCA} Aparelho do cliente`, criadoEm },
  });
  const itens = [
    ...o.serv.map((s) => ({ servicoId: servicos[s].id, descricao: s, valorUnit: Number(servicos[s].valor) })),
    ...o.pecas.map((p) => ({ produtoId: produtos[p].id, descricao: p, valorUnit: Math.round(Number(produtos[p].precoCusto) * 0.4) })),
  ];
  const total = itens.reduce((s, i) => s + i.valorUnit, 0);
  const entregueEm = o.status === "ENTREGUE" ? diasAtras(o.dias - 2, 17) : null;
  const os = await prisma.ordemServico.create({
    data: {
      empresaId: E,
      numero: await numero("os"),
      clienteId: cliente.id,
      aparelhoId: aparelho.id,
      tecnicoId: vendedor?.id,
      status: o.status,
      defeitoRelatado: o.defeito,
      diagnostico: o.diag,
      icloudBloqueado: false,
      tipoSenha: "NUMERICA",
      marcasUso: escolher(["Riscos leves na lateral", "Sem marcas aparentes", "Pequeno amassado no canto inferior"]),
      acessorios: escolher([["Capa"], [], ["Capa", "Carregador"]]),
      previsaoEntrega: diasAtras(o.dias - 3, 18),
      total,
      criadoEm,
      entregueEm,
    },
  });
  if (itens.length) await prisma.itemOS.createMany({ data: itens.map((i) => ({ ...i, empresaId: E, osId: os.id })) });
  const passos = ORDEM_STATUS.slice(0, ORDEM_STATUS.indexOf(o.status) + 1);
  await prisma.historicoOS.createMany({
    data: passos.map((s, k) => ({ empresaId: E, osId: os.id, status: s, criadoEm: new Date(criadoEm.getTime() + k * 6 * 3600_000) })),
  });
  for (const p of o.pecas) {
    if (["APROVADA", "EM_EXECUCAO", "CONCLUIDA", "ENTREGUE"].includes(o.status)) {
      await prisma.produto.update({ where: { id: produtos[p].id }, data: { estoque: { decrement: 1 } } });
      await prisma.movimentoEstoque.create({ data: { empresaId: E, produtoId: produtos[p].id, tipo: "USO_OS", quantidade: -1, referencia: `OS ${os.numero}`, criadoEm } });
    }
  }
  if (o.status === "ENTREGUE" && total > 0) {
    await prisma.lancamento.create({
      data: { empresaId: E, tipo: "ENTRADA", status: "PAGO", descricao: `OS #${os.numero}`, valor: total, vencimento: entregueEm, pagoEm: entregueEm, forma: escolher(["PIX", "DEBITO", "CREDITO"]), parcela: 1, totalParcelas: 1, categoriaId: catOS, clienteId: cliente.id, osId: os.id, usuarioId: vendedor?.id, criadoEm: entregueEm },
    });
  }
}

// ---------- Vendas ----------
const catVendas = await categoria("ENTRADA", "Vendas");
const GARANTIA = { NOVO: 365, SEMINOVO_A: 90, SEMINOVO_B: 90, SEMINOVO_C: 90 };
const disponiveis = (descricao) => unidades.filter((u) => u.produto.descricao === descricao && !u.vendido);
const vendas = [
  { cli: 2, dias: 28, aparelhos: ["iPhone 16 Pro 128 GB"], acess: [["Película de vidro 3D iPhone 16 Pro", 1], ["Capa de silicone MagSafe iPhone 16", 1]], pag: [["PIX", 1]] },
  { cli: 4, dias: 24, aparelhos: ["iPhone 15 128 GB"], acess: [["Capa transparente MagSafe iPhone 15", 1]], pag: [["CREDITO", 10]], troca: { modelo: "iPhone 11", cap: "64 GB", cor: "Preto", valor: 1000, condicao: "SEMINOVO_B", bateria: 79 } },
  { cli: 7, dias: 20, aparelhos: [], acess: [["Carregador USB-C 20W Apple", 1], ["Cabo USB-C para Lightning 1 m", 2]], pag: [["DEBITO", 1]] },
  { cli: 12, dias: 18, aparelhos: ["iPhone 16 128 GB", "iPhone 16 128 GB"], acess: [["Película de vidro 3D iPhone 16 Pro", 2]], pag: [["BOLETO", 1], ["PIX", 1]], desconto: 300 },
  { cli: 9, dias: 14, aparelhos: ["iPhone 13 128 GB seminovo"], acess: [["Película de vidro iPhone 13/14", 1]], pag: [["PIX", 1]] },
  { cli: 0, dias: 11, aparelhos: [], acess: [["AirPods Pro (2ª geração) USB-C", 1]], pag: [["CREDITO", 3]] },
  { cli: 1, dias: 8, aparelhos: ["iPhone 16 Pro Max 256 GB"], acess: [["Carregador MagSafe", 1]], pag: [["CREDITO", 12]], troca: { modelo: "iPhone 13 Pro", cap: "256 GB", cor: "Azul-sierra", valor: 2600, condicao: "SEMINOVO_A", bateria: 86 } },
  { cli: 10, dias: 6, aparelhos: ["iPhone 12 64 GB seminovo"], acess: [], pag: [["DINHEIRO", 1]] },
  { cli: 3, dias: 3, aparelhos: [], acess: [["Película de vidro iPhone 13/14", 1], ["Capa transparente MagSafe iPhone 15", 1]], pag: [["PIX", 1]] },
  { cli: 5, dias: 1, aparelhos: ["iPhone 13 128 GB"], acess: [["Carregador USB-C 20W Apple", 1]], pag: [["PIX", 1], ["CREDITO", 6]] },
  { cli: 11, dias: 0, aparelhos: ["iPhone 14 Pro 128 GB seminovo"], acess: [["Capa de silicone MagSafe iPhone 16", 1]], pag: [["TRANSFERENCIA", 1]] },
];
for (const v of vendas) {
  const cliente = clientes[v.cli];
  const criadoEm = diasAtras(v.dias);
  const itens = [];
  for (const d of v.aparelhos) {
    const u = disponiveis(d)[0];
    if (!u) continue;
    u.vendido = true;
    itens.push({ produtoId: u.produtoId, aparelhoId: u.id, descricao: `${u.modelo} ${u.cor}`, quantidade: 1, valorUnit: Number(u.produto.precoVenda), desconto: 0, garantiaDias: GARANTIA[u.condicao], condicao: u.condicao });
  }
  for (const [d, q] of v.acess) itens.push({ produtoId: produtos[d].id, descricao: d, quantidade: q, valorUnit: Number(produtos[d].precoVenda), desconto: 0, garantiaDias: 90 });
  const subtotal = itens.reduce((s, i) => s + i.valorUnit * i.quantidade - i.desconto, 0);
  const desconto = v.desconto ?? 0;
  const total = subtotal - desconto;
  const venda = await prisma.venda.create({
    data: { empresaId: E, numero: await numero("venda"), clienteId: cliente.id, vendedorId: vendedor?.id, status: "FINALIZADA", subtotal, desconto, total, observacoes: `${MARCA} Venda fictícia`, criadoEm },
  });
  await prisma.itemVenda.createMany({ data: itens.map(({ condicao, ...i }) => ({ ...i, empresaId: E, vendaId: venda.id })) });
  for (const i of itens) {
    if (i.aparelhoId) {
      await prisma.aparelho.update({ where: { id: i.aparelhoId }, data: { situacao: "VENDIDO", clienteId: cliente.id, garantiaAte: new Date(criadoEm.getTime() + i.garantiaDias * 86_400_000) } });
    } else {
      await prisma.produto.update({ where: { id: i.produtoId }, data: { estoque: { decrement: i.quantidade } } });
    }
    await prisma.movimentoEstoque.create({ data: { empresaId: E, produtoId: i.produtoId, tipo: "VENDA", quantidade: -i.quantidade, referencia: `Venda ${venda.numero}`, criadoEm } });
  }

  // Pagamentos: a troca abate primeiro; o resto se divide entre as formas informadas.
  let restante = total;
  const pagamentos = [];
  if (v.troca) {
    const t = v.troca;
    let prod = Object.values(produtos).find((p) => p.tipo === "APARELHO" && p.modelo === t.modelo && /seminovo/i.test(p.descricao));
    if (!prod) {
      prod = await prisma.produto.create({ data: { empresaId: E, tipo: "APARELHO", descricao: `${t.modelo} seminovo`, modelo: t.modelo, sku: `DEMO-${String(sku++).padStart(3, "0")}`, precoCusto: t.valor, precoVenda: Math.round(t.valor * 1.3), criadoEm } });
      produtos[prod.descricao] = prod;
    }
    const recebido = await prisma.aparelho.create({
      data: { empresaId: E, produtoId: prod.id, modelo: `${t.modelo} ${t.cap}`, capacidade: t.cap, cor: t.cor, imei: imei(), serial: serial(), condicao: t.condicao, situacao: "EM_ESTOQUE", saudeBateria: t.bateria, custo: t.valor, observacoes: `${MARCA} Recebido na troca`, criadoEm },
    });
    await prisma.movimentoEstoque.create({ data: { empresaId: E, produtoId: prod.id, tipo: "ENTRADA_TROCA", quantidade: 1, custoUnit: t.valor, referencia: `Troca IMEI ${recebido.imei}`, criadoEm } });
    pagamentos.push({ forma: "TROCA", valor: t.valor, parcelas: 1, aparelhoTrocaId: recebido.id });
    restante -= t.valor;
  }
  v.pag.forEach(([forma, parcelas], k) => {
    const valor = k === v.pag.length - 1 ? restante : Math.round(restante / 2);
    restante -= valor;
    pagamentos.push({ forma, valor, parcelas, aparelhoTrocaId: null });
  });
  await prisma.pagamento.createMany({ data: pagamentos.map((p) => ({ ...p, empresaId: E, vendaId: venda.id })) });

  const lancamentos = [];
  for (const p of pagamentos) {
    if (p.forma === "TROCA") continue;
    const aPrazo = ["CREDITO", "BOLETO", "A_PRAZO"].includes(p.forma);
    const n = aPrazo ? p.parcelas : 1;
    for (let k = 1; k <= n; k++) {
      const venc = new Date(criadoEm);
      if (aPrazo) venc.setDate(venc.getDate() + 30 * k);
      const valor = Math.round((p.valor / n) * 100) / 100;
      const pago = !aPrazo || venc < new Date();
      lancamentos.push({ empresaId: E, tipo: "ENTRADA", status: pago ? "PAGO" : "PENDENTE", descricao: `Venda #${venda.numero}`, valor, vencimento: venc, pagoEm: pago ? (aPrazo ? venc : criadoEm) : null, forma: p.forma, parcela: k, totalParcelas: n, categoriaId: catVendas, clienteId: cliente.id, vendaId: venda.id, usuarioId: vendedor?.id, criadoEm });
    }
  }
  if (lancamentos.length) await prisma.lancamento.createMany({ data: lancamentos });
}

console.log(`Criados: ${clientes.length} clientes, ${Object.keys(produtos).length} produtos (${unidades.length} aparelhos em estoque), ${ordens.length} OS e ${vendas.length} vendas.`);
await prisma.$disconnect();
