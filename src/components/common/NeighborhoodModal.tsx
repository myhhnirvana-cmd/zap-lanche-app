import React, { useEffect, useMemo, useState } from 'react';
import { X, MapPin, Check, Plus, Loader2, Search } from 'lucide-react';
import { Neighborhood } from '../../types';
import { NEIGHBORHOODS } from '../../data/mockData';
import { useAuth } from '../../contexts/AuthContext';
import { createNeighborhoodInSupabase, fetchNeighborhoodsFromSupabase } from '../../lib/supabase';

interface NeighborhoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNeighborhood: Neighborhood;
  onSelectNeighborhood: (neighborhood: Neighborhood) => void;
}

export const NeighborhoodModal: React.FC<NeighborhoodModalProps> = ({
  isOpen,
  onClose,
  currentNeighborhood,
  onSelectNeighborhood,
}) => {
  const { user } = useAuth();
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>(NEIGHBORHOODS);
  const [search, setSearch] = useState('');
  const [newNeighborhood, setNewNeighborhood] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setSearch('');
    setNewNeighborhood('');
    setError(null);
    setIsLoading(true);
    fetchNeighborhoodsFromSupabase()
      .then((remote) => {
        if (!active || !remote) return;
        const merged = [...NEIGHBORHOODS];
        for (const item of remote) {
          const exists = merged.some((entry) => entry.name.trim().toLocaleLowerCase('pt-BR') === item.name.trim().toLocaleLowerCase('pt-BR'));
          if (!exists) merged.push(item);
          else {
            const index = merged.findIndex((entry) => entry.name.trim().toLocaleLowerCase('pt-BR') === item.name.trim().toLocaleLowerCase('pt-BR'));
            if (index >= 0) merged[index] = { ...merged[index], ...item };
          }
        }
        setNeighborhoods(merged);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [isOpen]);

  const visibleNeighborhoods = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return neighborhoods;
    return neighborhoods.filter((item) =>
      [item.name, item.zone, item.city].some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(term))
    );
  }, [neighborhoods, search]);

  const handleAddNeighborhood = async () => {
    if (!user) {
      setError('Entre na sua conta para cadastrar um bairro compartilhado.');
      return;
    }
    const cleanName = newNeighborhood.trim().replace(/\\s+/g, ' ');
    if (cleanName.length < 2) {
      setError('Digite o nome do bairro para continuar.');
      return;
    }
    setIsSaving(true);
    setError(null);
    const result = await createNeighborhoodInSupabase(cleanName);
    setIsSaving(false);
    if (!result.success || !result.neighborhood) {
      setError(result.error || 'Não foi possível adicionar o bairro.');
      return;
    }
    const created = result.neighborhood;
    setNeighborhoods((previous) => {
      const withoutDuplicate = previous.filter((item) => item.name.trim().toLocaleLowerCase('pt-BR') !== created.name.trim().toLocaleLowerCase('pt-BR'));
      return [...withoutDuplicate, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    });
    setNewNeighborhood('');
    onSelectNeighborhood(created);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full sm:max-w-md bg-[#13151f] border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="neighborhood-modal-title"
      >
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 id="neighborhood-modal-title" className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-400" />
              Escolha seu Bairro
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Encontre estabelecimentos perto de você
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar seleção de bairro"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar bairro..."
            className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-9 pr-3 text-sm text-white outline-none focus:border-orange-500"
          />
        </div>

        <div className="mt-3 space-y-2">
          {visibleNeighborhoods.map((item) => {
            const isSelected = item.id === currentNeighborhood.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectNeighborhood(item);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-orange-500/15 border-orange-500/50 text-white'
                    : 'bg-slate-850/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{item.name}</span>
                    {item.name !== 'Todos os Bairros' && (
                      <span className="text-[11px] text-slate-400">{item.city} - {item.state}</span>
                    )}
                  </div>
                  <span className="text-xs text-orange-400/90 font-medium">
                    {item.name === 'Todos os Bairros'
                      ? 'Ver todos os estabelecimentos'
                      : `${item.activeSpotsCount} ${item.activeSpotsCount === 1 ? 'estabelecimento cadastrado' : 'estabelecimentos cadastrados'}`}
                  </span>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-black shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
          {visibleNeighborhoods.length === 0 && (
            <p className="py-3 text-center text-xs text-slate-400">Nenhum bairro encontrado com esse nome.</p>
          )}
          {isLoading && (
            <p className="flex items-center justify-center gap-2 py-2 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Atualizando bairros compartilhados...
            </p>
          )}
        </div>

        <div className="mt-5 rounded-xl bg-slate-900 border border-orange-500/30 p-3.5 space-y-3">
          <div>
            <p className="text-sm font-bold text-white">Não encontrou seu bairro?</p>
            <p className="text-xs text-slate-400 mt-0.5">Adicione aqui. O novo bairro ficará disponível para toda a comunidade e para os comerciantes.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={newNeighborhood}
              onChange={(event) => setNewNeighborhood(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') void handleAddNeighborhood(); }}
              maxLength={60}
              placeholder="Nome do novo bairro"
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500"
            />
            <button
              type="button"
              onClick={() => void handleAddNeighborhood()}
              disabled={isSaving || !newNeighborhood.trim()}
              className="shrink-0 rounded-lg bg-orange-500 px-3 py-2.5 text-xs font-bold text-black disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Adicionar
            </button>
          </div>
          {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
          {!user && <p className="text-[11px] text-amber-300">É necessário entrar na conta para salvar um bairro novo.</p>}
        </div>

        <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 text-center">
          💡 Os bairros cadastrados ficam compartilhados no ZAP Lanche.
        </div>
      </div>
    </div>
  );
};
