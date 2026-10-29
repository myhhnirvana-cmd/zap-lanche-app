import React, { useState } from 'react';
import { X, Check, Sparkles } from 'lucide-react';
import {
  AVATARS_GALLERY,
  AvatarCategory,
  AvatarOption,
  getAvatarById,
  DEFAULT_AVATAR_ID,
} from '../../data/avatars';

interface AvatarGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarId?: string | null;
  onSaveAvatar: (avatarId: string) => Promise<{ error: string | null }>;
}

export const AvatarGalleryModal: React.FC<AvatarGalleryModalProps> = ({
  isOpen,
  onClose,
  currentAvatarId,
  onSaveAvatar,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    currentAvatarId || DEFAULT_AVATAR_ID
  );
  const [activeCategory, setActiveCategory] = useState<AvatarCategory>('todos');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredAvatars =
    activeCategory === 'todos'
      ? AVATARS_GALLERY
      : AVATARS_GALLERY.filter((a) => a.category === activeCategory);

  const selectedAvatar: AvatarOption = getAvatarById(selectedId);

  const handleConfirm = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await onSaveAvatar(selectedId);
      if (res.error) {
        setErrorMessage(res.error);
        return;
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao salvar avatar.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl max-h-[90vh] bg-[#12141e] border border-orange-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-display">
                Galeria de Avatares
              </h3>
              <p className="text-xs text-slate-400">
                Escolha seu visual favorito (24 opções exclusivas)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Categories Bar */}
        <div className="px-4 pt-3 flex items-center gap-2 border-b border-slate-850 pb-3">
          <button
            onClick={() => setActiveCategory('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              activeCategory === 'todos'
                ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Todos ({AVATARS_GALLERY.length})
          </button>
          <button
            onClick={() => setActiveCategory('pessoas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              activeCategory === 'pessoas'
                ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Pessoas (16)
          </button>
          <button
            onClick={() => setActiveCategory('lanches')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              activeCategory === 'lanches'
                ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Lanches & Mascotes (8)
          </button>
        </div>

        {/* Avatars Grid - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 gap-2.5 sm:gap-3">
            {filteredAvatars.map((avatar) => {
              const isSelected = selectedId === avatar.id;
              return (
                <button
                  key={avatar.id}
                  onClick={() => {
                    setSelectedId(avatar.id);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className={`relative p-2 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-center group ${
                    isSelected
                      ? 'bg-orange-500/15 border-2 border-orange-500 shadow-lg shadow-orange-500/20 scale-[1.02]'
                      : 'bg-slate-900/90 border border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                  title={`${avatar.name} - ${avatar.description}`}
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden shadow-md shrink-0">
                    <img
                      src={avatar.dataUrl}
                      alt={avatar.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {isSelected && (
                    <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-orange-500 text-black flex items-center justify-center shadow-md">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}

                  <span
                    className={`text-[11px] font-semibold truncate w-full px-0.5 leading-tight ${
                      isSelected ? 'text-orange-300' : 'text-slate-300 group-hover:text-white'
                    }`}
                  >
                    {avatar.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Preview Box */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden shadow-md shrink-0 border-2 border-orange-500/50">
              <img
                src={selectedAvatar.dataUrl}
                alt={selectedAvatar.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white truncate">
                  {selectedAvatar.name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-300 font-semibold border border-orange-500/30">
                  {selectedAvatar.category === 'lanches' ? 'Mascote Lanche' : 'Morador'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {selectedAvatar.description}
              </p>
            </div>
          </div>

          {errorMessage && (
            <p className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0e1017] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black text-xs font-bold shadow-md shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSaving ? 'Salvando...' : 'Salvar Avatar'}
          </button>
        </div>
      </div>
    </div>
  );
};
