import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Sparkles, Loader2, Layers, Zap, Key, FileText, 
  ExternalLink, RefreshCw, Check, Globe, AlertTriangle, 
  MapPin, TrendingUp, Coins, Calendar, Hash, BookOpen, Quote,
  ArrowLeft, Copy
} from 'lucide-react';
import { FreeApiInfo, QueryParamInfo, PathParamInfo, EndpointInfo } from './types';
import { getPresetsForApi, CommandPreset } from './utils/presets';
import { OFFLINE_DEFAULT_APIS } from './data/offlineDefaults';
import pirateShipBg from './assets/images/pirate_ship_bg_1779738901287.png';

// Helper to stringify JSON nicely
const formatJson = (data: any): string => {
  if (data === null || data === undefined) return '';
  try {
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return "[Erro de formatação JSON]";
  }
};

type JsonMapRow = {
  path: string;
  kind: string;
  detail: string;
};

const getJsonKind = (value: any): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

const formatPrimitivePreview = (value: any): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    return `"${value.length > 44 ? `${value.slice(0, 44)}...` : value}"`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'bigint') {
    return `${String(value)}n`;
  }
  return '[valor]';
};

const buildResponseMap = (
  payload: any,
  maxRows = 20,
  maxDepth = 2
): { rootKind: string; rootDetail: string; rows: JsonMapRow[]; truncated: boolean } => {
  const rootKind = getJsonKind(payload);
  const rows: JsonMapRow[] = [];
  const queue: Array<{ path: string; value: any; depth: number }> = [{ path: '$', value: payload, depth: 0 }];

  while (queue.length > 0 && rows.length < maxRows) {
    const current = queue.shift()!;
    const kind = getJsonKind(current.value);

    if (kind === 'array') {
      const arr = current.value as any[];
      const sampleKind = arr.length > 0 ? getJsonKind(arr[0]) : 'vazio';
      rows.push({
        path: current.path,
        kind,
        detail: `${arr.length} item(ns)${arr.length > 0 ? `, exemplo: ${sampleKind}` : ''}`
      });

      if (current.depth < maxDepth && arr.length > 0) {
        queue.push({
          path: `${current.path}[0]`,
          value: arr[0],
          depth: current.depth + 1
        });
      }
      continue;
    }

    if (kind === 'object') {
      const obj = current.value as Record<string, any>;
      const keys = Object.keys(obj);
      rows.push({
        path: current.path,
        kind,
        detail: keys.length === 0
          ? 'objeto vazio'
          : `chaves: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`
      });

      if (current.depth < maxDepth) {
        keys.slice(0, 6).forEach((key) => {
          queue.push({
            path: current.path === '$' ? key : `${current.path}.${key}`,
            value: obj[key],
            depth: current.depth + 1
          });
        });
      }
      continue;
    }

    rows.push({
      path: current.path,
      kind,
      detail: formatPrimitivePreview(current.value)
    });
  }

  const rootDetail =
    rootKind === 'array'
      ? `${Array.isArray(payload) ? payload.length : 0} item(ns)`
      : rootKind === 'object'
        ? `${payload && typeof payload === 'object' ? Object.keys(payload).length : 0} campo(s) no objeto raiz`
        : formatPrimitivePreview(payload);

  return {
    rootKind,
    rootDetail,
    rows,
    truncated: queue.length > 0
  };
};

const CATEGORIES_MAP = [
  {
    name: "Geografia & Clima",
    icon: "🌍",
    subcategories: ["Clima & Tempo", "Fronteiras & Países", "Espaço & NASA"]
  },
  {
    name: "Jogos & Quadrinhos",
    icon: "🎮",
    subcategories: ["Pokémon", "Yu-Gi-Oh!", "Animes & Cultura Pop"]
  },
  {
    name: "Humor & Curiosidades",
    icon: "🐱",
    subcategories: ["Humor & Devs", "Fatos Felinos", "Fatos & Variedades"]
  },
  {
    name: "Mock & Desenvolvimento",
    icon: "💻",
    subcategories: ["Prototipagem Mock", "Bios & GitHub", "Voz & Conversão"]
  },
  {
    name: "Finanças & Crypto",
    icon: "📈",
    subcategories: ["Crypto & Moedas", "Feriados Bancários"]
  }
];

const INITIAL_VISIBLE_APIS = 24;
const LOAD_MORE_APIS_STEP = 24;

export default function App() {
  // Query States
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [correctedQuery, setCorrectedQuery] = useState('');
  const [explanation, setExplanation] = useState('Explore as APIs disponíveis abaixo ou pesquise o que precisa.');
  const [allApis, setAllApis] = useState<FreeApiInfo[]>([]);
  const [apiList, setApiList] = useState<FreeApiInfo[]>([]);
  const [isFallback, setIsFallback] = useState(false);
  const [totalApis, setTotalApis] = useState<number>(55);
  const [offlineCatalog, setOfflineCatalog] = useState<FreeApiInfo[] | null>(null);

  // States per Card
  const [cardQueryParams, setCardQueryParams] = useState<Record<string, Record<string, string>>>({});
  const [cardPathParams, setCardPathParams] = useState<Record<string, Record<string, string>>>({});
  const [cardResults, setCardResults] = useState<Record<string, any>>({});
  const [cardLoading, setCardLoading] = useState<Record<string, boolean>>({});

  // Navigation Detail & Clipboard copy state
  const [selectedApi, setSelectedApi] = useState<FreeApiInfo | null>(null);
  const [copied, setCopied] = useState(false);

  // Custom API Collector States
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectStatus, setCollectStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [showCollector, setShowCollector] = useState(false);

  // Category & Subcategory Filtering States
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedRawCategory, setSelectedRawCategory] = useState<string>('');
  const [rawCategorySearch, setRawCategorySearch] = useState<string>('');
  const [visibleApiLimit, setVisibleApiLimit] = useState<number>(INITIAL_VISIBLE_APIS);

  // Categorização Determinística de APIs com base em dados reais do Pirate Index
  const getApiSubcategory = (api: FreeApiInfo): string => {
    if (api.subcategory && api.subcategory.trim()) {
      return api.subcategory.trim();
    }

    const name = api.name.toLowerCase();
    const desc = api.description.toLowerCase();
    const cat = (api.category || "").toLowerCase();

    // Geografia & Clima
    if (name.includes("tempo") || name.includes("meteo") || cat.includes("clima")) return "Clima & Tempo";
    if (name.includes("nasa") || name.includes("astron") || name.includes("apod") || desc.includes("apod")) return "Espaço & NASA";
    if (name.includes("countries") || name.includes("país") || name.includes("paises") || name.includes("geografia")) return "Fronteiras & Países";

    // Jogos & Quadrinhos
    if (name.includes("poke") || desc.includes("pokemon")) return "Pokémon";
    if (name.includes("yugioh") || name.includes("yugi") || desc.includes("cartas")) return "Yu-Gi-Oh!";
    if (name.includes("rick") || name.includes("morty") || name.includes("desenho") || cat.includes("entretenimento") || cat.includes("games")) return "Animes & Cultura Pop";

    // Humor & Curiosidades
    if (name.includes("piada") || name.includes("joke") || name.includes("humor")) return "Humor & Devs";
    if (name.includes("gato") || name.includes("cat")) return "Fatos Felinos";
    if (name.includes("curiosidades") || name.includes("fact") || cat.includes("curiosidades")) return "Fatos & Variedades";

    // Mock & Desenvolvimento
    if (name.includes("placeholder") || name.includes("fictícia") || name.includes("mock") || name.includes("falsa") || desc.includes("crud")) return "Prototipagem Mock";
    if (name.includes("github") || name.includes("perfil") || name.includes("desenvedor") || name.includes("usuário") || cat.includes("perfis") || cat.includes("desenvolvimento")) return "Bios & GitHub";
    if (name.includes("voice") || name.includes("speech") || name.includes("áudio") || name.includes("voz")) return "Voz & Conversão";

    // Finanças & Crypto
    if (name.includes("bitcoin") || name.includes("coindesk") || name.includes("crypto")) return "Crypto & Moedas";
    if (name.includes("feriado") || name.includes("nager") || name.includes("banca")) return "Feriados Bancários";
    
    return "Fatos & Variedades";
  };

  const getApiParentCategory = (api: FreeApiInfo): string => {
    if (api.groupCategory && api.groupCategory.trim()) {
      return api.groupCategory.trim();
    }

    const sub = getApiSubcategory(api);
    if (["Clima & Tempo", "Fronteiras & Países", "Espaço & NASA"].includes(sub)) return "Geografia & Clima";
    if (["Pokémon", "Yu-Gi-Oh!", "Animes & Cultura Pop"].includes(sub)) return "Jogos & Quadrinhos";
    if (["Humor & Devs", "Fatos Felinos", "Fatos & Variedades"].includes(sub)) return "Humor & Curiosidades";
    if (["Prototipagem Mock", "Bios & GitHub", "Voz & Conversão"].includes(sub)) return "Mock & Desenvolvimento";
    if (["Crypto & Moedas", "Feriados Bancários"].includes(sub)) return "Finanças & Crypto";
    return "Humor & Curiosidades";
  };

  // Suggested search shortcuts
  const shortcuts = [
    { label: "Previsão do Tempo", term: "clima tempo" },
    { label: "Pokémon", term: "pokemon pokeapi" },
    { label: "Curiosidades sobre Gatos", term: "curiosidades gatos catfact" },
    { label: "Preço do Bitcoin", term: "coindesk bitcoin" },
    { label: "Feriados Nacionais", term: "feriados nager" },
    { label: "Bandeira & Fronteiras dos Países", term: "paises geografia" },
    { label: "Bíblia Eletrônica", term: "versiculo biblia" }
  ];

  // Fetch initial popular APIs
  useEffect(() => {
    fetchInitialApis();
  }, []);

  const parseJsonResponse = async (res: Response) => {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      const text = await res.text();
      throw new Error(`Resposta não-JSON em ${res.url || 'endpoint'} [${res.status}]: ${text.slice(0, 120)}`);
    }
    return res.json();
  };

  const applyApisPayload = (data: any, fallbackTitle = 'APIs Recomendadas') => {
    const apis = Array.isArray(data?.apis) ? data.apis : [];
    setAllApis(apis);
    setApiList(apis);
    setExplanation(data?.explanation || '');
    setCorrectedQuery(data?.correctedQuery || fallbackTitle);
    setIsFallback(!!data?.isFallback);
    if (data?.totalSystemApis) {
      setTotalApis(data.totalSystemApis);
    } else {
      setTotalApis(apis.length);
    }
  };

  const loadOfflineCatalog = async (): Promise<FreeApiInfo[]> => {
    if (offlineCatalog && offlineCatalog.length > 0) {
      return offlineCatalog;
    }

    try {
      const res = await fetch('/apis-catalog.json');
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.toLowerCase().includes('application/json')) {
        throw new Error(`catálogo estático indisponível [${res.status}]`);
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setOfflineCatalog(data);
        return data;
      }
      throw new Error('catálogo estático vazio');
    } catch (err) {
      console.warn('[offline-catalog] fallback mínimo ativo:', err);
      return OFFLINE_DEFAULT_APIS;
    }
  };

  const applyOfflineFallback = async (queryHint = '') => {
    const catalog = await loadOfflineCatalog();
    const trimmed = queryHint.trim().toLowerCase();
    const localList = trimmed
      ? catalog.filter((api) =>
          api.name.toLowerCase().includes(trimmed) ||
          api.description.toLowerCase().includes(trimmed) ||
          (api.category || '').toLowerCase().includes(trimmed)
        )
      : catalog;
    const apis = localList.length > 0 ? localList : catalog;
    const payload = {
      correctedQuery: queryHint || 'Modo Offline',
      explanation: 'Backend indisponível. Exibindo catálogo local embutido no frontend.',
      apis,
      isFallback: true,
      totalSystemApis: apis.length
    };
    applyApisPayload(payload, 'Modo Offline');
  };

  const fetchInitialApis = async () => {
    setLoading(true);

    try {
      const res = await fetch('/api/defaults');
      const data = await parseJsonResponse(res);
      applyApisPayload(data, 'APIs Recomendadas');
    } catch (e) {
      console.warn("Backend /api/defaults indisponível. Modo offline ativo.");
      await applyOfflineFallback();
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent, directTerm?: string) => {
    if (e) e.preventDefault();
    const activeTerm = directTerm !== undefined ? directTerm : query;
    if (!activeTerm.trim()) {
      fetchInitialApis();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: activeTerm })
      });
      const data = await parseJsonResponse(res);
      applyApisPayload(data, activeTerm);
    } catch (err) {
      console.warn("Backend /api/search indisponível. Busca local offline ativa.");
      await applyOfflineFallback(activeTerm);
    } finally {
      setLoading(false);
    }
  };

  const handleCollectApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customApiUrl.trim()) return;

    setIsCollecting(true);
    setCollectStatus(null);

    try {
      const res = await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: customApiUrl.trim() })
      });
      const data = await res.json();
      
      if (data.ok) {
        setCollectStatus({ success: true, message: data.message });
        setCustomApiUrl('');
        // Refresh catalog to make the newly cataloged API immediately discoverable
        fetchInitialApis();
      } else {
        setCollectStatus({ success: false, message: data.message });
      }
    } catch (err: any) {
      console.error("Erro ao catalogar API:", err);
      setCollectStatus({ 
        success: false, 
        message: "Falha de conexão com o analisador de APIs. Certifique-se de que a rede está ativa e envie novamente." 
      });
    } finally {
      setIsCollecting(false);
    }
  };

  // Initialize query/path params only when a specific API card is opened.
  const initializeApiParams = (api: FreeApiInfo) => {
    const ep = api.endpoints?.[0];
    if (!ep) return;

    setCardQueryParams((prev) => {
      if (prev[api.id]) return prev;
      const q: Record<string, string> = {};
      ep.queryParams?.forEach((param) => {
        q[param.name] = param.defaultValue || '';
      });
      return { ...prev, [api.id]: q };
    });

    setCardPathParams((prev) => {
      if (prev[api.id]) return prev;
      const p: Record<string, string> = {};
      ep.pathParams?.forEach((param) => {
        p[param.name] = param.defaultValue || '';
      });
      return { ...prev, [api.id]: p };
    });
  };

  const openApiDetails = (api: FreeApiInfo) => {
    initializeApiParams(api);
    setSelectedApi(api);
  };

  // Run live proxy call
  const executeCardTest = async (api: FreeApiInfo, customQ?: Record<string, string>, customP?: Record<string, string>) => {
    const ep = api.endpoints?.[0];
    if (!ep) return;

    setCardLoading(prev => ({ ...prev, [api.id]: true }));

    const activeQ = customQ || cardQueryParams[api.id] || {};
    const activeP = customP || cardPathParams[api.id] || {};

    let finalPath = ep.path;
    // Substitute path params
    if (ep.pathParams && ep.pathParams.length > 0) {
      ep.pathParams.forEach(p => {
        const val = activeP[p.name] !== undefined ? activeP[p.name] : (p.defaultValue || '');
        if (finalPath.includes(`:${p.name}`)) {
          finalPath = finalPath.replace(`:${p.name}`, encodeURIComponent(val));
        } else if (finalPath.includes(p.name)) {
          finalPath = finalPath.replace(p.name, val);
        } else {
          if (!finalPath.endsWith('/') && !val.startsWith('/')) {
            finalPath += '/';
          }
          finalPath += encodeURIComponent(val);
        }
      });
    }

    // Dynamic query strings
    const queryParts = Object.entries(activeQ)
      .filter(([_, value]) => value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    const queryStr = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const targetUrl = `${api.url}${finalPath}${queryStr}`;
    const requestMethod = ep.method || 'GET';

    const runDirectBrowserRequest = async (fallbackReason: string) => {
      const startedAt = Date.now();
      try {
        const directResponse = await fetch(targetUrl, {
          method: requestMethod,
          headers: {
            Accept: 'application/json, text/plain, */*'
          }
        });
        const durationMs = Date.now() - startedAt;
        const contentType = directResponse.headers.get('content-type') || '';
        const data = contentType.toLowerCase().includes('application/json')
          ? await directResponse.json()
          : await directResponse.text();

        setCardResults(prev => ({
          ...prev,
          [api.id]: {
            ok: directResponse.ok,
            status: directResponse.status,
            durationMs,
            data,
            source: 'browser-direct',
            url: targetUrl,
            error: directResponse.ok ? undefined : `Requisição direta retornou HTTP ${directResponse.status}.`
          }
        }));
      } catch (directError: any) {
        const durationMs = Date.now() - startedAt;
        setCardResults(prev => ({
          ...prev,
          [api.id]: {
            ok: false,
            status: 0,
            durationMs,
            data: api.sampleResponse || null,
            source: 'browser-direct',
            url: targetUrl,
            error: `Não foi possível testar esta API no navegador (${fallbackReason}). Bloqueio de CORS ou rede externa indisponível.`
          }
        }));
      }
    };

    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          method: requestMethod
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        const text = await response.text();
        throw new Error(`Proxy respondeu não-JSON [${response.status}]: ${text.slice(0, 120)}`);
      }

      const json = await response.json();
      setCardResults(prev => ({
        ...prev,
        [api.id]: {
          ok: response.ok && json.ok !== false && json.status < 400,
          status: json.status || response.status,
          durationMs: json.durationMs || 50,
          data: json.data || json,
          source: 'proxy',
          url: targetUrl
        }
      }));
    } catch (err: any) {
      await runDirectBrowserRequest(err?.message || 'proxy indisponível');
    } finally {
      setCardLoading(prev => ({ ...prev, [api.id]: false }));
    }
  };

  // Fast apply preset shortcut values and auto execute
  const applyPreset = async (api: FreeApiInfo, preset: CommandPreset) => {
    const q = { ...(cardQueryParams[api.id] || {}), ...(preset.queryParams || {}) };
    const p = { ...(cardPathParams[api.id] || {}), ...(preset.pathParams || {}) };

    setCardQueryParams(prev => ({
      ...prev,
      [api.id]: q
    }));
    setCardPathParams(prev => ({
      ...prev,
      [api.id]: p
    }));

    // Auto execute to show instant real results
    await executeCardTest(api, q, p);
  };

  // Reset card state to static sample
  const clearCardResult = (apiId: string) => {
    setCardResults(prev => {
      const updated = { ...prev };
      delete updated[apiId];
      return updated;
    });
  };

  // Beautiful visual parsers for previews (Static and Dynamic)
  const renderCardContentBox = (api: FreeApiInfo) => {
    const hasLiveResult = !!cardResults[api.id];
    const liveInfo = cardResults[api.id];
    const sourceData = hasLiveResult ? liveInfo.data : api.sampleResponse;

    // Loading State Spinner overlay inside the container
    const isLoading = !!cardLoading[api.id];

    // Sub-renderer for Open-Meteo Weather
    if (api.id === 'open-meteo' && sourceData) {
      const temp = sourceData.current_weather?.temperature ?? '';
      const wind = sourceData.current_weather?.windspeed ?? '';
      const condCode = sourceData.current_weather?.weathercode ?? 0;
      const isDay = sourceData.current_weather?.is_day ?? 1;

      // Weather status texts in Portuguese
      let weatherDesc = "Tempo Limpo";
      if (condCode >= 1 && condCode <= 3) weatherDesc = "Parcialmente Nublado";
      else if (condCode >= 45 && condCode <= 48) weatherDesc = "Nevoeiro";
      else if (condCode >= 51 && condCode <= 67) weatherDesc = "Chuva Leve";
      else if (condCode >= 71 && condCode <= 77) weatherDesc = "Neve";
      else if (condCode >= 80 && condCode <= 82) weatherDesc = "Pancadas de Chuva ⛈️";

      return (
        <div className="bg-gradient-to-br from-slate-950 to-indigo-950/70 p-4 rounded-xl border border-indigo-500/10 text-slate-100 flex flex-col justify-between min-h-[140px] relative overflow-hidden">
          <div className="absolute top-1 right-1 opacity-10 bg-indigo-500 h-24 w-24 rounded-full blur-xl" />
          
          <div className="flex justify-between items-start border-b border-indigo-500/10 pb-2">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-mono text-cyan-400 font-bold">PREVISÃO DO TEMPO REAL</span>
              <p className="text-[11px] text-slate-400 font-mono">Lat: {sourceData.latitude ?? '-'} / Long: {sourceData.longitude ?? '-'}</p>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-slate-900 px-1.5 py-0.5 rounded">
              {hasLiveResult ? 'DADO DINO/VIVO' : 'EXEMPLO REAL'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-extrabold text-white tracking-tight font-display">{temp}°C</span>
              <div>
                <p className="text-xs font-bold text-slate-200">{weatherDesc}</p>
                <p className="text-[10px] text-slate-400 font-mono">Vento: {wind} km/h</p>
              </div>
            </div>
            <div className="text-2xl mt-1">{isDay ? "☀️" : "🌙"}</div>
          </div>

          {sourceData.timezone && (
            <div className="text-[9px] text-slate-500 font-mono text-right mt-1">
              Fuso Horário: {sourceData.timezone}
            </div>
          )}
        </div>
      );
    }

    // Sub-renderer for PokeApi
    if (api.id === 'pokeapi' && sourceData) {
      const name = sourceData.name || '';
      const sprite = sourceData.sprites?.front_default || '';
      const weight = sourceData.weight || '?';
      const height = sourceData.height || '?';
      const typesList = sourceData.types || [];

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 flex items-center gap-4 min-h-[140px] relative overflow-hidden">
          {sprite ? (
            <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center p-1 flex-shrink-0 relative z-10">
              <img src={sprite} alt={name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-slate-905 border border-slate-800 rounded-lg flex items-center justify-center text-xs text-slate-600 flex-shrink-0">
              Sem Foto
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest">Catálogo Pokedex</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'AO VIVO' : 'MOCK'}</span>
            </div>
            <h4 className="text-sm font-black text-white capitalize truncate mb-1">{name || 'Carregando...'}</h4>
            <p className="text-[10px] font-mono text-slate-400">Peso: {weight} · Altura: {height}</p>

            <div className="flex flex-wrap gap-1 mt-2">
              {typesList.map((t: any, idx: number) => (
                <span key={idx} className="bg-rose-950/60 text-rose-300 border border-rose-900/40 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                  {t.type?.name || t}
                </span>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Sub-renderer for Rick & Morty
    if (api.id === 'rickandmorty' && sourceData) {
      const name = sourceData.name || '';
      const status = sourceData.status || '';
      const species = sourceData.species || '';
      const image = sourceData.image || '';

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 flex items-center gap-4 min-h-[140px]">
          {image ? (
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex-shrink-0">
              <img src={image} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : null}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-green-400 font-mono tracking-widest font-bold">Universo Animado</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'DINO' : 'MOCK'}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate">{name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-block w-2-h-2 rounded-full text-[9px] px-1.5 py-0.5 font-bold uppercase rounded ${
                status === 'Alive' || status === 'Vivo' 
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' 
                  : 'bg-rose-950 text-rose-400 border border-rose-900/30'
              }`}>
                ● {status}
              </span>
              <span className="text-[10px] text-slate-400">{species}</span>
            </div>
          </div>
        </div>
      );
    }

    // Sub-renderer for CatFact
    if (api.id === 'catfact' && sourceData) {
      const fact = sourceData.fact || '';
      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-3 -top-3 text-4xl opacity-10">🐱</div>
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest">Fato Científico de Felinos</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'AO VIVO' : 'MOCK'}</span>
            </div>
            <p className="text-xs text-slate-300 italic font-mono leading-relaxed line-clamp-4">
              "{fact}"
            </p>
          </div>
        </div>
      );
    }

    // Sub-renderer for CoinDesk (Bitcoin)
    if (api.id === 'coindesk' && sourceData) {
      const bpi = sourceData.bpi || {};
      const usdRate = bpi.USD?.rate || 'N/A';
      const eurRate = bpi.EUR?.rate || 'N/A';

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-2 top-2 text-yellow-500/20 text-3xl font-bold">₿</div>
          <div>
            <div className="flex justify-between items-center mb-2 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono font-bold text-yellow-400 uppercase tracking-widest">Preço do Bitcoin (USD/EUR)</span>
              <span className="text-[9px] bg-slate-900 px-1.5 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-mono">Cotação USD:</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">${usdRate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-mono">Cotação EUR:</span>
                <span className="text-sm font-bold text-yellow-400 font-mono">€{eurRate}</span>
              </div>
            </div>
          </div>
          <p className="text-[9px] text-slate-500 font-mono">Atualizado no servidor a cada 60s</p>
        </div>
      );
    }

    // Sub-renderer for RestCountries
    if (api.id === 'restcountries' && sourceData) {
      // API payload can be in object or in single element array because RESTCountries returns items in array
      const item = Array.isArray(sourceData) ? sourceData[0] : sourceData;
      const commonName = item?.name?.common || 'Desconhecido';
      const officialName = item?.name?.official || 'Desconhecido';
      const capital = item?.capital?.[0] || 'N/A';
      const region = item?.region || 'N/A';
      const population = item?.population ? Number(item.population).toLocaleString() : 'N/A';
      const flagPng = item?.flags?.png || '';

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex items-center gap-3.5">
          {flagPng && (
            <div className="w-14 h-10 border border-slate-800 rounded bg-slate-900 flex-shrink-0 overflow-hidden shadow">
              <img src={flagPng} alt={commonName} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] text-sky-400 font-mono font-bold uppercase">Atlas Geográfico</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'VIVO' : 'MOCK'}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate">{commonName} ({officialName})</h4>
            <p className="text-[10px] text-slate-400 font-mono">Capital: {capital} · Continente: {region}</p>
            <p className="text-[10px] text-cyan-400 font-mono">População: {population} hab.</p>
          </div>
        </div>
      );
    }

    // Sub-renderer for Nager.Date
    if (api.id === 'nagerdate' && sourceData) {
      const holidays = Array.isArray(sourceData) ? sourceData.slice(0, 3) : [];

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest">Calendário de Feriados</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'DINO' : 'MOCK'}</span>
            </div>
            <div className="space-y-1">
              {holidays.length > 0 ? holidays.map((h: any, i: number) => (
                <div key={i} className="flex justify-between text-[10px] font-mono border-b border-slate-900/50 pb-1">
                  <span className="text-slate-400 font-sans truncate pr-2 max-w-[170px]">{h.localName || h.name}</span>
                  <span className="text-indigo-400 shrink-0">{h.date}</span>
                </div>
              )) : (
                <p className="text-slate-500 text-[10px] font-mono">Sem feriados mapeados nesta consulta</p>
              )}
            </div>
          </div>
          <p className="text-[9px] text-slate-500 text-right mt-1">Nager.Date v3 API</p>
        </div>
      );
    }

    // Sub-renderer for GitHub Users
    if (api.id === 'github' && sourceData) {
      const login = sourceData.login || 'Desconhecido';
      const name = sourceData.name || '';
      const avatar = sourceData.avatar_url || '';
      const repos = sourceData.public_repos ?? 0;
      const followers = sourceData.followers ?? 0;
      const bio = sourceData.bio || 'Sem biografia disponível.';
      const blog = sourceData.blog || '';

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex items-center gap-4">
          {avatar && (
            <img src={avatar} alt={login} className="w-14 h-14 rounded-full border border-teal-500/30 shrink-0" referrerPolicy="no-referrer" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono text-teal-400 font-bold uppercase tracking-wider">Perfil do Github</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <h4 className="text-xs font-black text-white hover:underline truncate">{name || login}</h4>
            <p className="text-[10px] text-slate-400 font-mono truncate">@{login}</p>
            <p className="text-[11px] text-slate-300 line-clamp-2 mt-1 leading-tight">{bio}</p>
            <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-teal-400/90">
              <span>Repos: <strong className="text-white">{repos}</strong></span>
              <span>Seguidores: <strong className="text-white">{followers}</strong></span>
            </div>
          </div>
        </div>
      );
    }

    // Sub-renderer for NASA APOD
    if (api.id === 'nasa-apod' && sourceData) {
      const title = sourceData.title || 'Foto do Dia NASA';
      const url = sourceData.url || '';
      const date = sourceData.date || '';
      const explanation = sourceData.explanation || '';

      return (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-100 min-h-[140px] flex items-center gap-3.5 relative overflow-hidden">
          {url && (
            <div className="w-16 h-20 rounded bg-slate-900 border border-slate-800 flex-shrink-0 overflow-hidden shadow">
              <img src={url} alt={title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono text-violet-400 font-bold uppercase tracking-wider">Astronomia NASA APOD</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate">{title}</h4>
            <span className="text-[9px] text-slate-500 font-mono">{date}</span>
            <p className="text-[10px] text-slate-400 line-clamp-3 leading-snug mt-1 italic">{explanation}</p>
          </div>
        </div>
      );
    }

    // Sub-renderer for JokeAPI
    if (api.id === 'jokeapi' && sourceData) {
      const category = sourceData.category || 'Humor';
      const jokeText = sourceData.joke || (sourceData.setup ? `${sourceData.setup}\n\n-> ${sourceData.delivery}` : '');

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-3.5 top-3 text-2xl opacity-10">🎭</div>
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">JokeAPI: {category}</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <p className="text-xs text-slate-300 italic font-mono leading-relaxed line-clamp-4">
              "{jokeText}"
            </p>
          </div>
        </div>
      );
    }

    // Sub-renderer for Yu-Gi-Oh Cards
    if (api.id === 'yugioh' && sourceData) {
      const cardArray = sourceData.data || [];
      const card = cardArray[0] || {};
      const cardName = card.name || 'Carta Yu-Gi-Oh';
      const cardType = card.type || 'Normal Monster';
      const cardDesc = card.desc || 'Sem texto de descrição.';
      const imageUrl = card.card_images?.[0]?.image_url || '';

      return (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-100 min-h-[140px] flex items-center gap-3">
          {imageUrl && (
            <div className="w-12 h-18 bg-slate-900 border border-slate-800 rounded shrink-0 overflow-hidden">
              <img src={imageUrl} alt={cardName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono text-amber-500 font-bold uppercase tracking-wider">Duel Card Database</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate">{cardName}</h4>
            <span className="text-[9px] bg-amber-950/40 text-amber-300 border border-amber-900/30 px-1 py-0.2 rounded font-mono font-bold uppercase">{cardType}</span>
            <p className="text-[10px] text-slate-400 line-clamp-3 leading-snug mt-1.5 font-sans">{cardDesc}</p>
          </div>
        </div>
      );
    }

    // Sub-renderer for Universities Global
    if (api.id === 'universities' && sourceData) {
      const uniList = Array.isArray(sourceData) ? sourceData.slice(0, 2) : [];

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5 font-mono">
              <span className="text-[9px] text-rose-400 font-bold uppercase tracking-wider">Universidades do País</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <div className="space-y-1.5">
              {uniList.length > 0 ? uniList.map((uni: any, i: number) => {
                const website = uni.web_pages?.[0] || '#';
                return (
                  <div key={i} className="text-[11px] leading-tight">
                    <p className="font-semibold text-slate-200 truncate">{uni.name}</p>
                    <a href={website} target="_blank" rel="noreferrer" className="text-[10px] font-mono text-cyan-400 hover:underline truncate block">
                      {website}
                    </a>
                  </div>
                );
              }) : (
                <p className="text-slate-500 text-[10px] font-mono">Sem dados para este país.</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Sub-renderer for Nationalize.io
    if (api.id === 'nationalize' && sourceData) {
      const name = sourceData.name || '';
      const countriesList = sourceData.country || [];

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-wider">Adivinho Geográfico de Nomes</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-mono">Nome avaliado: <span className="text-white font-bold font-sans uppercase">"{name}"</span></p>
              {countriesList.slice(0, 2).map((c: any, i: number) => {
                const percent = Math.round(c.probability * 100);
                return (
                  <div key={i} className="space-y-0.5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span>País: <strong className="text-indigo-300">{c.country_id}</strong></span>
                      <span>{percent}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Sub-renderer for SWAPI (Star Wars)
    if (api.id === 'swapi' && sourceData) {
      const charName = sourceData.name || 'Luke Skywalker';
      const height = sourceData.height || '?';
      const mass = sourceData.mass || '?';
      const gender = sourceData.gender || '?';
      const birth = sourceData.birth_year || '?';

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono text-yellow-400 font-bold uppercase tracking-wider">Banco de Dados Star Wars (SWAPI)</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <p className="text-sm font-black text-white font-display mb-1">{charName}</p>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
              <div className="bg-slate-900 p-1.5 rounded border border-slate-850/60">
                <span className="text-slate-500">Altura:</span> <span className="text-yellow-400 font-bold">{height} cm</span>
              </div>
              <div className="bg-slate-900 p-1.5 rounded border border-slate-850/60">
                <span className="text-slate-500">Massa:</span> <span className="text-yellow-400 font-bold">{mass} kg</span>
              </div>
              <div className="bg-slate-900 p-1.5 rounded border border-slate-850/60">
                <span className="text-slate-500">Gênero:</span> <span className="text-yellow-400 font-bold capitalize">{gender}</span>
              </div>
              <div className="bg-slate-900 p-1.5 rounded border border-slate-850/60">
                <span className="text-slate-500">Ano Nasc:</span> <span className="text-yellow-400 font-bold">{birth}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Sub-renderer for SpaceX API
    if (api.id === 'spacex' && sourceData) {
      const missionName = sourceData.name || 'Lançamento SpaceX';
      const flightNumber = sourceData.flight_number || '?';
      const success = sourceData.success !== false;
      const details = sourceData.details || 'Sem descrição complementar disponível.';
      const patchImg = sourceData.links?.patch?.small || '';

      return (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-100 min-h-[140px] flex items-center gap-3">
          {patchImg ? (
            <div className="w-14 h-14 bg-slate-900 rounded border border-slate-800 p-1 flex-shrink-0 flex items-center justify-center">
              <img src={patchImg} alt={missionName} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-14 h-14 bg-slate-900 rounded border border-slate-800 flex-shrink-0 flex items-center justify-center text-xl">
              🚀
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wider">Exploração Espacial SpaceX</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate">{missionName} (Voo #{flightNumber})</h4>
            <span className={`inline-block text-[8px] font-bold px-1 py-0.2 rounded uppercase mt-0.5 border ${
              success ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' : 'bg-rose-950/40 text-rose-400 border-rose-900/30'
            }`}>
              {success ? 'SUCESSO' : 'FALHA / ADIADO'}
            </span>
            <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 italic">{details}</p>
          </div>
        </div>
      );
    }

    // Sub-renderer for Frankfurter Currency
    if (api.id === 'frankfurter' && sourceData) {
      const baseCurr = sourceData.base || 'USD';
      const amount = sourceData.amount || 1.0;
      const rates = sourceData.rates || {};
      const ratesList = Object.entries(rates).slice(0, 3);

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">Cotação Cambial Frankfurter</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <p className="text-[11px] font-mono mb-2">Base: <strong className="text-white">{amount} {baseCurr}</strong></p>
            <div className="grid grid-cols-3 gap-2">
              {ratesList.map(([curr, val]: any) => (
                <div key={curr} className="bg-slate-900 p-1.5 rounded border border-slate-850 text-center">
                  <span className="text-[9px] font-mono text-slate-500 font-bold block">{curr}</span>
                  <span className="text-xs font-black text-emerald-400 font-mono">
                    {val ? Number(val).toFixed(2) : '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Sub-renderer for D&D 5e Monsters
    if (api.id === 'dnd5e' && sourceData) {
      const name = sourceData.name || 'Criatura';
      const size = sourceData.size || 'Medium';
      const type = sourceData.type || 'monster';
      const alignment = sourceData.alignment || 'neutral';
      const hitPoints = sourceData.hit_points || '?';
      const armor = Array.isArray(sourceData.armor_class) ? sourceData.armor_class[0]?.value : (sourceData.armor_class || '?');

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono text-amber-500 font-bold uppercase tracking-wider">Compêndio de Monstros D&D 5e</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <h4 className="text-sm font-black text-rose-400 font-display truncate mb-0.5">{name}</h4>
            <p className="text-[10px] text-slate-400 capitalize mb-2">{size} {type} · {alignment}</p>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                <span className="text-slate-500">Vida (HP):</span> <strong className="text-red-400">{hitPoints}</strong>
              </div>
              <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                <span className="text-slate-500">Classe Armadura (CA):</span> <strong className="text-cyan-400">{armor}</strong>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Sub-renderer for Disney API characters
    if (api.id === 'disney' && sourceData) {
      // Dynamic lists can be array or object-enclosed.
      const char = Array.isArray(sourceData.data) ? sourceData.data[0] : (sourceData.data || sourceData);
      const name = char?.name || 'Carregando...';
      const img = char?.imageUrl || '';
      const films = char?.films || [];

      return (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-100 min-h-[140px] flex items-center gap-3.5">
          {img ? (
            <div className="w-14 h-14 rounded-full border border-pink-500/20 shadow overflow-hidden shrink-0">
              <img src={img} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-14 h-14 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center shrink-0 text-xl">
              🎬
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono text-pink-400 font-bold uppercase tracking-wider">Universo de Animações Disney</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate">{name}</h4>
            {films.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {films.slice(0, 2).map((film: string, i: number) => (
                  <span key={i} className="bg-pink-950/40 text-pink-300 border border-pink-900/40 text-[9px] font-bold px-1.5 py-0.5 rounded truncate max-w-[120px]">
                    {film}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-505 font-mono italic mt-1">Nenhuma participação listada</p>
            )}
          </div>
        </div>
      );
    }

    // Sub-renderer for Agify (Estimador de Idade)
    if (api.id === 'agify' && sourceData) {
      const name = sourceData.name || '';
      const age = sourceData.age || 0;

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono text-violet-400 font-bold uppercase tracking-wider">Estimador de Idade Agify.io</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <p className="text-xs text-slate-400 font-mono mb-2">Primeiro nome consultado: <strong className="text-white uppercase font-sans">"{name}"</strong></p>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-850 flex items-center gap-3">
              <span className="text-3xl font-black text-violet-400 font-display">{age}</span>
              <div className="text-[10px] leading-tight">
                <p className="text-slate-200 font-bold">Idade Média Estimada</p>
                <span className="text-slate-500">Mapeado estatisticamente na base pública</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Sub-renderer for Open Library Book Search
    if (api.id === 'openlibrary' && sourceData) {
      const isSearchPayload = sourceData.docs && Array.isArray(sourceData.docs);
      const book = isSearchPayload ? sourceData.docs[0] : sourceData;
      const title = book?.title || 'Carregando livro...';
      const year = book?.first_publish_year || book?.publish_date || '?';
      const author = book?.author_name?.[0] || 'Desconhecido';
      const coverId = book?.cover_i;
      const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : '';

      return (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-100 min-h-[140px] flex items-center gap-3">
          {coverUrl ? (
            <div className="w-12 h-18 bg-slate-900 border border-slate-800 rounded overflow-hidden shrink-0">
              <img src={coverUrl} alt={title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-12 h-18 bg-slate-900 border border-slate-800 rounded flex items-center justify-center shrink-0 text-xl">
              📚
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-wider">Biblioteca Mundial Aberta</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate">{title}</h4>
            <p className="text-[10px] text-slate-400 font-mono">Autor: <span className="text-indigo-300 font-sans">{author}</span></p>
            <p className="text-[10px] text-slate-500 font-mono">Publicação: {year}</p>
          </div>
        </div>
      );
    }

    // Sub-renderer for IPAPI (Geolocalização de IP)
    if (api.id === 'ipapi' && sourceData) {
      const ip = sourceData.ip || '0.0.0.0';
      const city = sourceData.city || 'Desconhecido';
      const country = sourceData.country_name || 'Desconhecido';
      const region = sourceData.region || '';
      const timezone = sourceData.timezone || '?';
      const org = sourceData.org || 'Provedor Desconhecido';

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wider">📍 Geolocalização Real por IP</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <p className="text-sm font-black text-white font-mono mt-0.5">IP: {ip}</p>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono mt-1.5">
              <div className="bg-slate-900 p-1 rounded border border-slate-850">
                <span className="text-slate-500">Local:</span> <span className="text-cyan-300 font-bold">{city}, {country}</span>
              </div>
              <div className="bg-slate-900 p-1 rounded border border-slate-850">
                <span className="text-slate-500">Estado/UF:</span> <span className="text-cyan-300 font-bold">{region}</span>
              </div>
              <div className="bg-slate-900 p-1 rounded border border-slate-850 truncate">
                <span className="text-slate-500">Fuso:</span> <span className="text-cyan-300 font-bold">{timezone}</span>
              </div>
              <div className="bg-slate-900 p-1 rounded border border-slate-850 truncate">
                <span className="text-slate-500">Provedor:</span> <span className="text-cyan-300 font-bold">{org}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Sub-renderer for Genderize.io
    if (api.id === 'genderize' && sourceData) {
      const name = sourceData.name || '';
      const gender = sourceData.gender || 'unknown';
      const prob = Math.round((sourceData.probability || 0) * 100);

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono text-pink-400 font-bold uppercase tracking-wider">🧠 Preditor de Gênero Demográfico</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <p className="text-[11px] font-mono">Nome analisado: <span className="text-white font-bold font-sans uppercase">"{name}"</span></p>
            <div className="mt-2.5 bg-slate-900 p-2.5 rounded border border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{gender === 'male' ? '🙋‍♂️' : gender === 'female' ? '🙋‍♀️' : '❓'}</span>
                <div>
                  <p className="text-xs font-bold text-white uppercase">{gender === 'male' ? 'Masculino' : gender === 'female' ? 'Feminino' : 'Não identificado'}</p>
                  <span className="text-[9px] text-slate-500">Gênero Inferido</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-pink-400 font-mono">{prob}%</p>
                <span className="text-[9px] text-slate-500 block">Probabilidade</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Sub-renderer for CoinCap Assets
    if (api.id === 'coincap' && sourceData) {
      const rawAssets = Array.isArray(sourceData.data) ? sourceData.data : [];
      const assets = rawAssets.slice(0, 3);

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">🪙 Moedas de Topo (CoinCap)</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <div className="space-y-1.5">
              {assets.map((coin: any) => {
                const usd = coin.priceUsd ? Number(coin.priceUsd) : 0;
                return (
                  <div key={coin.id} className="flex justify-between items-center text-[11px] font-mono bg-slate-900/60 p-1 px-2 rounded border border-slate-850/40">
                    <span className="text-slate-300 font-bold">{coin.symbol} · <span className="text-[10px] text-slate-505 font-sans font-normal">{coin.name}</span></span>
                    <span className="text-emerald-400 font-bold">
                      ${usd > 1 ? usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : usd.toFixed(4)}
                    </span>
                  </div>
                );
              })}
              {assets.length === 0 && (
                <p className="text-slate-500 text-[10px] font-mono">Nenhuma criptomoeda retornada.</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Sub-renderer for Zippopotam
    if (api.id === 'zippopotam' && sourceData) {
      const places = sourceData.places || [];
      const place = places[0] || {};
      const postcode = sourceData['post code'] || 'CEP';
      const country = sourceData.country || 'Desconhecido';

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-wider">🌍 Geolocalização Postal Zippopotam</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <p className="text-[11px] font-mono leading-tight">CEP consultado: <span className="text-yellow-400 font-bold font-sans">{postcode}</span></p>
            <p className="text-[10px] text-slate-400 italic">País: {country}</p>
            {place['place name'] ? (
              <div className="bg-slate-900 border border-slate-850 p-2 rounded mt-2 text-[10px] font-mono">
                <span className="text-slate-500 font-sans font-semibold">Endereço aproximado:</span>
                <p className="text-white font-sans font-bold mt-0.5 leading-tight">{place['place name']}, {place.state} ({place['state abbreviation']})</p>
                <div className="flex gap-2 text-[9px] text-indigo-300 mt-1">
                  <span>Lat: {place.latitude}</span>
                  <span>Lon: {place.longitude}</span>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-[10px] font-mono mt-1">Digite um CEP válido e selecione o atalho.</div>
            )}
          </div>
        </div>
      );
    }

    // Sub-renderer for Useless Facts
    if (api.id === 'uselessfacts' && sourceData) {
      const text = sourceData.text || 'Nenhum fato engraçado disponível no momento.';

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-3.5 top-3.5 text-2xl opacity-10">🧼</div>
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono text-violet-400 font-bold uppercase tracking-wider">💡 Fato Inútil Real Destravado</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <p className="text-xs text-slate-300 italic font-mono leading-relaxed line-clamp-4">
              "{text}"
            </p>
          </div>
        </div>
      );
    }

    // Sub-renderer for Magic: The Gathering
    if (api.id === 'magicthegathering' && sourceData) {
      const cards = Array.isArray(sourceData.cards) ? sourceData.cards : [];
      const card = cards[0] || {};
      const cardName = card.name || 'Black Lotus';
      const cardType = card.type || 'Artifact';
      const rarity = card.rarity || 'Rare';
      const text = card.text || 'Sem regras descritas.';
      const img = card.imageUrl || '';

      return (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-100 min-h-[140px] flex items-center gap-3">
          {img ? (
            <div className="w-12 h-18 bg-slate-900 border border-slate-800 rounded shrink-0 overflow-hidden shadow">
              <img src={img} alt={cardName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-12 h-18 bg-slate-900 border border-slate-800 rounded flex items-center justify-center shrink-0 text-xl">
              🃏
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono text-rose-500 font-bold uppercase tracking-wider">Magic: The Gathering</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate">{cardName}</h4>
            <span className="text-[9px] text-slate-400 font-mono capitalize">{cardType} · <span className="text-rose-400 font-bold">{rarity}</span></span>
            <p className="text-[9px] text-slate-400 line-clamp-2 mt-1 leading-snug">{text}</p>
          </div>
        </div>
      );
    }

    // Sub-renderer for Studio Ghibli Films
    if (api.id === 'ghibli' && sourceData) {
      const limitList = Array.isArray(sourceData) ? sourceData : [sourceData];
      const film = limitList[0] || {};
      const title = film.title || 'Filme Ghibli';
      const originalTitle = film.original_title || '';
      const director = film.director || 'Hayao Miyazaki';
      const description = film.description || 'Nenhuma descrição complementar disponível.';
      const filmImg = film.image || '';
      const score = film.rt_score || '90';

      return (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-100 min-h-[140px] flex gap-3.5 relative overflow-hidden">
          {filmImg ? (
            <div className="w-14 h-20 bg-slate-900 border border-slate-800 rounded shadow overflow-hidden shrink-0">
              <img src={filmImg} alt={title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-14 h-20 bg-slate-900 border border-slate-800 rounded flex items-center justify-center shrink-0 text-xl">
              🌲
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">Animações Studio Ghibli</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate">{title}</h4>
            <span className="text-[9px] text-slate-500 font-mono block">{originalTitle} · Dir: {director}</span>
            <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-tight">{description}</p>
            <span className="inline-block mt-1 bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 text-[9px] font-bold px-1.5 py-0.2 rounded">
              🍅 RT Score: {score}%
            </span>
          </div>
        </div>
      );
    }

    // Sub-renderer for Open Trivia DB
    if (api.id === 'opentdb' && sourceData) {
      const results = Array.isArray(sourceData.results) ? sourceData.results : [];
      const trivia = results[0] || {};
      const category = trivia.category || 'Conhecimentos Gerais';
      const difficulty = trivia.difficulty || 'easy';
      const question = trivia.question ? trivia.question.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&') : 'Nenhuma questão retornada.';
      const correctAnswer = trivia.correct_answer || 'Sem resposta';

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-850">
              <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wider">💡 Open Trivia Game Quiz</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <span className="text-[8px] font-mono text-slate-500 uppercase">Categoria: {category} · Dif: {difficulty}</span>
            <p className="text-[11px] text-slate-300 mt-1 line-clamp-3 leading-snug">{question}</p>
          </div>
          <div className="bg-slate-900/60 p-1.5 px-2.5 rounded border border-slate-850 text-[10px] font-mono flex items-center justify-between mt-2">
            <span className="text-slate-500">Resposta Correta:</span>
            <strong className="text-cyan-400">{correctAnswer}</strong>
          </div>
        </div>
      );
    }

    // Sub-renderer for Numbers API
    if (api.id === 'numbers' && sourceData) {
      const text = sourceData.text || 'Nenhum fato sobre número processado.';
      const num = sourceData.number !== undefined ? sourceData.number : '?';
      const type = sourceData.type || 'trivia';

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-wider">🌀 Números & Fatos Matemáticos</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <p className="text-[11px] font-mono leading-tight">Número avaliado: <span className="text-white font-bold text-xs uppercase">"{num}"</span> <span className="text-[8px] bg-indigo-950 text-indigo-300 px-1 py-0.2 rounded uppercase ml-1">{type}</span></p>
            <p className="text-xs text-slate-300 leading-normal line-clamp-3 italic mt-2 ml-1">
              "{text}"
            </p>
          </div>
        </div>
      );
    }

    // Sub-renderer for The Cocktail DB
    if (api.id === 'thecocktaildb' && sourceData) {
      const rawDrinks = Array.isArray(sourceData.drinks) ? sourceData.drinks : [];
      const drink = rawDrinks[0] || {};
      const name = drink.strDrink || 'Coquetel';
      const category = drink.strCategory || 'Coquetel Comum';
      const glass = drink.strGlass || 'Copo Taça';
      const isAlc = drink.strAlcoholic || 'Alcoólico';
      const thumb = drink.strDrinkThumb || '';
      const instructions = drink.strInstructions || 'Sem instruções de preparo.';

      return (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-100 min-h-[140px] flex gap-3.5 relative overflow-hidden">
          {thumb ? (
            <div className="w-16 h-20 bg-slate-900 border border-slate-800 rounded shadow overflow-hidden shrink-0">
              <img src={thumb} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-16 h-20 bg-slate-900 border border-slate-800 rounded flex items-center justify-center shrink-0 text-xl">
              🍹
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono text-amber-500 font-bold uppercase tracking-wider">🍹 Coquetéis & Barman Digital</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate">{name}</h4>
            <span className="text-[9px] text-slate-500 font-mono block leading-tight">{category} ({isAlc}) · Copo: {glass}</span>
            <p className="text-[10px] text-slate-300 line-clamp-2 mt-1 leading-tight italic font-mono">Preparo: {instructions}</p>
          </div>
        </div>
      );
    }

    // Sub-renderer for HP-API (Harry Potter)
    if (api.id === 'hpapi' && sourceData) {
      const characters = Array.isArray(sourceData) ? sourceData : [sourceData];
      const hp = characters[0] || {};
      const name = hp.name || 'Harry Potter';
      const house = hp.house || 'Grifinória';
      const actor = hp.actor || 'Daniel Radcliffe';
      const photo = hp.image || '';
      const ancestry = hp.ancestry || '';
      
      return (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-100 min-h-[140px] flex items-center gap-3.5 relative overflow-hidden">
          {photo ? (
            <div className="w-14 h-20 bg-slate-900 border border-slate-800 rounded shadow overflow-hidden shrink-0">
              <img src={photo} alt={name} className="w-full h-full object-cover object-top" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-14 h-20 bg-slate-900 border border-slate-800 rounded flex items-center justify-center shrink-0 text-xl">
              🧙‍♂️
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono text-violet-400 font-bold uppercase tracking-wider font-display">Cast de Magos Hogwarts</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate">{name}</h4>
            <span className="text-[9px] text-slate-400 font-mono italic block mt-0.5">Ator: <span className="text-violet-300 font-sans font-normal">{actor}</span></span>
            <div className="flex flex-wrap gap-1 mt-1.5 text-[9px]">
              {house && (
                <span className="bg-violet-950/40 text-violet-300 border border-violet-900/30 px-1.5 py-0.5 rounded font-semibold font-mono">
                  🦁 {house}
                </span>
              )}
              {ancestry && (
                <span className="bg-slate-900 text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                  🩸 {ancestry}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Sub-renderer for Free To Game
    if (api.id === 'freetogame' && sourceData) {
      const list = Array.isArray(sourceData) ? sourceData : [];
      const game = list[0] || {};
      const title = game.title || 'Overwatch 2';
      const genre = game.genre || 'Shooter';
      const platform = game.platform || 'PC';
      const publisher = game.publisher || 'Blizzard';
      const thumb = game.thumbnail || '';
      const summary = game.short_description || 'Jogue grátis agora.';

      return (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-100 min-h-[140px] flex items-center gap-3">
          {thumb ? (
            <div className="w-18 h-12 bg-slate-900 border border-slate-800 rounded overflow-hidden shadow shrink-0">
              <img src={thumb} alt={title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-18 h-12 bg-slate-900 border border-slate-800 rounded flex items-center justify-center shrink-0 text-xl">
              🎮
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wider">Catálogo Game Index Livre</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate">{title}</h4>
            <span className="text-[9px] text-slate-500 font-mono block">{genre} · {platform}</span>
            <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-tight">{summary}</p>
          </div>
        </div>
      );
    }

    // Sub-renderer for Pokémon (PokéAPI)
    if (api.id === 'pokemon' && sourceData) {
      const name = sourceData.name || 'Pikachu';
      const id = sourceData.id || '?';
      const height = sourceData.height ? (sourceData.height / 10).toFixed(1) : '?';
      const weight = sourceData.weight ? (sourceData.weight / 10).toFixed(1) : '?';
      const typesList = Array.isArray(sourceData.types) ? sourceData.types : [];
      const image = sourceData.sprites?.other?.['official-artwork']?.front_default || sourceData.sprites?.front_default || '';

      return (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-100 min-h-[140px] flex items-center gap-3">
          {image ? (
            <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center p-1 shrink-0 overflow-hidden shadow">
              <img src={image} alt={name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center shrink-0 text-xl">
              ⚡
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono text-yellow-500 font-bold uppercase tracking-wider">PokéAPI: # {id}</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate capitalize">{name}</h4>
            <div className="flex flex-wrap gap-1 mt-1">
              {typesList.map((t: any, idx: number) => {
                const typeName = t.type?.name || 'normal';
                return (
                  <span key={idx} className="bg-yellow-950/40 text-yellow-400 border border-yellow-900/30 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase font-mono">
                    {typeName}
                  </span>
                );
              })}
            </div>
            <div className="flex gap-3 text-[10px] font-mono text-slate-400 mt-2">
              <span>Alt: <strong className="text-white">{height} m</strong></span>
              <span>Peso: <strong className="text-white">{weight} kg</strong></span>
            </div>
          </div>
        </div>
      );
    }

    // Sub-renderer for Rick & Morty API
    if (api.id === 'rickandmorty' && sourceData) {
      const name = sourceData.name || 'Rick Sanchez';
      const status = sourceData.status || 'Alive';
      const species = sourceData.species || 'Human';
      const gender = sourceData.gender || 'Male';
      const image = sourceData.image || '';
      const origin = sourceData.origin?.name || 'Terra';

      return (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-100 min-h-[140px] flex items-center gap-3.5">
          {image ? (
            <div className="w-14 h-14 rounded-full border border-teal-500/20 shadow overflow-hidden shrink-0">
              <img src={image} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-14 h-14 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center shrink-0 text-xl">
              🧪
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono text-teal-400 font-bold uppercase tracking-wider">Rick & Morty Cast</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate">{name}</h4>
            <span className="text-[9px] text-slate-500 font-mono block truncate">Espécie: {species} ({gender}) · Origem: {origin}</span>
            <span className={`inline-block mt-1 text-[8px] font-bold px-1.5 py-0.2 rounded uppercase border ${
              status === 'Alive' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' : 'bg-rose-950/40 text-rose-400 border-rose-900/30'
            }`}>
              📡 Status: {status === 'Alive' ? 'VIVO' : 'MORTO / DESCONHECIDO'}
            </span>
          </div>
        </div>
      );
    }

    // Sub-renderer for Dog API
    if (api.id === 'dogapi' && sourceData) {
      const url = sourceData.message || '';

      // Try parsing breed name out of url
      let breed = 'Fofo';
      if (url) {
        try {
          const parts = url.split('/breeds/');
          if (parts[1]) {
            breed = parts[1].split('/')[0].replace('-', ' ');
          }
        } catch (e) {
          // ignore
        }
      }

      return (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-100 min-h-[140px] flex items-center gap-3">
          {url ? (
            <div className="w-16 h-20 bg-slate-900 border border-slate-800 rounded overflow-hidden shrink-0 shadow">
              <img src={url} alt="Doggy" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-16 h-20 bg-slate-900 border border-slate-800 rounded flex items-center justify-center shrink-0 text-xl">
              🐶
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-wider">Cão do Dia (Dog CEO)</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <span className="text-[10px] uppercase font-mono text-indigo-300 font-bold">Raça Estimada:</span>
            <h4 className="text-xs font-black text-white capitalize truncate">{breed}</h4>
            <p className="text-[10px] text-slate-400 mt-1">Carregue diferentes fotos aleatórias a cada requisição!</p>
          </div>
        </div>
      );
    }

    // Sub-renderer for Cat Facts
    if (api.id === 'catfacts' && sourceData) {
      const fact = sourceData.fact || 'Fatos engraçados indisponíveis hoje.';

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-3.5 top-3 text-2xl opacity-10">🐈</div>
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono text-orange-400 font-bold uppercase tracking-wider">💡 Catfact.ninja: Felinos</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <p className="text-xs text-slate-300 italic font-mono leading-relaxed line-clamp-4">
              "{fact}"
            </p>
          </div>
        </div>
      );
    }

    // Sub-renderer for Rest Countries API
    if (api.id === 'restcountries' && sourceData) {
      // It returns an array of matching countries
      const cList = Array.isArray(sourceData) ? sourceData : [];
      const country = cList[0] || {};
      const commonName = country.name?.common || 'Nome do País';
      const officialName = country.name?.official || '';
      const capital = Array.isArray(country.capital) ? country.capital[0] : (country.capital || '?');
      const region = country.region || 'Desconhecida';
      const subregion = country.subregion || '';
      const population = country.population ? Number(country.population).toLocaleString('pt-BR') : '?';
      const flagUrl = country.flags?.png || '';

      return (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-100 min-h-[140px] flex items-center gap-3.5 relative overflow-hidden">
          {flagUrl ? (
            <div className="w-16 h-11 bg-slate-900 border border-slate-800 rounded shadow overflow-hidden shrink-0">
              <img src={flagUrl} alt={commonName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-16 h-11 bg-slate-900 border border-slate-800 rounded flex items-center justify-center shrink-0 text-xl">
              🚩
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono text-amber-500 font-bold uppercase tracking-wider">Rest Countries Mundial</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate">{commonName}</h4>
            <p className="text-[10px] text-slate-400 font-mono block truncate">Capital: {capital} · Continente: {region}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">População aproximada: <strong className="text-amber-300 font-sans">{population} hab.</strong></p>
          </div>
        </div>
      );
    }

    // Sub-renderer for HTTP Cats
    if (api.id === 'httpcat' && sourceData) {
      // Find dynamic code of target content
      const pathParams = cardPathParams[api.id] || {};
      const pathValue = hasLiveResult ? (pathParams.status_code || "404") : "404";
      const actualCode = String(sourceData.status || pathValue || "404").trim();
      const imageUrl = `https://http.cat/${actualCode}.jpg`;

      return (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-100 min-h-[140px] flex items-center gap-3.5 relative overflow-hidden">
          <div className="w-18 h-18 bg-slate-900 border border-slate-800 rounded shadow overflow-hidden shrink-0">
            <img src={imageUrl} alt="HTTP Cat" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">Status HTTP Mapeado por Gatos</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <h4 className="text-xs font-black text-white">HTTP {actualCode}</h4>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Uma foto personalizada de gatinho representa cada código de status.</p>
          </div>
        </div>
      );
    }

    // Sub-renderer for Random User Generator
    if (api.id === 'randomuser' && sourceData) {
      const results = Array.isArray(sourceData.results) ? sourceData.results : [];
      const user = results[0] || {};
      const titleName = user.name?.title || 'Ms';
      const firstName = user.name?.first || 'Ana';
      const lastName = user.name?.last || 'Silva';
      const email = user.email || 'ana.silva@example.com';
      const picture = user.picture?.large || user.picture?.medium || '';
      const location = user.location || {};
      const city = location.city || 'São Paulo';
      const country = location.country || 'Brazil';

      return (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-100 min-h-[140px] flex items-center gap-3.5 relative overflow-hidden">
          {picture ? (
            <div className="w-16 h-16 rounded-full border border-pink-500/20 shadow-lg overflow-hidden shrink-0">
              <img src={picture} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center shrink-0 text-xl">
              👩
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono text-pink-400 font-bold uppercase tracking-wider">Perfil Humano Fake</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate capitalize">{titleName}. {firstName} {lastName}</h4>
            <span className="text-[9px] text-pink-400/90 font-mono block truncate">{email}</span>
            <p className="text-[10px] text-slate-400 font-mono mt-1 leading-none">{city}, {country}</p>
          </div>
        </div>
      );
    }

    // Sub-renderer for Kitsu (Animes e Filmes)
    if (api.id === 'kitsu' && sourceData) {
      const gData = Array.isArray(sourceData.data) ? sourceData.data : [sourceData.data];
      const matchAnime = gData[0] || {};
      const attrs = matchAnime.attributes || {};
      const titleName = attrs.canonicalTitle || 'Anime';
      const rating = attrs.averageRating || '80';
      const synopsis = attrs.synopsis || 'Sem sinopse anexada.';
      const poster = attrs.posterImage?.small || attrs.posterImage?.tiny || '';

      return (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-100 min-h-[140px] flex gap-3 relative overflow-hidden">
          {poster ? (
            <div className="w-14 h-20 bg-slate-900 border border-slate-800 rounded shadow overflow-hidden shrink-0">
              <img src={poster} alt={titleName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-14 h-20 bg-slate-900 border border-slate-800 rounded flex items-center justify-center shrink-0 text-xl">
              🍥
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-wider">Kitsu Anime Collection</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate">{titleName}</h4>
            <p className="text-[9px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">{synopsis}</p>
            <span className="inline-block mt-1 bg-indigo-950/40 text-indigo-300 border border-indigo-900/30 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">
              ⭐ Nota: {rating} / 100
            </span>
          </div>
        </div>
      );
    }

    // Sub-renderer for Open Brewery DB
    if (api.id === 'openbrewery' && sourceData) {
      const rawBrews = Array.isArray(sourceData) ? sourceData : [sourceData];
      const brews = rawBrews.slice(0, 2);

      return (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono text-amber-500 font-bold uppercase tracking-wider">🍺 Open Brewery Directory</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <div className="space-y-1.5">
              {brews.map((brew: any, idx: number) => {
                const name = brew.name || 'Cervejaria';
                const city = brew.city || 'Desconhecida';
                const type = brew.brewery_type || 'micro';
                return (
                  <div key={idx} className="bg-slate-900 p-1.5 px-2 rounded border border-slate-850/40 text-[10px] font-mono flex justify-between items-center">
                    <span className="text-slate-200 font-bold truncate max-w-[150px]">{name}</span>
                    <span className="text-amber-400 shrink-0 text-[9px] uppercase font-bold">{city} ({type})</span>
                  </div>
                );
              })}
              {brews.length === 0 && (
                <p className="text-slate-500 text-[9px] font-mono">Nenhuma cervejaria correspondente retornada.</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Sub-renderer for Fruityvice
    if (api.id === 'fruityvice' && sourceData) {
      const name = sourceData.name || 'Fruta';
      const family = sourceData.family || 'Desconhecida';
      const order = sourceData.order || 'Desconhecido';
      const nutrients = sourceData.nutritions || {};
      const cals = nutrients.calories !== undefined ? nutrients.calories : '?';
      const carbs = nutrients.carbohydrates !== undefined ? nutrients.carbohydrates : '?';
      const sugar = nutrients.sugar !== undefined ? nutrients.sugar : '?';

      return (
        <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">🍌 Fruityvice: Nutrição Real</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🍇</span>
              <div>
                <h4 className="text-xs font-black text-white">{name}</h4>
                <p className="text-[8px] font-mono text-slate-500 uppercase">Família: {family} · Ordem: {order}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 mt-2 text-[9px] font-mono">
              <div className="bg-slate-900 p-1 rounded border border-slate-850 text-center">
                <span className="text-slate-500 block">Calorias:</span>
                <span className="text-emerald-400 font-bold">{cals} kcal</span>
              </div>
              <div className="bg-slate-900 p-1 rounded border border-slate-850 text-center">
                <span className="text-slate-500 block">Açúcar:</span>
                <span className="text-emerald-400 font-bold">{sugar}g</span>
              </div>
              <div className="bg-slate-900 p-1 rounded border border-slate-850 text-center">
                <span className="text-slate-500 block">Carboidratos:</span>
                <span className="text-emerald-400 font-bold">{carbs}g</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Sub-renderer for ZenQuotes
    if (api.id === 'zenquotes' && sourceData) {
      const list = Array.isArray(sourceData) ? sourceData : [sourceData];
      const matchQuote = list[0] || {};
      const quoteText = matchQuote.q || 'Há beleza simples em desfrutar de rotinas tranquilas de desenvolvimento.';
      const author = matchQuote.a || 'Sábio Anônimo';

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-3 top-3 text-3xl opacity-10 font-serif">“</div>
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-wider">🧘 ZenQuotes: Filosofia Diária</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <p className="text-xs text-slate-300 italic font-mono leading-relaxed line-clamp-3">
              "{quoteText}"
            </p>
          </div>
          <p className="text-right text-[10px] font-mono text-indigo-300 font-bold mt-1">— {author}</p>
        </div>
      );
    }

    // Sub-renderer for Bacon Ipsum
    if (api.id === 'baconipsum' && sourceData) {
      const paras = Array.isArray(sourceData) ? sourceData : ['Bacon ipsum dolor amet fatback bresaola tail jerky short loin salami.'];
      const paragraph = paras[0] || '';

      return (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-100 min-h-[140px] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-3.5 top-3 text-2xl opacity-10">🥓</div>
          <div>
            <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1.5">
              <span className="text-[9px] font-mono text-yellow-600 font-bold uppercase tracking-wider">🥩 Bacon Ipsum Gourmet Generator</span>
              <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">{hasLiveResult ? 'LIVE' : 'DEFAULT'}</span>
            </div>
            <p className="text-[10px] text-slate-300 font-mono leading-normal line-clamp-4">
              {paragraph}
            </p>
          </div>
        </div>
      );
    }

    const previewString = formatJson(sourceData);

    return (
      <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl min-h-[140px] flex flex-col justify-between relative">
        <div className="flex justify-between items-center mb-1.5 border-b border-slate-850 pb-1">
          <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase">ESTRUTURA DE RETORNO JSON</span>
          <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">
            {hasLiveResult ? 'VIVO' : 'MOCK'}
          </span>
        </div>
        <div className="flex-1 bg-slate-950 rounded overflow-auto outline-none max-h-[110px] pr-1">
          <pre className="text-[10px] font-mono text-emerald-400 leading-normal select-text whitespace-pre">
            {previewString}
          </pre>
        </div>
      </div>
    );
  };

  // Handle copy JSON clipboard
  const handleCopyJson = (apiId: string) => {
    const hasLiveResult = !!cardResults[apiId];
    const liveInfo = cardResults[apiId];
    const sourceData = hasLiveResult ? liveInfo.data : selectedApi?.sampleResponse;
    const jsonStr = formatJson(sourceData);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const baseList = allApis.length > 0 ? allApis : apiList;

  const categoryIndex = useMemo(() => {
    const subById: Record<string, string> = {};
    const parentById: Record<string, string> = {};
    const rawById: Record<string, string> = {};
    const parentCountMap = new Map<string, number>();
    const subCountByParent = new Map<string, Map<string, number>>();
    const rawCountMap = new Map<string, number>();
    const rawCountByParent = new Map<string, Map<string, number>>();

    for (const api of baseList) {
      const sub = getApiSubcategory(api);
      const parent = getApiParentCategory(api);
      const rawCategory = (api.category || "").trim() || "Sem categoria";

      subById[api.id] = sub;
      parentById[api.id] = parent;
      rawById[api.id] = rawCategory;

      parentCountMap.set(parent, (parentCountMap.get(parent) || 0) + 1);

      if (!subCountByParent.has(parent)) {
        subCountByParent.set(parent, new Map<string, number>());
      }
      const subMap = subCountByParent.get(parent)!;
      subMap.set(sub, (subMap.get(sub) || 0) + 1);

      rawCountMap.set(rawCategory, (rawCountMap.get(rawCategory) || 0) + 1);
      if (!rawCountByParent.has(parent)) {
        rawCountByParent.set(parent, new Map<string, number>());
      }
      const rawParentMap = rawCountByParent.get(parent)!;
      rawParentMap.set(rawCategory, (rawParentMap.get(rawCategory) || 0) + 1);
    }

    const categoryCards = CATEGORIES_MAP
      .map((cat) => ({
        name: cat.name,
        icon: cat.icon,
        count: parentCountMap.get(cat.name) || 0,
        subcategories: cat.subcategories
          .map((sub) => ({
            name: sub,
            count: subCountByParent.get(cat.name)?.get(sub) || 0
          }))
          .filter((sub) => sub.count > 0)
      }))
      .filter((cat) => cat.count > 0);

    const sortByCountDesc = (a: { name: string; count: number }, b: { name: string; count: number }) =>
      b.count - a.count || a.name.localeCompare(b.name, "pt-BR");

    const rawOptions = Array.from(rawCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort(sortByCountDesc);

    const rawOptionsByParent: Record<string, { name: string; count: number }[]> = {};
    for (const [parent, rawMap] of rawCountByParent.entries()) {
      rawOptionsByParent[parent] = Array.from(rawMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort(sortByCountDesc);
    }

    return {
      subById,
      parentById,
      rawById,
      categoryCards,
      rawOptions,
      rawOptionsByParent
    };
  }, [baseList]);

  const selectedCategorySubOptions = useMemo(() => {
    if (!selectedCategory) return [];
    return categoryIndex.categoryCards.find((cat) => cat.name === selectedCategory)?.subcategories || [];
  }, [selectedCategory, categoryIndex.categoryCards]);

  const activeRawOptionsSource = selectedCategory
    ? (categoryIndex.rawOptionsByParent[selectedCategory] || [])
    : categoryIndex.rawOptions;

  const rawCategoryMatches = useMemo(() => {
    const q = rawCategorySearch.trim().toLowerCase();
    if (!q) return activeRawOptionsSource;
    return activeRawOptionsSource.filter((option) => option.name.toLowerCase().includes(q));
  }, [activeRawOptionsSource, rawCategorySearch]);

  const rawCategoryPreview = rawCategoryMatches.slice(0, 18);
  const hiddenRawCategoryCount = Math.max(0, rawCategoryMatches.length - rawCategoryPreview.length);

  const filteredApis = useMemo(() => {
    let list = baseList;

    if (selectedCategory) {
      list = list.filter((api) => categoryIndex.parentById[api.id] === selectedCategory);
    }

    if (selectedSubcategory) {
      list = list.filter((api) => categoryIndex.subById[api.id] === selectedSubcategory);
    }

    if (selectedRawCategory) {
      list = list.filter((api) => categoryIndex.rawById[api.id] === selectedRawCategory);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((api) =>
        api.name.toLowerCase().includes(q) ||
        api.description.toLowerCase().includes(q) ||
        (categoryIndex.rawById[api.id] || "").toLowerCase().includes(q) ||
        (categoryIndex.subById[api.id] || "").toLowerCase().includes(q) ||
        (categoryIndex.parentById[api.id] || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [
    baseList,
    categoryIndex.parentById,
    categoryIndex.rawById,
    categoryIndex.subById,
    query,
    selectedCategory,
    selectedRawCategory,
    selectedSubcategory
  ]);

  useEffect(() => {
    setVisibleApiLimit(INITIAL_VISIBLE_APIS);
  }, [query, selectedCategory, selectedSubcategory, selectedRawCategory, baseList.length]);

  const visibleApis = useMemo(
    () => filteredApis.slice(0, visibleApiLimit),
    [filteredApis, visibleApiLimit]
  );

  const hasMoreVisibleApis = visibleApiLimit < filteredApis.length;

  // Render detail view layout when an API is selected
  if (selectedApi) {
    const api = selectedApi;
    const currentResult = cardResults[api.id];
    const ep = api.endpoints?.[0];
    const qParams = cardQueryParams[api.id] || {};
    const pParams = cardPathParams[api.id] || {};
    const presets = getPresetsForApi(api);
    const isSearching = !!cardLoading[api.id];
    const sourceData = currentResult ? currentResult.data : api.sampleResponse;
    const previewString = formatJson(sourceData);
    const responseMap = buildResponseMap(sourceData);

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-slate-200">
        {/* DETAIL SCREEN TOP NOTIFICATION */}
        <div className="bg-slate-900 text-slate-300 text-xs px-6 py-2 flex items-center justify-between font-mono border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            <span>Ambiente Sandbox Ativo: Sem necessidade de CORS, Token de Prova ou Chave de Acesso Oficial.</span>
          </div>
          <span className="hidden md:inline text-slate-500">API ID: {api.id}</span>
        </div>

        {/* WORKBENCH BAR */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 md:px-8 py-4 shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedApi(null);
                  window.scrollTo({ top: 0 });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-250 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                Voltar ao Catálogo
              </button>
              <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />
              <div>
                <span className="text-[10px] font-mono font-black uppercase text-indigo-600 tracking-wider">Playground / Detalhado</span>
                <h1 className="text-sm md:text-base font-black text-slate-900 leading-tight flex items-center gap-2 font-display">
                  {api.name}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-sans font-bold uppercase rounded-md">
                {api.category || 'API'}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black tracking-wide font-mono uppercase border ${
                api.auth === 'none' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {api.auth === 'none' ? 'SEM AUTENTICAÇÃO' : 'CHAVE MOCKADA'}
              </span>
            </div>
          </div>
        </header>

        {/* MAIN SPLIT WORKSPACE INTERACTIVE GRID */}
        <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-24">
          
          {/* LEFT SIDE PANEL: Definition, URL, Parameters Form, Quick Presets */}
          <section className="lg:col-span-5 space-y-6">
            
            {/* 1. API INFO BOX */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h2 className="text-xs uppercase font-mono tracking-widest text-slate-400 font-bold block">Sobre a API</h2>
              <p className="text-sm text-slate-700 leading-relaxed">
                {api.description}
              </p>
              
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={api.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-indigo-600 hover:text-indigo-800 transition inline-flex items-center gap-1 font-bold py-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Ir para Documentação Oficial
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              </div>
            </div>

            {/* 2. BASE ENDPOINT & LIVE METHOD BAR */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h2 className="text-xs uppercase font-mono tracking-widest text-slate-400 font-bold block">Testador de Rota</h2>
              
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-mono text-slate-500 font-bold">
                  <span>URL e Método de Requisição</span>
                  <span className="text-emerald-600">GET</span>
                </div>
                <div className="flex items-stretch bg-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs font-mono text-slate-800">
                  <span className="bg-emerald-600 text-white font-bold px-3 flex items-center text-[11px] uppercase tracking-wider">
                    {ep?.method || 'GET'}
                  </span>
                  <p className="p-2.5 truncate flex-1 font-semibold select-all bg-slate-50 text-slate-700">
                    {api.url}{ep?.path || ''}
                  </p>
                </div>
              </div>

              {/* DYNAMIC FORM PARAMETERS */}
              {ep && ep.queryParams && ep.queryParams.length > 0 && (
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Variáveis de Consulta (Query Params)</span>
                  <div className="space-y-3">
                    {ep.queryParams.map((param: QueryParamInfo) => (
                      <div key={param.name} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <label className="text-slate-750 font-bold" title={param.description}>
                            {param.name} {param.required && <span className="text-rose-500 font-bold">*</span>}
                          </label>
                          <span className="text-[10px] text-slate-400 truncate max-w-[170px]" title={param.description}>
                            {param.description}
                          </span>
                        </div>
                        <input 
                          type="text"
                          value={qParams[param.name] ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCardQueryParams(prev => ({
                              ...prev,
                              [api.id]: {
                                ...(prev[api.id] || {}),
                                [param.name]: v
                              }
                            }));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:bg-white focus:border-indigo-600 transition"
                          placeholder={param.defaultValue || 'digite aqui...'}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ep && ep.pathParams && ep.pathParams.length > 0 && (
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Parâmetros de Rota Dinâmica (Path Params)</span>
                  <div className="space-y-3">
                    {ep.pathParams.map((param: PathParamInfo) => (
                      <div key={param.name} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <label className="text-slate-750 font-bold" title={param.description}>
                            {param.name} {param.required && <span className="text-rose-500 font-bold">*</span>}
                          </label>
                          <span className="text-[10px] text-slate-400 truncate max-w-[170px]" title={param.description}>
                            {param.description}
                          </span>
                        </div>
                        <input 
                          type="text"
                          value={pParams[param.name] ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCardPathParams(prev => ({
                              ...prev,
                              [api.id]: {
                                ...(prev[api.id] || {}),
                                [param.name]: v
                              }
                            }));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:bg-white focus:border-indigo-600 transition"
                          placeholder={param.defaultValue || 'digite aqui...'}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ON-CLICK SHORTCUT PRESETS */}
              {presets && presets.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Fórmulas / Atalhos rápidos de teste:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {presets.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => applyPreset(api, p)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-indigo-500/50 text-slate-755 px-2.5 py-1.5 rounded transition font-medium cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SUBMIT BUTTON TRIGGER */}
              <div className="pt-2">
                <button
                  disabled={isSearching}
                  onClick={() => executeCardTest(api)}
                  className="w-full text-sm font-bold bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition duration-150 cursor-pointer shadow-md shadow-indigo-500/5 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Conectando ao Endpoint Remoto...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current text-amber-300" />
                      Testar API e Mostrar Estrutura
                    </>
                  )}
                </button>
                <p className="text-[10px] text-slate-500 font-mono mt-2">
                  Este teste busca o retorno real para mostrar exatamente o que existe dentro da API.
                </p>
              </div>

            </div>

          </section>

          {/* RIGHT SIDE PANEL: Beautiful Simulated Output + Raw Code Console */}
          <section className="lg:col-span-7 space-y-6">
            
            {/* 1. VISUAL COMPONENT PREVIEW */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-center text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                <span>Resultado Visual Traduzido (Prototipagem)</span>
                {currentResult && (
                  <button
                    onClick={() => clearCardResult(api.id)}
                    className="text-rose-600 hover:text-rose-800 transition font-mono normal-case hover:underline cursor-pointer"
                  >
                    Restaurar Padrão [x]
                  </button>
                )}
              </div>
              
              <div className="relative border border-slate-150 rounded-xl overflow-hidden shadow-inner bg-slate-900 text-slate-100 min-h-[140px]">
                {/* Visual content parser box */}
                <div className="p-1">
                  {renderCardContentBox(api)}
                </div>

                {/* Loading overlay */}
                {isSearching && (
                  <div className="absolute inset-0 bg-slate-950/80 rounded-xl flex flex-col items-center justify-center p-4 text-center z-10">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                    <span className="text-xs uppercase font-mono tracking-widest text-slate-350 font-bold">Consumindo Resposta em Tempo Real...</span>
                  </div>
                )}
              </div>

              {/* TIMING STATISTICS HEADER */}
              {currentResult && (
                <div className={`px-3 py-2 rounded-xl text-xs font-mono border ${
                  currentResult.ok 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
                    : 'bg-rose-50 text-rose-700 border-rose-250'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate max-w-sm">
                      Status: <strong className="font-sans font-bold text-sm bg-white/70 px-1.5 py-0.5 rounded border border-current">{currentResult.status ?? 'N/A'}</strong> · Latência: <strong>{currentResult.durationMs ?? 0}ms</strong>
                    </span>
                    {currentResult.ok ? (
                      <span className="flex items-center gap-1 font-black shrink-0 uppercase tracking-widest text-[10.5px]">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        Status OK [Sucesso]
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-black shrink-0 uppercase tracking-widest text-[10.5px]">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        Erro Interno ou Falha 
                      </span>
                    )}
                  </div>
                  {!currentResult.ok && currentResult.error && (
                    <p className="mt-1 text-[10px] leading-snug font-sans">
                      {currentResult.error}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 2. RAW CODE VIEWER AND EXPORT */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                <span>Mapa da Resposta (o que tem dentro)</span>
                <span className="text-[10px] text-slate-500 normal-case">
                  raiz: <strong className="text-slate-700">{responseMap.rootKind}</strong>
                </span>
              </div>

              <p className="text-[11px] text-slate-600 leading-snug">
                Estrutura principal: <strong>{responseMap.rootDetail}</strong>
              </p>

              <div className="max-h-[220px] overflow-auto border border-slate-200 rounded-xl">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-left font-mono uppercase tracking-wide text-[10px] text-slate-500">
                      <th className="px-3 py-2 border-b border-slate-200">Campo</th>
                      <th className="px-3 py-2 border-b border-slate-200">Tipo</th>
                      <th className="px-3 py-2 border-b border-slate-200">Conteúdo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responseMap.rows.map((row, idx) => (
                      <tr key={`${row.path}-${idx}`} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-2 font-mono text-slate-700 break-all">{row.path}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono text-[10px]">
                            {row.kind}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{row.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {responseMap.truncated && (
                <p className="text-[10px] text-slate-500 font-mono">
                  Estrutura parcial exibida para manter o desempenho.
                </p>
              )}
            </div>

            {/* 3. RAW CODE VIEWER AND EXPORT */}
            <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400 uppercase tracking-wider font-bold">Inspecionar Carga JSON (Payload bruto)</span>
                <button
                  onClick={() => handleCopyJson(api.id)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs rounded transition text-slate-300 font-bold active:scale-95 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      Copiar JSON
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl max-h-[350px] overflow-auto border border-slate-850">
                <pre className="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre font-medium selection:bg-indigo-900/50">
                  {previewString}
                </pre>
              </div>

              <p className="text-[10px] text-slate-500 font-mono italic">
                Fonte do teste: {currentResult?.source === 'proxy' ? 'proxy backend' : currentResult?.source === 'browser-direct' ? 'requisição direta do navegador' : 'mock local'} · Retorno recebido: {previewString.length} caracteres estruturados.
              </p>
            </div>

          </section>

        </main>
      </div>
    );
  }

  // --- CATALOGO COMUM (WHITE LAYOUT DIRECTORY VIEW) ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[420px] h-[420px] bg-indigo-100/45 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-36 -right-36 w-[420px] h-[420px] bg-cyan-100/45 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER PRINCIPAL NO ESTILO PIRATE BAY (Clean Light Branding) */}
      <header className="py-10 px-6 md:px-8 border-b border-slate-200 bg-white/90 backdrop-blur-xs shadow-xs relative z-10 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200 shadow-inner">
            <span className="text-lg">⛵</span>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800">
              Pirate Free APIs
            </span>
            <span className="inline-block h-3 w-[1px] bg-slate-300 mx-1" />
            <span className="text-[10px] font-mono text-slate-500">
              O Índice de APIs Públicas
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl md:text-5xl font-black text-slate-900 tracking-tight font-display max-w-2xl mx-auto leading-none">
              Inspecione o que tem dentro de cada API gratuitamente.
            </h1>
          </div>

          {/* Clean Light-Themed Search Form */}
          <div className="max-w-3xl mx-auto relative">
            <img
              src={pirateShipBg}
              alt="Embarcação decorativa"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[58%] w-[360px] md:w-[520px] opacity-10 md:opacity-[0.15] pointer-events-none select-none"
              referrerPolicy="no-referrer"
            />

            <form onSubmit={handleSearch} className="relative z-10 bg-white/95 border-2 border-slate-900 rounded-2xl flex items-stretch overflow-hidden shadow-lg shadow-slate-200/50 transition-all focus-within:ring-4 focus-within:ring-indigo-100 focus-within:border-indigo-600 backdrop-blur-xs">
              <div className="flex items-center px-4 flex-1 gap-2.5">
                <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    // Reset categories if typing to avoid search mismatch
                    if (selectedCategory || selectedSubcategory || selectedRawCategory) {
                      setSelectedCategory('');
                      setSelectedSubcategory('');
                      setSelectedRawCategory('');
                    }
                  }}
                  placeholder="Escreva termos como: pokemons, clima, yugioh, bitcoin, paises, biblia..."
                  className="bg-transparent border-none text-slate-900 text-sm md:text-base focus:ring-0 focus:outline-none w-full placeholder-slate-400 outline-none py-3 font-medium"
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-300 text-white px-7 font-black text-xs transition duration-150 uppercase tracking-widest shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Buscando
                  </>
                ) : (
                  "Procurar"
                )}
              </button>
            </form>

            {/* APIs Count Badge */}
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Acervo de Indexação: <strong className="font-sans text-xs">{totalApis} APIs Ativas</strong> catalogadas no sistema
              </span>
              <span className="text-[10px] font-mono text-slate-400 select-none hidden sm:inline">
                · Sem limite de chamadas ou CORS
              </span>
            </div>
          </div>

          {/* CATEGORY EXPLORER & FILTERS SYSTEM */}
          <div className="pt-6 border-t border-slate-100 max-w-5xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm space-y-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">Categorias</h3>
                  <p className="text-xs text-slate-500">
                    Escolha o departamento, depois a subcategoria e finalize na categoria real.
                  </p>
                </div>
                {(selectedCategory || selectedSubcategory || selectedRawCategory || query || rawCategorySearch.trim()) && (
                  <button
                    onClick={() => {
                      setSelectedCategory('');
                      setSelectedSubcategory('');
                      setSelectedRawCategory('');
                      setRawCategorySearch('');
                      setQuery('');
                    }}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg transition cursor-pointer self-start md:self-auto"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {categoryIndex.categoryCards.map((cat) => {
                  const isActive = selectedCategory === cat.name;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => {
                        if (isActive) {
                          setSelectedCategory('');
                          setSelectedSubcategory('');
                        } else {
                          setSelectedCategory(cat.name);
                          setSelectedSubcategory('');
                          setSelectedRawCategory('');
                          setRawCategorySearch('');
                          setQuery('');
                        }
                      }}
                      className={`p-3.5 rounded-xl border text-left transition duration-200 cursor-pointer ${
                        isActive
                          ? "bg-slate-900 border-slate-900 text-white shadow-md"
                          : "bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl">{cat.icon}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          isActive
                            ? "bg-white/10 border-white/25 text-white"
                            : "bg-white border-slate-200 text-slate-600"
                        }`}>
                          {cat.count}
                        </span>
                      </div>
                      <p className="text-[11.5px] font-black leading-tight">{cat.name}</p>
                    </button>
                  );
                })}
              </div>

              {categoryIndex.categoryCards.length === 0 && (
                <div className="bg-amber-50 border border-amber-150 text-amber-800 rounded-xl px-3 py-2 text-xs">
                  Não há departamentos neste recorte atual. Use a busca de categorias reais logo abaixo.
                </div>
              )}

              {selectedCategory && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-slate-600 mb-2">
                    Subcategorias de <strong>{selectedCategory}</strong>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSubcategory('')}
                      className={`px-3 py-1.5 text-xs rounded-full transition font-bold cursor-pointer ${
                        !selectedSubcategory
                          ? "bg-slate-900 text-white"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      Todas
                    </button>
                    {selectedCategorySubOptions.map((sub) => {
                      const isSubActive = selectedSubcategory === sub.name;
                      return (
                        <button
                          key={sub.name}
                          type="button"
                          onClick={() => setSelectedSubcategory(isSubActive ? '' : sub.name)}
                          className={`px-3 py-1.5 text-xs rounded-full transition font-bold cursor-pointer ${
                            isSubActive
                              ? "bg-indigo-600 text-white"
                              : "bg-white border border-slate-250 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {sub.name} ({sub.count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[11.5px] font-black uppercase tracking-wide text-slate-700 font-mono">
                    Categorias Reais
                  </h4>
                  {selectedRawCategory && (
                    <button
                      type="button"
                      onClick={() => setSelectedRawCategory('')}
                      className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                    >
                      Remover seleção
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={rawCategorySearch}
                    onChange={(e) => setRawCategorySearch(e.target.value)}
                    placeholder="Buscar categoria real: foto, clima, fintech, games, educação..."
                    className="w-full bg-white border border-slate-250 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {rawCategoryPreview.map((option) => {
                    const isActive = selectedRawCategory === option.name;
                    return (
                      <button
                        key={option.name}
                        type="button"
                        onClick={() => setSelectedRawCategory(isActive ? '' : option.name)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] border font-semibold transition cursor-pointer ${
                          isActive
                            ? "bg-indigo-600 text-white border-indigo-650 shadow-xs"
                            : "bg-white text-slate-700 border-slate-250 hover:bg-slate-100"
                        }`}
                      >
                        {option.name} ({option.count})
                      </button>
                    );
                  })}
                </div>

                {rawCategoryPreview.length === 0 && (
                  <p className="text-[11px] text-slate-500">
                    Nenhuma categoria real encontrada para esse termo.
                  </p>
                )}

                {hiddenRawCategoryCount > 0 && (
                  <p className="text-[11px] text-slate-500">
                    +{hiddenRawCategoryCount} categorias adicionais. Continue digitando para filtrar.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* COLETOR AUTOMÁTICO DE NOVAS APIs (PIRATE STYLE WORKER) */}
          <div className="max-w-xl mx-auto pt-4">
            {!showCollector ? (
              <button
                type="button"
                onClick={() => {
                  setShowCollector(true);
                  setCollectStatus(null);
                }}
                className="inline-flex items-center gap-2 text-[11px] font-black text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/75 transition-all py-1.5 px-3 bg-indigo-50 border border-indigo-150 rounded-xl cursor-pointer shadow-xs active:scale-95"
              >
                ⛵ Encontrou outra API sem chaves? Teste e indexe-a imediatamente no buscador →
              </button>
            ) : (
              <div className="bg-white border-2 border-indigo-200 rounded-2xl p-5 shadow-md text-left relative overflow-hidden transition-all duration-300">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base text-indigo-600">⚡</span>
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800 font-mono">
                      Coletor e Analisador Automático de APIs
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCollector(false);
                      setCollectStatus(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 font-mono text-xs font-bold transition cursor-pointer"
                  >
                    Fechar [x]
                  </button>
                </div>
                
                <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                  Insira uma URL pública real de teste (ex: <code className="bg-slate-50 border border-slate-200 px-1 rounded font-mono text-[10px] text-slate-600">https://catfact.ninja/fact</code>). 
                  Nosso robô valida a resposta e, caso contenha dados públicos, a cataloga imediatamente!
                </p>

                <form onSubmit={handleCollectApi} className="flex gap-2">
                  <input
                    type="text"
                    required
                    disabled={isCollecting}
                    value={customApiUrl}
                    onChange={(e) => setCustomApiUrl(e.target.value)}
                    placeholder="https://api.exemplo.com/endpoint"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition"
                  />
                  <button
                    type="submit"
                    disabled={isCollecting || !customApiUrl.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-sm shadow-indigo-500/10 active:scale-95"
                  >
                    {isCollecting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      "Testar & Coletar"
                    )}
                  </button>
                </form>

                {collectStatus && (
                  <div className={`mt-3 p-3 rounded-xl text-xs flex items-start gap-2 border leading-normal ${
                    collectStatus.success 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-150' 
                      : 'bg-amber-50 text-amber-800 border-amber-150'
                  }`}>
                    <span className="mt-0.5 shrink-0 text-xs">
                      {collectStatus.success ? '✅' : '⚠️'}
                    </span>
                    <p className="font-medium text-[11.5px]">
                      {collectStatus.message}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active Filter Indicators */}
          {(selectedCategory || selectedSubcategory || selectedRawCategory || query.trim()) && (
            <div className="pt-4 border-t border-slate-150 flex flex-wrap items-center justify-center gap-1.5 text-xs font-mono">
              <span className="text-slate-405 font-bold">Filtros Ativos:</span>
              {selectedCategory && (
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-150 px-2 py-0.5 rounded-md font-bold text-[11px]">
                  Categoria: {selectedCategory}
                </span>
              )}
              {selectedSubcategory && (
                <span className="bg-amber-50 text-amber-700 border border-amber-150 px-2 py-0.5 rounded-md font-bold text-[11px]">
                  Subcategoria: {selectedSubcategory}
                </span>
              )}
              {selectedRawCategory && (
                <span className="bg-cyan-50 text-cyan-700 border border-cyan-150 px-2 py-0.5 rounded-md font-bold text-[11px]">
                  Categoria Real: {selectedRawCategory}
                </span>
              )}
              {query.trim() && (
                <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-bold text-[11px]">
                  Busca: "{query.trim()}"
                </span>
              )}
            </div>
          )}

        </div>
      </header>

      {/* SEÇÃO PRINCIPAL DO DIRETÓRIO */}
      <main className="flex-1 p-5 md:p-8 max-w-6xl mx-auto w-full relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
            <span className="text-xs font-mono font-black uppercase tracking-widest text-slate-400">Varrendo o Índice de APIs...</span>
            <p className="text-xs text-slate-400 mt-1">Isso será concluído em instantes.</p>
          </div>
        ) : filteredApis.length === 0 ? (
          <div className="text-center py-20 bg-white/95 backdrop-blur-xs rounded-2xl border border-slate-200 p-8 max-w-md mx-auto shadow-xs">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono">Índice não encontrado</h3>
            <p className="text-xs text-slate-500 mt-1 border-b border-slate-100 pb-3 mb-4">
              Não encontramos APIs correspondentes a essa consulta de busca. Tente buscar termos comuns ou clique no botão abaixo.
            </p>
            <button 
              onClick={() => {
                setSelectedCategory('');
                setSelectedSubcategory('');
                setSelectedRawCategory('');
                setRawCategorySearch('');
                setQuery('');
              }}
              className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-lg transition cursor-pointer"
            >
              Exibir APIs Recomendadas
            </button>
          </div>
        ) : (
          <>
          <div className="mb-4 text-xs font-mono text-slate-500 flex items-center justify-between gap-2">
            <span>
              Exibindo <strong className="text-slate-700">{visibleApis.length}</strong> de{" "}
              <strong className="text-slate-700">{filteredApis.length}</strong> APIs
            </span>
            {hasMoreVisibleApis && (
              <span className="text-[11px] text-slate-400">Carregamento progressivo ativo</span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
            {visibleApis.map((api) => {
              return (
                <div
                  id={`api-card-${api.id}`}
                  key={api.id}
                  onClick={() => openApiDetails(api)}
                  className="bg-white/95 hover:bg-slate-50/75 backdrop-blur-xs border border-slate-200 hover:border-indigo-305 p-5 rounded-2xl flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden group hover:scale-[1.01]"
                >
                  <div className="space-y-4">
                    
                    {/* Header item */}
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[9px] font-mono font-bold uppercase rounded-md shrink-0">
                        {api.category || 'API'}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider font-mono shrink-0 uppercase border ${
                        api.auth === 'none' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {api.auth === 'none' ? 'SEM CHAVE' : 'CHAVE MOCK'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-black text-slate-950 tracking-tight group-hover:text-indigo-600 transition font-display line-clamp-1">
                        {api.name}
                      </h3>
                      <p className="text-xs text-slate-550 leading-relaxed line-clamp-2 mt-1 min-h-[32px]">
                        {api.description}
                      </p>
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <span className="text-[9px] uppercase tracking-wider font-mono text-slate-400 font-bold block">
                        Rotas Disponíveis
                      </span>
                      <p className="text-[11px] text-slate-600 font-semibold">
                        {api.endpoints?.length || 0} rota(s) cadastrada(s)
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase tracking-wider font-mono text-slate-400 font-bold block font-sans">Endereço Host</span>
                      <p className="text-[10px] font-mono text-slate-500 truncate bg-slate-50 p-1.5 px-2.5 rounded-lg border border-slate-150">
                        {api.url.replace('https://', '').replace('http://', '')}
                      </p>
                    </div>

                  </div>

                  {/* BOTTOM ACTION LAYOUT */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="text-[10px] text-indigo-600 group-hover:underline flex items-center gap-1">
                      Abrir Playground 🧪
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 font-normal bg-slate-100 px-1.5 py-0.5 rounded">
                      JSON
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
          {hasMoreVisibleApis && (
            <div className="pb-24 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleApiLimit((prev) => prev + LOAD_MORE_APIS_STEP)}
                className="bg-white border border-slate-250 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Carregar mais {Math.min(LOAD_MORE_APIS_STEP, filteredApis.length - visibleApis.length)} APIs
              </button>
            </div>
          )}
          </>
        )}
      </main>

    </div>
  );
}
