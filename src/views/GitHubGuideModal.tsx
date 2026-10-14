import React, { useState } from 'react';
import { X, GitBranch, Terminal, Database, Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';

interface GitHubGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubGuideModal: React.FC<GitHubGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCode = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedStep(id);
    setTimeout(() => setCopiedStep(null), 2500);
  };

  const gitCommands = `# 1. Inicialize o repositório git local (se ainda não tiver feito)
git init

# 2. Adicione todos os arquivos organizados da FASE 1
git add .

# 3. Crie o primeiro commit de demonstração visual
git commit -m "feat: estrutura visual e navegação da Fase 1 do ZAP LANCHE"

# 4. Conecte ao seu repositório no GitHub (crie um novo repo vazio no GitHub primeiro)
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/zap-lanche.git

# 5. Envie para o GitHub
git push -u origin main`;

  const supabasePreview = `-- Estrutura prevista para a FASE 2 no Supabase (PostgreSQL)

-- 1. Bairros atendidos
CREATE TABLE neighborhoods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state VARCHAR(2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Restaurantes e Lanchonetes
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neighborhood_id UUID REFERENCES neighborhoods(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  phone_whatsapp TEXT NOT NULL,
  address TEXT NOT NULL,
  is_open BOOLEAN DEFAULT true,
  rating NUMERIC(2,1) DEFAULT 5.0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Cardápios e Pratos
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true
);

-- 4. Feed Comunitário Social
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id),
  user_id UUID,
  content TEXT NOT NULL,
  image_url TEXT,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl bg-[#12141e] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0f1118]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Guia de Exportação para o GitHub & Supabase
              </h3>
              <p className="text-xs text-slate-400">
                ZAP LANCHE · Fase 1 (Visual e Navegação)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-850 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Status banner */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200/90 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">
                FASE 1: Apenas Estrutura Visual e Navegação
              </p>
              <p className="text-slate-300 mt-0.5 leading-relaxed">
                Este projeto foi criado com componentes modulares limpos, sem bibliotecas pesadas e sem acoplamento a serviços proprietários (sem Base44). Todos os dados atuais são puramente demonstrativos.
              </p>
            </div>
          </div>

          {/* Directory structure preview */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
              📁 Estrutura Organizada do Código
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 border border-slate-800/80 leading-relaxed overflow-x-auto">
              <pre className="text-orange-400 font-bold mb-1">zap-lanche/</pre>
              <div>├── <span className="text-amber-300">src/types/index.ts</span> (Modelos TypeScript prontos p/ Supabase)</div>
              <div>├── <span className="text-amber-300">src/data/mockData.ts</span> (Dados fictícios de bairros e lanches)</div>
              <div>├── <span className="text-emerald-400">src/components/layout/</span></div>
              <div>│   ├── Header.tsx (Barra superior c/ seletor de bairro)</div>
              <div>│   └── BottomNav.tsx (Barra inferior touch Android)</div>
              <div>├── <span className="text-emerald-400">src/views/</span></div>
              <div>│   ├── ExploreView.tsx (Página Explorar + categorias)</div>
              <div>│   ├── RestaurantDetailView.tsx (Cardápio, promoções, posts)</div>
              <div>│   ├── FeedView.tsx (Feed social gastronômico)</div>
              <div>│   ├── ProfileView.tsx (Perfil morador demo)</div>
              <div>│   ├── MerchantView.tsx (Painel do lojista demo)</div>
              <div>│   ├── AdminView.tsx (Painel administrativo demo)</div>
              <div>│   └── DishDetailModal.tsx (Simulador pedido via Zap)</div>
              <div>├── <span className="text-slate-400">src/assets/images/</span> (Fotografias gastronômicas locais)</div>
              <div>├── <span className="text-slate-400">package.json</span> & <span className="text-slate-400">vite.config.ts</span></div>
            </div>
          </div>

          {/* GitHub Commands */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-orange-400" />
                Como salvar e versionar no GitHub
              </h4>
              <button
                onClick={() => copyCode(gitCommands, 'git')}
                className="text-xs font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1"
              >
                {copiedStep === 'git' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar comandos
                  </>
                )}
              </button>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-emerald-300 border border-slate-800 overflow-x-auto">
              <pre>{gitCommands}</pre>
            </div>
          </div>

          {/* Supabase Schema Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                Planejamento da Fase 2 (Supabase)
              </h4>
              <button
                onClick={() => copyCode(supabasePreview, 'supabase')}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                {copiedStep === 'supabase' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar SQL
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Os tipos do TypeScript em <code className="text-orange-300">src/types/index.ts</code> foram desenhados espelhando exatamente as tabelas relacionais do Supabase:
            </p>
            <div className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-amber-300 border border-slate-800 max-h-36 overflow-y-auto">
              <pre>{supabasePreview}</pre>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#0f1118] border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 font-semibold text-xs text-white transition-colors"
          >
            Entendido, Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
