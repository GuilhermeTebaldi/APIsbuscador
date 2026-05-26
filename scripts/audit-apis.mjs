#!/usr/bin/env node
import fs from "fs";
import path from "path";

const BASE_URL = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3000";
const SECRET_DIR = path.join(process.cwd(), ".site-secret");
const REPORT_PATH = path.join(SECRET_DIR, "last_audit_report.json");

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

  console.log(`[Audit] APIs auditadas: ${json.audited}`);
  console.log(`[Audit] APIs bloqueadas nesta rodada: ${json.blocked}`);
  console.log(`[Audit] Falhas totais no teste: ${failed.length}`);
  console.log(`[Audit] Falhas de autenticação (401/403): ${authErrors.length}`);
  console.log(`[Audit] Relatório salvo em: ${REPORT_PATH}`);

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
