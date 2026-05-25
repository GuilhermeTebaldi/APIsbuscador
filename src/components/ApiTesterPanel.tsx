import { useState, useEffect } from 'react';
import { FreeApiInfo, EndpointInfo } from '../types';
import { Play, Loader2, Sparkles, CheckCircle2, AlertTriangle, Clock, Server, FileCode, ArrowRightLeft } from 'lucide-react';
import { getPresetsForApi, CommandPreset } from '../utils/presets';

interface ApiTesterPanelProps {
  api: FreeApiInfo;
  onClose: () => void;
  onOpenExplorer: (api: FreeApiInfo, pretestResult?: any) => void;
}

export default function ApiTesterPanel({ api, onClose, onOpenExplorer }: ApiTesterPanelProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointInfo>(api.endpoints[0] || null);
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [presets, setPresets] = useState<CommandPreset[]>([]);

  // Initialize form state when the selected endpoint or API changes
  useEffect(() => {
    setPresets(getPresetsForApi(api));
    if (api.endpoints && api.endpoints.length > 0) {
      const defaultEndpoint = api.endpoints[0];
      setSelectedEndpoint(defaultEndpoint);
      resetParams(defaultEndpoint);
    } else {
      setSelectedEndpoint(null);
    }
  }, [api]);

  const resetParams = (endpoint: EndpointInfo) => {
    const qParams: Record<string, string> = {};
    if (endpoint.queryParams) {
      endpoint.queryParams.forEach(p => {
        qParams[p.name] = p.defaultValue || '';
      });
    }
    setQueryParams(qParams);

    const pParams: Record<string, string> = {};
    if (endpoint.pathParams) {
      endpoint.pathParams.forEach(p => {
        pParams[p.name] = p.defaultValue || '';
      });
    }
    setPathParams(pParams);
    setTestResult(null);
  };

  const handleEndpointChange = (endpointIndex: number) => {
    const endpoint = api.endpoints[endpointIndex];
    setSelectedEndpoint(endpoint);
    resetParams(endpoint);
  };

  const handleQueryParamChange = (name: string, value: string) => {
    setQueryParams(prev => ({ ...prev, [name]: value }));
  };

  const handlePathParamChange = (name: string, value: string) => {
    setPathParams(prev => ({ ...prev, [name]: value }));
  };

  const executeTest = async (
    overrideEndpoint?: EndpointInfo,
    overrideQueryParams?: Record<string, string>,
    overridePathParams?: Record<string, string>
  ) => {
    const activeEndpoint = overrideEndpoint || selectedEndpoint;
    if (!activeEndpoint) return;
    setLoading(true);
    setTestResult(null);

    const activeQueryParams = overrideQueryParams || queryParams;
    const activePathParams = overridePathParams || pathParams;

    // Build the final testing URL
    let finalPath = activeEndpoint.path;
    
    // Replace state-based path parameter variables: /pokemon/:name_or_id
    if (activeEndpoint.pathParams && activeEndpoint.pathParams.length > 0) {
      activeEndpoint.pathParams.forEach(p => {
        const value = activePathParams[p.name] !== undefined ? activePathParams[p.name] : (p.defaultValue || '');
        if (finalPath.includes(`:${p.name}`)) {
          finalPath = finalPath.replace(`:${p.name}`, encodeURIComponent(value));
        } else if (finalPath.endsWith(p.name)) {
          // If path is just "/john 3:16" or contains names directly
          finalPath = finalPath.replace(p.name, value);
        } else {
          // Append if not explicitly structured
          if (!finalPath.endsWith('/') && !value.startsWith('/')) {
            finalPath += '/';
          }
          finalPath += encodeURIComponent(value);
        }
      });
    }

    // Build URL query string parameters e.g. key=val&foo=bar
    const queryParts = Object.entries(activeQueryParams)
      .filter(([_, val]) => val !== '')
      .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
    
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const fullRequestUrl = `${api.url}${finalPath}${queryString}`;

    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: fullRequestUrl,
          method: activeEndpoint.method || 'GET'
        })
      });

      const result = await response.json();
      setTestResult({ ...result, requestUrl: fullRequestUrl });
    } catch (error: any) {
      setTestResult({
        ok: false,
        error: error.message || 'Falha ao processar teste pelo proxy.',
        requestUrl: fullRequestUrl
      });
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = async (preset: CommandPreset) => {
    const endpointIdx = preset.endpointIndex ?? 0;
    const targetEndpoint = api.endpoints[endpointIdx] || selectedEndpoint;
    setSelectedEndpoint(targetEndpoint);

    const q: Record<string, string> = {};
    if (targetEndpoint.queryParams) {
      targetEndpoint.queryParams.forEach(p => {
        q[p.name] = (preset.queryParams && preset.queryParams[p.name] !== undefined)
          ? preset.queryParams[p.name]
          : (p.defaultValue || '');
      });
    }
    setQueryParams(q);

    const p: Record<string, string> = {};
    if (targetEndpoint.pathParams) {
      targetEndpoint.pathParams.forEach(param => {
        p[param.name] = (preset.pathParams && preset.pathParams[param.name] !== undefined)
          ? preset.pathParams[param.name]
          : (param.defaultValue || '');
      });
    }
    setPathParams(p);

    await executeTest(targetEndpoint, q, p);
  };

  // Safe item content analysis
  const analyzeData = (data: any) => {
    if (!data) return { count: 0, text: 'Nenhum registro encontrado' };
    
    // Check if data is array
    if (Array.isArray(data)) {
      return { count: data.length, text: `${data.length} itens encontrados em array` };
    }
    
    // Check if data has key containing arrays (like data.cards, data.results, etc.)
    if (typeof data === 'object') {
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) {
          return { count: data[key].length, text: `${data[key].length} itens encontrados em '${key}'` };
        }
      }
      return { count: Object.keys(data).length, text: `${Object.keys(data).length} chaves principais identificadas` };
    }
    
    return { count: 1, text: 'Registro simples retornado' };
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Panel Header */}
      <div className="flex items-center justify-between p-4 bg-slate-950/80 border-b border-slate-800/80">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold">Inspecionar Canal</span>
          <h3 className="text-base font-bold text-white font-display truncate max-w-[280px]">
            {api.name}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-1 bg-slate-900 rounded-lg hover:bg-slate-800 text-sm font-semibold"
        >
          Fechar ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* URL Specs */}
        <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/50 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-slate-300">Servidor Base URL</span>
          </div>
          <div className="text-xs font-mono bg-slate-950 p-2 rounded border border-slate-900 truncate tracking-tight text-indigo-300">
            {api.url}
          </div>
        </div>

        {/* Selected Endpoint Select Option */}
        {api.endpoints && api.endpoints.length > 0 && (
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Selecione o Endpoint:</label>
            <div className="relative">
              <select
                id="endpoint-selector"
                className="w-full bg-slate-950/60 border border-slate-800 text-slate-200 text-sm px-3.5 py-2.5 rounded-xl focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition shadow-sm outline-none appearance-none"
                value={api.endpoints.indexOf(selectedEndpoint)}
                onChange={(e) => handleEndpointChange(Number(e.target.value))}
              >
                {api.endpoints.map((ep, idx) => (
                  <option key={idx} value={idx}>
                    [{ep.method}] {ep.path} — {ep.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {selectedEndpoint && (
          <div className="space-y-4">
            {/* Endpoint Documentation details */}
            <div className="text-sm bg-indigo-950/10 p-4 border border-indigo-900/30 rounded-xl space-y-1">
              <p className="font-medium text-slate-200">{selectedEndpoint.description}</p>
              <div className="flex items-center gap-2 pt-1 text-xs text-slate-400 font-mono">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase font-black tracking-wider text-[10px]">
                  {selectedEndpoint.method}
                </span>
                <span className="truncate">{selectedEndpoint.path}</span>
              </div>
            </div>

            {/* Comandos Rápidos Prontos em Português */}
            {presets && presets.length > 0 && (
              <div className="space-y-2 bg-slate-950/45 p-4 border border-slate-800/80 rounded-xl">
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <Sparkles className="w-4 h-4 text-cyan-400 fill-cyan-400/20 animate-pulse" />
                  <span className="font-bold uppercase tracking-wider">Comandos de 1-Clique (Português):</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {presets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="w-full text-left text-xs bg-slate-950 hover:bg-slate-800/80 hover:border-cyan-500/50 text-slate-200 hover:text-white px-3 py-2.5 rounded-xl border border-slate-850 transition duration-150 flex items-center justify-between group cursor-pointer"
                    >
                      <span className="font-semibold truncate pr-2 group-hover:text-cyan-400 transition-colors">
                        {p.label}
                      </span>
                      <span className="text-[10px] bg-cyan-950 text-cyan-400 group-hover:bg-cyan-900 group-hover:text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/40 font-bold uppercase transition shrink-0">
                        Executar
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Path Parameters inputs */}
            {selectedEndpoint.pathParams && selectedEndpoint.pathParams.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Variáveis de Rota (:param)</h4>
                <div className="grid grid-cols-1 gap-3 bg-slate-950/30 p-4 rounded-xl border border-slate-805">
                  {selectedEndpoint.pathParams.map((p) => (
                    <div key={p.name} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono text-indigo-300">{p.name}</span>
                        <span className="text-slate-500">{p.required ? 'obrigatório' : 'opcional'}</span>
                      </div>
                      <input
                        type="text"
                        className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:border-indigo-500 outline-none"
                        value={pathParams[p.name] || ''}
                        placeholder={p.description || 'Digitar valor...'}
                        onChange={(e) => handlePathParamChange(p.name, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Query Parameters inputs */}
            {selectedEndpoint.queryParams && selectedEndpoint.queryParams.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Query Params (?key=val)</h4>
                <div className="grid grid-cols-1 gap-3.5 bg-slate-950/30 p-4 rounded-xl border border-slate-805">
                  {selectedEndpoint.queryParams.map((p) => (
                    <div key={p.name} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono text-indigo-300 font-medium">?{p.name}</span>
                        <span className="text-slate-500 text-[10px]">{p.type}</span>
                      </div>
                      <input
                        type="text"
                        className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:border-indigo-500 outline-none"
                        value={queryParams[p.name] || ''}
                        placeholder={p.description || `Padrão: ${p.defaultValue || 'vazio'}`}
                        onChange={(e) => handleQueryParamChange(p.name, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Run request button */}
            <button
              id="run-test-button"
              disabled={loading}
              onClick={executeTest}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] disabled:from-slate-800 disabled:to-slate-800 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-900/20 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
                  Testando Conexão Real...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-white" />
                  Fazer Requisição de Teste (CORS Proxy)
                </>
              )}
            </button>
          </div>
        )}

        {/* Result Area */}
        {testResult && (
          <div className="space-y-4 animate-fade-in">
            {/* Status overview cards */}
            <div className={`p-4 rounded-xl border flex items-start gap-4 ${
              testResult.ok || testResult.status === 200
                ? 'bg-emerald-950/20 border-emerald-505/30'
                : 'bg-rose-950/20 border-rose-505/30'
            }`}>
              {testResult.ok || testResult.status === 200 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
              )}
              
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                    testResult.ok || testResult.status === 200
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {testResult.status || 'Falha'} {testResult.statusText || ''}
                  </span>
                  
                  {testResult.durationMs !== undefined && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {testResult.durationMs}ms
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  {testResult.data 
                    ? analyzeData(testResult.data).text 
                    : testResult.error || 'Nenhum dado retornado no payload.'}
                </p>
              </div>
            </div>

            {/* Custom MP3 Speech Player for test voice responses */}
            {testResult.requestUrl && (testResult.requestUrl.includes('voicerss.org') || testResult.requestUrl.includes('api.voicerss.org')) && (
              <div className="bg-gradient-to-br from-cyan-950/40 to-indigo-950/40 border border-cyan-800/40 p-4 rounded-xl space-y-2 text-left animate-fade-in">
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">🗣️ Player de Voz Inteligente</span>
                <audio 
                  src={testResult.requestUrl}
                  controls
                  autoPlay
                  className="w-full h-9 rounded-md outline-none"
                />
              </div>
            )}

            {/* Expander to explorer prompt */}
            {testResult.ok && testResult.data && (
              <div className="bg-indigo-950/25 p-4 rounded-xl border border-indigo-900/40 text-center space-y-3">
                <div className="flex justify-center flex-col items-center gap-1 text-slate-200">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold">API respondendo perfeitamente!</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Clique para abrir no explorer e obter visualizações completas de imagens e listas.</span>
                </div>
                
                <button
                  onClick={() => onOpenExplorer(api, testResult.data)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg active:scale-95 transition-all shadow"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Abrir Visualização Ampliada
                </button>
              </div>
            )}

            {/* JSON Response Raw tree viewer */}
            {testResult.data && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5 text-slate-500" />
                    Payload JSON:
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {JSON.stringify(testResult.data).length > 1000 
                      ? `${(JSON.stringify(testResult.data).length / 1024).toFixed(1)} KB` 
                      : `${JSON.stringify(testResult.data).length} bytes`}
                  </span>
                </div>
                
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-805 max-h-56 overflow-auto font-mono text-xs text-emerald-400 leading-relaxed shadow-inner">
                  <pre>{JSON.stringify(testResult.data, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
