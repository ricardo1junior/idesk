import { createHash } from "node:crypto";

// O cookie guarda o token; o banco guarda só o hash dele.
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
