import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "iDesk",
  description: "Vendas, ordens de serviço, estoque e notas fiscais",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
