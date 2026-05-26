import fs from "fs";
import path from "path";

function loadCatalog() {
  const staticPath = path.join(process.cwd(), "public", "apis-catalog.json");
  try {
    const raw = fs.readFileSync(staticPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Método não permitido." });
  }

  const catalog = loadCatalog();
  return res.status(200).json({
    correctedQuery: "Sugestões Populares",
    explanation: "Selecione uma API e execute o teste real para inspecionar o payload de resposta.",
    apis: catalog,
    totalSystemApis: catalog.length
  });
}
