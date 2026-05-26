import fs from "fs";
import path from "path";
import crypto from "crypto";

const ROOT = process.cwd();
const APIS_MD_PATH = path.join(ROOT, "apis.md");
const SECRET_DIR = path.join(ROOT, ".site-secret");
const OUTPUT_JSON = path.join(SECRET_DIR, "collected_apis.json");
const STATIC_CATALOG_PATH = path.join(ROOT, "public", "apis-catalog.json");

const HEADER_RE = /^nome\s*\t\s*api direta\s*\t\s*fun[cç][aã]o/i;
const URL_RE = /^https?:\/\/\S+/i;

function isUrl(value = "") {
  return URL_RE.test(value.trim());
}

function cleanText(value = "") {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/✅/g, "")
    .replace(/~~/g, "")
    .replace(/^"+|"+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(value = "") {
  const raw = value.trim();
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    const pathname = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.protocol}//${host}${pathname}${u.search}`;
  } catch {
    return raw.toLowerCase();
  }
}

function slugify(value = "") {
  const base = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "api";
}

function pickCategory(name, func, url) {
  const t = `${name} ${func} ${url}`.toLowerCase();

  const rules = [
    { c: "IA & LLM", s: "Modelos e Chat", k: ["llm", "chat", "openai", "anthropic", "mistral", "deepseek", "groq", "openrouter", "prompt", "embeddings"] },
    { c: "IA & LLM", s: "Voz e Áudio", k: ["speech", "voice", "transcript", "elevenlabs", "deepgram", "assemblyai", "audio"] },
    { c: "IA & LLM", s: "Imagem e Multimodal", k: ["image", "stable", "replicate", "fal.ai", "civitai", "ocr", "removebg"] },
    { c: "Blockchain & Crypto", s: "Mercado e Tokens", k: ["crypto", "bitcoin", "coin", "token", "defi", "etherscan", "solana", "nft", "opensea", "blockchain"] },
    { c: "Segurança", s: "Threat Intelligence", k: ["threat", "cve", "vulnerability", "malware", "phish", "otx", "greynoise", "abuse", "leak", "security"] },
    { c: "Segurança", s: "Reconhecimento e Infra", k: ["shodan", "censys", "fofa", "zoomeye", "dns", "crt.sh", "internetdb", "assets", "subdomain"] },
    { c: "Dados & Pesquisa", s: "Científico", k: ["paper", "openalex", "semantic", "crossref", "openaire", "dataset", "kaggle", "zenodo", "dryad"] },
    { c: "Dados & Pesquisa", s: "Knowledge Graph", k: ["wikidata", "dbpedia", "sparql", "knowledge graph"] },
    { c: "Clima & Geografia", s: "Meteorologia", k: ["weather", "meteo", "clima", "flood", "air pollution", "aqi", "earthquake", "usgs", "openaq"] },
    { c: "Clima & Geografia", s: "Mapas e Geodados", k: ["map", "geo", "geography", "nominatim", "openstreetmap", "countries", "ibge", "brasilapi"] },
    { c: "Transporte & Mobilidade", s: "Aéreo e Marítimo", k: ["flight", "air", "aviation", "adsb", "opensky", "ais", "navio"] },
    { c: "Transporte & Mobilidade", s: "Trânsito e Público", k: ["transit", "bus", "train", "mbta", "wmata", "traffic", "bike"] },
    { c: "Observabilidade & DevOps", s: "Logs e Erros", k: ["observability", "logs", "sentry", "uptime", "glitchtip", "analytics", "monitor"] },
    { c: "Automação & Plataforma", s: "Workflow e Integração", k: ["workflow", "pipeline", "orquestra", "airbyte", "prefect", "dagster", "temporal", "kestra"] },
    { c: "Comunicação", s: "Email e Notificações", k: ["email", "mail", "notify", "notification", "push", "chatwoot", "novu"] },
    { c: "Mídia & Conteúdo", s: "Imagens, Áudio e Vídeo", k: ["gif", "emoji", "fanart", "radio", "sound", "openverse", "smithsonian", "europeana"] },
    { c: "Games & Entretenimento", s: "Jogos e Cultura Pop", k: ["pokemon", "anime", "game", "steam", "fortnite", "valorant", "rick", "star wars", "disney", "marvel"] },
    { c: "Finanças & Economia", s: "Mercado e Câmbio", k: ["currency", "forex", "metal", "fuel", "economia", "câmbio", "gold"] },
    { c: "Utilidades", s: "Dados Gerais", k: ["random", "quote", "joke", "fake", "placeholder", "advice", "activity", "public api"] }
  ];

  for (const rule of rules) {
    if (rule.k.some((token) => t.includes(token))) {
      return { category: rule.c, subcategory: rule.s };
    }
  }

  return { category: "Utilidades", subcategory: "Geral" };
}

function guessAuth(name, func, url, groupCategory = "", subcategory = "") {
  const t = `${name} ${func} ${url} ${groupCategory} ${subcategory}`.toLowerCase();
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (url.includes("localhost") || url.includes(".example")) return "other";

  const strictAuthHosts = [
    "api.openai.com",
    "api.anthropic.com",
    "api.groq.com",
    "openrouter.ai",
    "api.deepinfra.com",
    "sentry.io",
    "api.the-odds-api.com",
    "api.football-data.org",
    "api.search.brave.com"
  ];

  if (strictAuthHosts.some((h) => host === h || host.endsWith(`.${h}`))) {
    return "apiKey";
  }

  if (
    t.includes("helicone") ||
    t.includes("langfuse") ||
    t.includes("promptlayer") ||
    t.includes("humanloop") ||
    t.includes("portkey") ||
    t.includes("openpipe") ||
    t.includes("helius") ||
    t.includes("dune") ||
    t.includes("bitquery") ||
    t.includes("arkham") ||
    t.includes("chainbase") ||
    t.includes("zerion") ||
    t.includes("birdeye") ||
    t.includes("rugcheck") ||
    t.includes("solana.fm") ||
    t.includes("hyperdx") ||
    t.includes("betterstack") ||
    t.includes("plausible") ||
    t.includes("umami") ||
    t.includes("logsnag") ||
    t.includes("novu") ||
    t.includes("cal.com") ||
    t.includes("openai") ||
    t.includes("anthropic") ||
    t.includes("groq") ||
    t.includes("mistral") ||
    t.includes("deepseek") ||
    t.includes("firecrawl") ||
    t.includes("tavily") ||
    t.includes("exa") ||
    t.includes("auth") ||
    t.includes("authorization") ||
    t.includes("bearer") ||
    t.includes("oauth") ||
    t.includes("api key") ||
    t.includes("token")
  ) {
    return "apiKey";
  }
  return "none";
}

function toEndpoint(url, name) {
  try {
    const u = new URL(url);
    const endpointPath = `${u.pathname || ""}${u.search || ""}` || "/";
    return {
      path: endpointPath,
      method: "GET",
      description: `Endpoint principal da API ${name}.`
    };
  } catch {
    return {
      path: "",
      method: "GET",
      description: `Endpoint principal da API ${name}.`
    };
  }
}

function baseUrlOf(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return url;
  }
}

function parseEntriesFromMd(mdText) {
  const lines = mdText.split(/\r?\n/);
  const parsed = [];
  let candidateName = "";
  let candidateHint = "";

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = cleanText(raw);
    if (!line) continue;
    if (HEADER_RE.test(line)) continue;

    const cols = raw.split("\t");

    // Padrão atual principal: Status<TAB>Nome<TAB>URL<TAB>Função<TAB>Categoria Real<TAB>Grupo<TAB>Subcategoria
    if (cols.length >= 3) {
      const c0 = cleanText(cols[0] || "");
      const c1 = cleanText(cols[1] || "");
      const c2 = cleanText(cols[2] || "");
      const c3 = cleanText(cols[3] || "");
      const c4 = cleanText(cols[4] || "");
      const c5 = cleanText(cols[5] || "");
      const c6 = cleanText(cols[6] || "");
      if (isUrl(c2) && c1 && c1.toLowerCase() !== "nome") {
        parsed.push({
          name: c1,
          url: c2,
          func: c3 || "API pública",
          realCategory: c4 || c3 || "API pública",
          groupCategory: c5,
          subcategory: c6,
          source: "tab-status-v2",
          status: c0
        });
        candidateName = "";
        candidateHint = "";
        continue;
      }
    }

    // Padrão principal: Nome<TAB>URL<TAB>Função
    if (cols.length >= 3) {
      const c0 = cleanText(cols[0] || "");
      const c1 = cleanText(cols[1] || "");
      const c2 = cleanText(cols[2] || "");

      if (isUrl(c1)) {
        if (c0 && c0.toLowerCase() !== "nome") {
          parsed.push({
            name: c0,
            url: c1,
            func: c2 || "API pública",
            realCategory: c2 || "API pública",
            source: "tab"
          });
          candidateName = "";
          candidateHint = "";
          continue;
        }
      }

      // Padrão com status: ✅ <TAB> Nome <TAB> URL <TAB> Função
      if (cols.length >= 4) {
        const cStatusRaw = (cols[0] || "").trim();
        const cStatus = cleanText(cols[0] || "");
        const cName = cleanText(cols[1] || "");
        const cUrl = cleanText(cols[2] || "");
        const cFunc = cleanText(cols[3] || "");
        if ((cStatusRaw.includes("✅") || cStatus.toLowerCase() === "ok" || cStatus === "") && isUrl(cUrl)) {
          parsed.push({
            name: cName,
            url: cUrl,
            func: cFunc || "API pública",
            realCategory: cFunc || "API pública",
            source: "tab-status"
          });
          candidateName = "";
          candidateHint = "";
          continue;
        }
      }
    }

    // Padrão complementar: linhas separadas (Nome / Correto / URL)
    if (isUrl(line)) {
      const fallbackName = candidateName || `API ${new URL(line).hostname}`;
      const fallbackFunc = candidateHint || "Validada manualmente";
      parsed.push({
        name: fallbackName,
        url: line,
        func: fallbackFunc,
        realCategory: fallbackFunc,
        source: "standalone"
      });
      candidateName = "";
      candidateHint = "";
      continue;
    }

    const lower = line.toLowerCase();
    const isNoise =
      lower === "correto" ||
      line === "⸻" ||
      lower.startsWith("estas abaixo") ||
      lower.startsWith("essas não") ||
      lower.startsWith("são:") ||
      lower.startsWith("como identificar") ||
      lower.startsWith("melhor prática") ||
      lower.startsWith("dados") ||
      lower.startsWith("ia") ||
      lower.startsWith("anime") ||
      lower.startsWith("livros") ||
      lower.startsWith("geografia") ||
      lower.startsWith("qualidade do ar") ||
      lower.startsWith("api") ||
      lower.startsWith("serviço");

    if (isNoise) {
      if (lower === "correto") {
        candidateHint = "Validada manualmente";
      }
      continue;
    }

    // Guarda nome candidato para caso a URL venha na linha seguinte
    if (!line.includes("http")) {
      candidateName = line;
    }
  }

  // Deduplicação por URL normalizada
  const seen = new Set();
  const deduped = [];
  for (const p of parsed) {
    const key = normalizeUrl(p.url);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(p);
    }
  }

  return deduped;
}

function buildCatalog(entries) {
  const result = [];
  const usedIds = new Set();

  for (const item of entries) {
    const name = cleanText(item.name);
    const func = cleanText(item.func || "API pública");
    const manualRealCategory = cleanText(item.realCategory || "");
    const manualGroup = cleanText(item.groupCategory || "");
    const manualSub = cleanText(item.subcategory || "");
    const url = cleanText(item.url);
    if (!name || !isUrl(url)) continue;

    const picked = pickCategory(name, manualRealCategory || func, url);
    const groupCategory = manualGroup || picked.category;
    const subcategory = manualSub || picked.subcategory;
    const realCategory = manualRealCategory || func || "API pública";
    const auth = guessAuth(name, `${func} ${realCategory}`, url, groupCategory, subcategory);
    const idSeed = slugify(name);
    const urlHash = crypto.createHash("md5").update(normalizeUrl(url)).digest("hex").slice(0, 6);
    let id = `${idSeed}-${urlHash}`;
    while (usedIds.has(id)) {
      id = `${id}-${Math.floor(Math.random() * 10)}`;
    }
    usedIds.add(id);

    result.push({
      id,
      name,
      description: `${func}.`,
      category: realCategory,
      subcategory,
      groupCategory,
      url: baseUrlOf(url),
      docsUrl: url,
      endpoints: [toEndpoint(url, name)],
      auth
    });
  }

  return result;
}

function rewriteApisMd(catalog) {
  const lines = [];
  lines.push("Legenda:");
  lines.push("✅ = importada para o sistema");
  lines.push("Status\tNome\tAPI direta\tFunção\tCategoria Real\tGrupo\tSubcategoria");

  for (const api of catalog) {
    const endpoint = api.docsUrl;
    const func = api.description.replace(/\.$/, "");
    lines.push(`✅\t~~${api.name}~~\t${endpoint}\t${func}\t${api.category}\t${api.groupCategory || 'Utilidades'}\t${api.subcategory}`);
  }

  lines.push("");
  lines.push(`Total importado: ${catalog.length} APIs`);
  fs.writeFileSync(APIS_MD_PATH, `${lines.join("\n")}\n`, "utf-8");
}

function loadFallbackEntriesFromStaticCatalog() {
  if (!fs.existsSync(STATIC_CATALOG_PATH)) return [];
  try {
    const arr = JSON.parse(fs.readFileSync(STATIC_CATALOG_PATH, "utf-8"));
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((item) => item && item.name && item.docsUrl)
      .map((item) => ({
        name: cleanText(item.name),
        url: cleanText(item.docsUrl),
        func: cleanText(String(item.description || "API pública").replace(/\.$/, "")),
        source: "fallback-static"
      }));
  } catch {
    return [];
  }
}

function main() {
  if (!fs.existsSync(APIS_MD_PATH)) {
    throw new Error(`Arquivo não encontrado: ${APIS_MD_PATH}`);
  }

  const md = fs.readFileSync(APIS_MD_PATH, "utf-8");
  let entries = parseEntriesFromMd(md);
  if (entries.length === 0) {
    const fallbackEntries = loadFallbackEntriesFromStaticCatalog();
    if (fallbackEntries.length > 0) {
      entries = fallbackEntries;
      console.log(`[import-apis-md] apis.md sem linhas válidas; usando fallback de ${STATIC_CATALOG_PATH}.`);
    }
  }
  const catalog = buildCatalog(entries);

  fs.mkdirSync(SECRET_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(catalog, null, 2), "utf-8");
  fs.writeFileSync(STATIC_CATALOG_PATH, JSON.stringify(catalog, null, 2), "utf-8");
  rewriteApisMd(catalog);

  console.log(`[import-apis-md] entradas lidas: ${entries.length}`);
  console.log(`[import-apis-md] catálogo salvo: ${catalog.length} APIs -> ${OUTPUT_JSON}`);
  console.log(`[import-apis-md] catálogo público atualizado: ${STATIC_CATALOG_PATH}`);
  console.log(`[import-apis-md] apis.md atualizado com status ✅ e nome riscado.`);
}

main();
