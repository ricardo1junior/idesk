import "server-only";

// Distância e tempo de carro entre a loja e o cliente pela OpenRouteService (https://openrouteservice.org, plano gratuito).
// O tempo é estimado sem trânsito em tempo real.

type Ponto = { lon: number; lat: number };

const base = () => (process.env.ORS_API_URL || "https://api.openrouteservice.org").replace(/\/$/, "");
export const rotasConfiguradas = () => !!process.env.ORS_API_KEY;

async function get(caminho: string) {
  const resp = await fetch(`${base()}${caminho}`, {
    headers: { Authorization: process.env.ORS_API_KEY!, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!resp.ok) throw new Error(`OpenRouteService respondeu ${resp.status}`);
  return resp.json();
}

export async function geocodificar(endereco: string): Promise<Ponto | null> {
  const j = await get(`/geocode/search?text=${encodeURIComponent(endereco)}&boundary.country=BR&size=1`);
  const c = j?.features?.[0]?.geometry?.coordinates;
  return Array.isArray(c) ? { lon: Number(c[0]), lat: Number(c[1]) } : null;
}

export async function rotaDeCarro(de: Ponto, para: Ponto): Promise<{ metros: number; segundos: number } | null> {
  const j = await get(`/v2/directions/driving-car?start=${de.lon},${de.lat}&end=${para.lon},${para.lat}`);
  const s = j?.features?.[0]?.properties?.summary;
  return s && typeof s.distance === "number" ? { metros: s.distance, segundos: s.duration } : null;
}

export function linkGoogleMaps(origem: string | null, destino: string) {
  const p = new URLSearchParams({ api: "1", destination: destino, travelmode: "driving" });
  if (origem) p.set("origin", origem);
  return `https://www.google.com/maps/dir/?${p}`;
}
