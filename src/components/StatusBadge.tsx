import type { StatusOS } from "@prisma/client";
import { STATUS_OS } from "@/lib/os";

export function StatusBadge({ status }: { status: StatusOS }) {
  const s = STATUS_OS[status];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cor}`}>{s.label}</span>;
}
