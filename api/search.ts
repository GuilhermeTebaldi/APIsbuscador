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

function parseBody(req: any) {
  if (!req || req.body === undefined || req.body === null) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Método não permitido." });
  }

  const body = parseBody(req);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  const catalog = loadCatalog();

  if (!query) {
    return res.status(200).json({
      correctedQuery: "",
      explanation: "Procure as APIs cadastradas no catálogo.",
      apis: catalog,
      totalSystemApis: catalog.length
    });
  }

  const q = query.toLowerCase();
  const apis = catalog.filter((api: any) => {
    const fields = [
      api?.name,
      api?.description,
      api?.category,
      api?.subcategory,
      api?.groupCategory,
      api?.url,
      api?.docsUrl
    ];
    return fields.some((v) => typeof v === "string" && v.toLowerCase().includes(q));
  });

  return res.status(200).json({
    correctedQuery: query,
    explanation: apis.length > 0
      ? `Encontradas ${apis.length} APIs para "${query}".`
      : `Nenhuma API encontrada para "${query}".`,
    apis,
    totalSystemApis: catalog.length
  });
}
