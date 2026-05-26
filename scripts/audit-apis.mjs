#!/usr/bin/env node
import fs from "fs";
import path from "path";

const BASE_URL = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3000";
const SECRET_DIR = path.join(process.cwd(), ".site-secret");
const REPORT_PATH = path.join(SECRET_DIR, "last_audit_report.json");
const STATIC_CATALOG_PATH = path.join(process.cwd(), "public", "apis-catalog.json");

function normalizeHost(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  try {
    return new URL(rawUrl).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function parseArgs(argv) {
  const args = { limit: undefined, sampleOnly: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--sample") {
      args.sampleOnly = true;
      continue;
    }
    if (token === "--limit") {
      const raw = argv[i + 1];
      const parsed = Number(raw);
      if (!Number.isNaN(parsed) && parsed > 0) {
        args.limit = parsed;
      }
      i += 1;
    }
  }
  return args;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  const payload = {
    sampleOnly: args.sampleOnly
  };
  if (args.limit) {
    payload.limit = args.limit;
  }

  console.log(`[Audit] Iniciando auditoria em ${BASE_URL}/api/admin/audit ...`);
  const res = await fetch(`${BASE_URL}/api/admin/audit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Resposta inválida da auditoria: ${text.slice(0, 300)}`);
  }

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || json?.message || `Falha HTTP ${res.status}`);
  }

  if (!fs.existsSync(SECRET_DIR)) {
    fs.mkdirSync(SECRET_DIR, { recursive: true });
  }
  fs.writeFileSync(REPORT_PATH, JSON.stringify(json, null, 2), "utf-8");

  const report = Array.isArray(json.report) ? json.report : [];
  const failed = report.filter((item) => !item.ok);
  const authErrors = failed.filter((item) => item.status === 401 || item.status === 403);

  let removedFromStatic = 0;
  if (!args.sampleOnly) {
    const blockedRes = await fetch(`${BASE_URL}/api/admin/blocked`);
    const blockedJson = await blockedRes.json();
    const blockedEntries = Array.isArray(blockedJson?.blocked) ? blockedJson.blocked : [];
    const blockedIds = new Set(blockedEntries.map((item) => item.apiId).filter(Boolean));
    const blockedHosts = new Set(blockedEntries.map((item) => item.host).filter(Boolean));

    if (fs.existsSync(STATIC_CATALOG_PATH)) {
      const catalog = JSON.parse(fs.readFileSync(STATIC_CATALOG_PATH, "utf-8"));
      if (Array.isArray(catalog)) {
        const filtered = catalog.filter((api) => {
          if (!api || !api.id) return false;
          if (blockedIds.has(api.id)) return false;
          const host = normalizeHost(api.url);
          if (host && blockedHosts.has(host)) return false;
          return true;
        });

        removedFromStatic = catalog.length - filtered.length;
        if (removedFromStatic > 0) {
          fs.writeFileSync(STATIC_CATALOG_PATH, JSON.stringify(filtered, null, 2), "utf-8");
        }
      }
    }
  }

  console.log(`[Audit] APIs auditadas: ${json.audited}`);
  console.log(`[Audit] APIs bloqueadas nesta rodada: ${json.blocked}`);
  console.log(`[Audit] Falhas totais no teste: ${failed.length}`);
  console.log(`[Audit] Falhas de autenticação (401/403): ${authErrors.length}`);
  console.log(`[Audit] Relatório salvo em: ${REPORT_PATH}`);
  if (!args.sampleOnly) {
    console.log(`[Audit] APIs removidas do catálogo estático: ${removedFromStatic}`);
  }

  if (failed.length > 0) {
    console.log("\n[Audit] Primeiras falhas:");
    failed.slice(0, 30).forEach((item) => {
      const statusPart = item.status ? `HTTP ${item.status}` : "sem_status";
      const errPart = item.error ? ` | ${item.error}` : "";
      console.log(`- ${item.apiId} (${item.apiName}) -> ${statusPart}${errPart}`);
    });
  }
}

run().catch((err) => {
  console.error("[Audit] Erro:", err.message || err);
  process.exit(1);
});
