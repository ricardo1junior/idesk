import type { Metadata } from "next";
import { cookies } from "next/headers";
import { lerTema } from "@/lib/tema";
import "./globals.css";

export const metadata: Metadata = {
  title: "iDesk",
  description: "Vendas, ordens de serviço, estoque e notas fiscais",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const tema = lerTema((await cookies()).get("tema")?.value);
  return (
    <html lang="pt-BR" data-tema={tema} className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
