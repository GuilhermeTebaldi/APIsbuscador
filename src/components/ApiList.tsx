import { FreeApiInfo } from '../types';
import { Network, FileText, ChevronRight, HelpCircle, Key, Cpu, Zap } from 'lucide-react';

interface ApiListProps {
  apis: FreeApiInfo[];
  selectedApiId: string | null;
  onSelectApi: (api: FreeApiInfo) => void;
  onOpenExplorer: (api: FreeApiInfo) => void;
}

export default function ApiList({ apis, selectedApiId, onSelectApi, onOpenExplorer }: ApiListProps) {
  if (apis.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
        <HelpCircle className="w-12 h-12 text-slate-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-medium text-slate-300">Nenhuma API gratuita encontrada</h3>
        <p className="text-sm text-slate-500 max-w-md mt-2">
          Tente refinar sua busca utilizando outras palavras ou explore as populares sugestões de teste.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {apis.map((api) => {
        const isSelected = selectedApiId === api.id;
        
        return (
          <div
            id={`api-card-${api.id}`}
            key={api.id}
            className={`group relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 ${
              isSelected
                ? 'bg-indigo-950/30 border-indigo-500/80 ring-2 ring-indigo-500/20 shadow-indigo-500/10 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700/80 hover:bg-slate-900/90 shadow-sm'
            }`}
          >
            {/* Design accents */}
            <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 rounded-bl-full filter blur-xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors duration-300" />
            
            <div>
              {/* Header block */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-900/50">
                  <Network className="w-3.5 h-3.5" />
                  {api.category || 'API Pública'}
                </span>
                
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  api.auth === 'none' 
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-900/50' 
                    : 'bg-amber-950/80 text-amber-300 border border-amber-900/50'
                }`}>
                  {api.auth === 'none' ? <Zap className="w-3 h-3 text-emerald-400" /> : <Key className="w-3 h-3 text-amber-400" />}
                  {api.auth === 'none' ? 'Sem Auth' : 'Chave Grátis'}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors tracking-tight font-display mb-2">
                {api.name}
              </h3>
              
              <p className="text-sm text-slate-300/90 leading-relaxed mb-4 line-clamp-3">
                {api.description}
              </p>
            </div>

            {/* Bottom URL Indicators */}
            <div className="mt-auto space-y-3 pt-3 border-t border-slate-800/60">
              <div className="flex flex-col text-xs space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase tracking-wider">Base URL</span>
                <span className="text-indigo-400 truncate font-mono bg-slate-950/40 p-1.5 rounded-md border border-slate-900">
                  {api.url}
                </span>
              </div>

              {/* Interaction Buttons */}
              <div className="flex items-center justify-between gap-2.5 pt-1.5">
                <a
                  href={api.docsUrl}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors py-1.5 bg-slate-950/25 px-2.5 rounded-lg border border-slate-900 hover:border-slate-850"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Docs / Repo
                </a>

                <div className="flex items-center gap-2">
                  <button
                    id={`test-api-btn-${api.id}`}
                    onClick={() => onSelectApi(api)}
                    className={`inline-flex items-center gap-1 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/50'
                        : 'bg-slate-800 hover:bg-slate-705 text-white border border-transparent'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    Testar
                  </button>

                  <button
                    id={`expand-api-btn-${api.id}`}
                    onClick={() => onOpenExplorer(api)}
                    className="inline-flex items-center gap-1 text-xs font-semibold py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/20 active:scale-95 transition-all"
                  >
                    Ampliar
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
