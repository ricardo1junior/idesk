"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteSchema, prepararExtras, type EstadoFormulario } from "@/lib/clientes";
import { exigirUsuario } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function salvarCliente(
  id: string | null,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirUsuario("clientes");
  const valores = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;

  const resultado = clienteSchema.safeParse(valores);
  const extras = prepararExtras(valores.extras ?? null);
  if (!resultado.success || Object.keys(extras.erros).length) {
    const erros: Record<string, string> = { ...extras.erros };
    for (const issue of resultado.error?.issues ?? []) {
      const campo = String(issue.path[0] ?? "form");
      erros[campo] ??= issue.message;
    }
    return { erros, valores };
  }

  const { dataNascimento, ...dados } = resultado.data;
  const registro = {
    ...dados,
    dataNascimento: dataNascimento ? new Date(`${dataNascimento}T00:00:00`) : null,
    // Campos que não se aplicam ao tipo de pessoa são limpos.
    ...(dados.tipo === "PF"
      ? { nomeFantasia: null, inscricaoEstadual: null, inscricaoMunicipal: null }
      : { rg: null, dataNascimento: null }),
  };

  let clienteId = id;
  try {
    clienteId = await prisma.$transaction(async (tx) => {
      const cliente = id
        ? await tx.cliente.update({ where: { id }, data: registro })
        : await tx.cliente.create({ data: registro });
      // Contatos e endereços adicionais são regravados a cada salvamento.
      await tx.clienteContato.deleteMany({ where: { clienteId: cliente.id } });
      await tx.clienteEndereco.deleteMany({ where: { clienteId: cliente.id } });
      await tx.clienteContato.createMany({ data: extras.contatos.map((c) => ({ ...c, clienteId: cliente.id })) });
      await tx.clienteEndereco.createMany({ data: extras.enderecos.map((e) => ({ ...e, clienteId: cliente.id })) });
      return cliente.id;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        erros: { documento: `Já existe um cliente com este ${dados.tipo === "PF" ? "CPF" : "CNPJ"}` },
        valores,
      };
    }
    throw e;
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${clienteId}?salvo=1`);
}

export async function excluirCliente(id: string) {
  await exigirUsuario("excluirCliente");
  const vinculos = await prisma.cliente.findUnique({
    where: { id },
    select: { _count: { select: { ordens: true, vendas: true } } },
  });
  if (vinculos && vinculos._count.ordens + vinculos._count.vendas > 0) {
    return { erro: "Cliente tem ordens de serviço ou vendas e não pode ser excluído." };
  }
  await prisma.cliente.delete({ where: { id } });
  revalidatePath("/clientes");
  redirect("/clientes");
}
