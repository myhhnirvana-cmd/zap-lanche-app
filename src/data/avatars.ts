export type AvatarCategory = 'todos' | 'pessoas' | 'lanches';

export interface AvatarOption {
  id: string;
  name: string;
  category: 'pessoas' | 'lanches';
  description: string;
  svg: string;
  dataUrl: string;
}

const buildDataUrl = (svgContent: string): string => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent.trim())}`;
};

export const AVATARS_GALLERY: AvatarOption[] = [
  // ==========================================
  // PESSOAS: DIVERSIDADE DE TONS, CABELOS E ESTILOS
  // ==========================================
  {
    id: 'avatar-lucas-bone',
    name: 'Lucas (Boné)',
    category: 'pessoas',
    description: 'Boné laranja e estilo esportivo',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-lucas" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3B82F6"/>
          <stop offset="100%" stop-color="#1D4ED8"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-lucas)"/>
      <path d="M22 92 C22 75 35 68 50 68 C65 68 78 75 78 92 Z" fill="#1E293B"/>
      <path d="M42 66 L58 66 L58 75 L42 75 Z" fill="#FCD0B1"/>
      <circle cx="50" cy="48" r="21" fill="#FCD0B1"/>
      <!-- Olhos e sorriso -->
      <circle cx="43" cy="48" r="2.5" fill="#1E293B"/>
      <circle cx="57" cy="48" r="2.5" fill="#1E293B"/>
      <path d="M46 56 Q50 60 54 56" stroke="#C2410C" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Boné -->
      <path d="M28 42 C28 30 72 30 72 42 Z" fill="#F97316"/>
      <path d="M30 42 C30 38 70 38 70 42 C78 44 82 46 82 48 L46 48 Z" fill="#EA580C"/>
      <circle cx="50" cy="30" r="3" fill="#C2410C"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-lucas" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3B82F6"/>
          <stop offset="100%" stop-color="#1D4ED8"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-lucas)"/>
      <path d="M22 92 C22 75 35 68 50 68 C65 68 78 75 78 92 Z" fill="#1E293B"/>
      <path d="M42 66 L58 66 L58 75 L42 75 Z" fill="#FCD0B1"/>
      <circle cx="50" cy="48" r="21" fill="#FCD0B1"/>
      <circle cx="43" cy="48" r="2.5" fill="#1E293B"/>
      <circle cx="57" cy="48" r="2.5" fill="#1E293B"/>
      <path d="M46 56 Q50 60 54 56" stroke="#C2410C" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M28 42 C28 30 72 30 72 42 Z" fill="#F97316"/>
      <path d="M30 42 C30 38 70 38 70 42 C78 44 82 46 82 48 L46 48 Z" fill="#EA580C"/>
      <circle cx="50" cy="30" r="3" fill="#C2410C"/>
    </svg>`),
  },
  {
    id: 'avatar-camila-cachos',
    name: 'Camila (Cachos)',
    category: 'pessoas',
    description: 'Cabelos cacheados volumosos castanhos',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-camila" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#8B5CF6"/>
          <stop offset="100%" stop-color="#6D28D9"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-camila)"/>
      <!-- Fundo Cabelo Cacheado -->
      <circle cx="30" cy="36" r="14" fill="#3E2723"/>
      <circle cx="70" cy="36" r="14" fill="#3E2723"/>
      <circle cx="28" cy="50" r="13" fill="#3E2723"/>
      <circle cx="72" cy="50" r="13" fill="#3E2723"/>
      <circle cx="50" cy="28" r="16" fill="#3E2723"/>
      <path d="M24 92 C24 76 36 70 50 70 C64 70 76 76 76 92 Z" fill="#F43F5E"/>
      <path d="M43 68 L57 68 L57 76 L43 76 Z" fill="#DF9B68"/>
      <circle cx="50" cy="50" r="20" fill="#DF9B68"/>
      <circle cx="43" cy="50" r="2.5" fill="#2E1C14"/>
      <circle cx="57" cy="50" r="2.5" fill="#2E1C14"/>
      <path d="M45 58 Q50 63 55 58" stroke="#9A3412" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="38" cy="54" r="3" fill="#F43F5E" opacity="0.4"/>
      <circle cx="62" cy="54" r="3" fill="#F43F5E" opacity="0.4"/>
      <!-- Cachos na testa -->
      <circle cx="40" cy="33" r="7" fill="#3E2723"/>
      <circle cx="50" cy="31" r="8" fill="#3E2723"/>
      <circle cx="60" cy="33" r="7" fill="#3E2723"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-camila" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#8B5CF6"/>
          <stop offset="100%" stop-color="#6D28D9"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-camila)"/>
      <circle cx="30" cy="36" r="14" fill="#3E2723"/>
      <circle cx="70" cy="36" r="14" fill="#3E2723"/>
      <circle cx="28" cy="50" r="13" fill="#3E2723"/>
      <circle cx="72" cy="50" r="13" fill="#3E2723"/>
      <circle cx="50" cy="28" r="16" fill="#3E2723"/>
      <path d="M24 92 C24 76 36 70 50 70 C64 70 76 76 76 92 Z" fill="#F43F5E"/>
      <path d="M43 68 L57 68 L57 76 L43 76 Z" fill="#DF9B68"/>
      <circle cx="50" cy="50" r="20" fill="#DF9B68"/>
      <circle cx="43" cy="50" r="2.5" fill="#2E1C14"/>
      <circle cx="57" cy="50" r="2.5" fill="#2E1C14"/>
      <path d="M45 58 Q50 63 55 58" stroke="#9A3412" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="38" cy="54" r="3" fill="#F43F5E" opacity="0.4"/>
      <circle cx="62" cy="54" r="3" fill="#F43F5E" opacity="0.4"/>
      <circle cx="40" cy="33" r="7" fill="#3E2723"/>
      <circle cx="50" cy="31" r="8" fill="#3E2723"/>
      <circle cx="60" cy="33" r="7" fill="#3E2723"/>
    </svg>`),
  },
  {
    id: 'avatar-mateus-blackpower',
    name: 'Mateus (Black Power)',
    category: 'pessoas',
    description: 'Pele negra com black power marcante',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-mateus" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F59E0B"/>
          <stop offset="100%" stop-color="#D97706"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-mateus)"/>
      <!-- Black power circular imponente -->
      <circle cx="50" cy="40" r="30" fill="#171717"/>
      <path d="M22 92 C22 75 35 68 50 68 C65 68 78 75 78 92 Z" fill="#047857"/>
      <path d="M42 66 L58 66 L58 75 L42 75 Z" fill="#4E2818"/>
      <circle cx="50" cy="52" r="19" fill="#4E2818"/>
      <circle cx="44" cy="52" r="2.5" fill="#FFFFFF"/>
      <circle cx="56" cy="52" r="2.5" fill="#FFFFFF"/>
      <circle cx="44" cy="52" r="1.5" fill="#000000"/>
      <circle cx="56" cy="52" r="1.5" fill="#000000"/>
      <path d="M45 61 Q50 66 55 61" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-mateus" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F59E0B"/>
          <stop offset="100%" stop-color="#D97706"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-mateus)"/>
      <circle cx="50" cy="40" r="30" fill="#171717"/>
      <path d="M22 92 C22 75 35 68 50 68 C65 68 78 75 78 92 Z" fill="#047857"/>
      <path d="M42 66 L58 66 L58 75 L42 75 Z" fill="#4E2818"/>
      <circle cx="50" cy="52" r="19" fill="#4E2818"/>
      <circle cx="44" cy="52" r="2.5" fill="#FFFFFF"/>
      <circle cx="56" cy="52" r="2.5" fill="#FFFFFF"/>
      <circle cx="44" cy="52" r="1.5" fill="#000000"/>
      <circle cx="56" cy="52" r="1.5" fill="#000000"/>
      <path d="M45 61 Q50 66 55 61" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`),
  },
  {
    id: 'avatar-juliana-trancas',
    name: 'Juliana (Tranças)',
    category: 'pessoas',
    description: 'Tranças afro elegantes com anéis dourados',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-juliana" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10B981"/>
          <stop offset="100%" stop-color="#059669"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-juliana)"/>
      <!-- Tranças laterais longas -->
      <rect x="23" y="38" width="8" height="42" rx="4" fill="#1C1917"/>
      <rect x="30" y="35" width="8" height="46" rx="4" fill="#292524"/>
      <rect x="62" y="35" width="8" height="46" rx="4" fill="#292524"/>
      <rect x="69" y="38" width="8" height="42" rx="4" fill="#1C1917"/>
      <!-- Anéis dourados -->
      <circle cx="27" cy="55" r="2.5" fill="#FBBF24"/>
      <circle cx="73" cy="62" r="2.5" fill="#FBBF24"/>
      <path d="M24 92 C24 76 36 70 50 70 C64 70 76 76 76 92 Z" fill="#6366F1"/>
      <path d="M43 66 L57 66 L57 74 L43 74 Z" fill="#6A3821"/>
      <circle cx="50" cy="48" r="20" fill="#6A3821"/>
      <!-- Cabelo topo -->
      <path d="M30 40 C30 26 70 26 70 40 Z" fill="#1C1917"/>
      <circle cx="43" cy="48" r="2.5" fill="#FFFFFF"/>
      <circle cx="57" cy="48" r="2.5" fill="#FFFFFF"/>
      <circle cx="43" cy="48" r="1.5" fill="#1C1917"/>
      <circle cx="57" cy="48" r="1.5" fill="#1C1917"/>
      <path d="M45 56 Q50 61 55 56" stroke="#F43F5E" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-juliana" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10B981"/>
          <stop offset="100%" stop-color="#059669"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-juliana)"/>
      <rect x="23" y="38" width="8" height="42" rx="4" fill="#1C1917"/>
      <rect x="30" y="35" width="8" height="46" rx="4" fill="#292524"/>
      <rect x="62" y="35" width="8" height="46" rx="4" fill="#292524"/>
      <rect x="69" y="38" width="8" height="42" rx="4" fill="#1C1917"/>
      <circle cx="27" cy="55" r="2.5" fill="#FBBF24"/>
      <circle cx="73" cy="62" r="2.5" fill="#FBBF24"/>
      <path d="M24 92 C24 76 36 70 50 70 C64 70 76 76 76 92 Z" fill="#6366F1"/>
      <path d="M43 66 L57 66 L57 74 L43 74 Z" fill="#6A3821"/>
      <circle cx="50" cy="48" r="20" fill="#6A3821"/>
      <path d="M30 40 C30 26 70 26 70 40 Z" fill="#1C1917"/>
      <circle cx="43" cy="48" r="2.5" fill="#FFFFFF"/>
      <circle cx="57" cy="48" r="2.5" fill="#FFFFFF"/>
      <circle cx="43" cy="48" r="1.5" fill="#1C1917"/>
      <circle cx="57" cy="48" r="1.5" fill="#1C1917"/>
      <path d="M45 56 Q50 61 55 56" stroke="#F43F5E" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>`),
  },
  {
    id: 'avatar-rodrigo-oculos',
    name: 'Rodrigo (Óculos & Barba)',
    category: 'pessoas',
    description: 'Armação moderna e barba cuidada',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-rodrigo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#1E293B"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-rodrigo)"/>
      <path d="M22 92 C22 75 35 68 50 68 C65 68 78 75 78 92 Z" fill="#D97706"/>
      <path d="M42 66 L58 66 L58 75 L42 75 Z" fill="#E8B085"/>
      <circle cx="50" cy="48" r="20" fill="#E8B085"/>
      <!-- Cabelo curto -->
      <path d="M30 42 C30 28 70 28 70 42 C64 36 36 36 30 42 Z" fill="#332418"/>
      <!-- Barba -->
      <path d="M36 50 C36 68 64 68 64 50 C64 62 36 62 36 50 Z" fill="#332418"/>
      <!-- Óculos quadrados -->
      <rect x="36" y="44" width="11" height="9" rx="2" fill="none" stroke="#F8FAFC" stroke-width="2"/>
      <rect x="53" y="44" width="11" height="9" rx="2" fill="none" stroke="#F8FAFC" stroke-width="2"/>
      <line x1="47" y1="48" x2="53" y2="48" stroke="#F8FAFC" stroke-width="2"/>
      <path d="M47 57 Q50 60 53 57" stroke="#FFFFFF" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-rodrigo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#1E293B"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-rodrigo)"/>
      <path d="M22 92 C22 75 35 68 50 68 C65 68 78 75 78 92 Z" fill="#D97706"/>
      <path d="M42 66 L58 66 L58 75 L42 75 Z" fill="#E8B085"/>
      <circle cx="50" cy="48" r="20" fill="#E8B085"/>
      <path d="M30 42 C30 28 70 28 70 42 C64 36 36 36 30 42 Z" fill="#332418"/>
      <path d="M36 50 C36 68 64 68 64 50 C64 62 36 62 36 50 Z" fill="#332418"/>
      <rect x="36" y="44" width="11" height="9" rx="2" fill="none" stroke="#F8FAFC" stroke-width="2"/>
      <rect x="53" y="44" width="11" height="9" rx="2" fill="none" stroke="#F8FAFC" stroke-width="2"/>
      <line x1="47" y1="48" x2="53" y2="48" stroke="#F8FAFC" stroke-width="2"/>
      <path d="M47 57 Q50 60 53 57" stroke="#FFFFFF" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    </svg>`),
  },
  {
    id: 'avatar-beatriz-rosa',
    name: 'Beatriz (Cabelo Rosa)',
    category: 'pessoas',
    description: 'Estilo descolado com cabelo curto rosa pastel',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-beatriz" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#EC4899"/>
          <stop offset="100%" stop-color="#BE185D"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-beatriz)"/>
      <path d="M24 92 C24 76 36 70 50 70 C64 70 76 76 76 92 Z" fill="#0F172A"/>
      <path d="M43 68 L57 68 L57 76 L43 76 Z" fill="#FFDFC4"/>
      <circle cx="50" cy="50" r="20" fill="#FFDFC4"/>
      <!-- Cabelo Rosa com corte assimétrico -->
      <path d="M28 48 C26 32 36 24 50 24 C66 24 74 34 74 46 C68 36 60 34 50 34 C38 34 32 40 28 48 Z" fill="#F472B6"/>
      <path d="M28 48 C30 58 35 60 35 60 L33 46 Z" fill="#F472B6"/>
      <circle cx="43" cy="50" r="2.5" fill="#374151"/>
      <circle cx="57" cy="50" r="2.5" fill="#374151"/>
      <path d="M46 58 Q50 62 54 58" stroke="#BE185D" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="39" cy="54" r="2.5" fill="#F472B6" opacity="0.6"/>
      <circle cx="61" cy="54" r="2.5" fill="#F472B6" opacity="0.6"/>
      <circle cx="70" cy="54" r="2" fill="#FBBF24"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-beatriz" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#EC4899"/>
          <stop offset="100%" stop-color="#BE185D"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-beatriz)"/>
      <path d="M24 92 C24 76 36 70 50 70 C64 70 76 76 76 92 Z" fill="#0F172A"/>
      <path d="M43 68 L57 68 L57 76 L43 76 Z" fill="#FFDFC4"/>
      <circle cx="50" cy="50" r="20" fill="#FFDFC4"/>
      <path d="M28 48 C26 32 36 24 50 24 C66 24 74 34 74 46 C68 36 60 34 50 34 C38 34 32 40 28 48 Z" fill="#F472B6"/>
      <path d="M28 48 C30 58 35 60 35 60 L33 46 Z" fill="#F472B6"/>
      <circle cx="43" cy="50" r="2.5" fill="#374151"/>
      <circle cx="57" cy="50" r="2.5" fill="#374151"/>
      <path d="M46 58 Q50 62 54 58" stroke="#BE185D" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="39" cy="54" r="2.5" fill="#F472B6" opacity="0.6"/>
      <circle cx="61" cy="54" r="2.5" fill="#F472B6" opacity="0.6"/>
      <circle cx="70" cy="54" r="2" fill="#FBBF24"/>
    </svg>`),
  },
  {
    id: 'avatar-gabriel-loiro',
    name: 'Gabriel (Topete)',
    category: 'pessoas',
    description: 'Pele clara e topete loiro volumoso',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-gabriel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284C7"/>
          <stop offset="100%" stop-color="#0369A1"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-gabriel)"/>
      <path d="M22 92 C22 75 35 68 50 68 C65 68 78 75 78 92 Z" fill="#38BDF8"/>
      <path d="M42 66 L58 66 L58 75 L42 75 Z" fill="#FCD0B1"/>
      <circle cx="50" cy="48" r="20" fill="#FCD0B1"/>
      <!-- Topete loiro -->
      <path d="M30 42 C30 26 40 18 56 20 C68 22 72 32 70 42 C62 34 40 34 30 42 Z" fill="#FDE047"/>
      <circle cx="43" cy="49" r="2.5" fill="#1E293B"/>
      <circle cx="57" cy="49" r="2.5" fill="#1E293B"/>
      <path d="M46 57 Q50 61 54 57" stroke="#EA580C" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-gabriel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284C7"/>
          <stop offset="100%" stop-color="#0369A1"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-gabriel)"/>
      <path d="M22 92 C22 75 35 68 50 68 C65 68 78 75 78 92 Z" fill="#38BDF8"/>
      <path d="M42 66 L58 66 L58 75 L42 75 Z" fill="#FCD0B1"/>
      <circle cx="50" cy="48" r="20" fill="#FCD0B1"/>
      <path d="M30 42 C30 26 40 18 56 20 C68 22 72 32 70 42 C62 34 40 34 30 42 Z" fill="#FDE047"/>
      <circle cx="43" cy="49" r="2.5" fill="#1E293B"/>
      <circle cx="57" cy="49" r="2.5" fill="#1E293B"/>
      <path d="M46 57 Q50 61 54 57" stroke="#EA580C" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`),
  },
  {
    id: 'avatar-aline-dreads',
    name: 'Aline (Dreadlocks)',
    category: 'pessoas',
    description: 'Dreadlocks castanhos e argola dourada',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-aline" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#EA580C"/>
          <stop offset="100%" stop-color="#C2410C"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-aline)"/>
      <!-- Dreads compridos -->
      <rect x="22" y="34" width="7" height="48" rx="3.5" fill="#2E1C14"/>
      <rect x="28" y="32" width="7" height="52" rx="3.5" fill="#422006"/>
      <rect x="65" y="32" width="7" height="52" rx="3.5" fill="#422006"/>
      <rect x="71" y="34" width="7" height="48" rx="3.5" fill="#2E1C14"/>
      <path d="M24 92 C24 76 36 70 50 70 C64 70 76 76 76 92 Z" fill="#0284C7"/>
      <path d="M43 68 L57 68 L57 76 L43 76 Z" fill="#BA7345"/>
      <circle cx="50" cy="50" r="19" fill="#BA7345"/>
      <!-- Topo dos dreads -->
      <path d="M30 40 C30 24 70 24 70 40 Z" fill="#2E1C14"/>
      <circle cx="43" cy="50" r="2.5" fill="#FFFFFF"/>
      <circle cx="57" cy="50" r="2.5" fill="#FFFFFF"/>
      <circle cx="43" cy="50" r="1.5" fill="#000000"/>
      <circle cx="57" cy="50" r="1.5" fill="#000000"/>
      <path d="M45 59 Q50 63 55 59" stroke="#7C2D12" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="73" cy="54" r="2.5" fill="none" stroke="#FBBF24" stroke-width="1.5"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-aline" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#EA580C"/>
          <stop offset="100%" stop-color="#C2410C"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-aline)"/>
      <rect x="22" y="34" width="7" height="48" rx="3.5" fill="#2E1C14"/>
      <rect x="28" y="32" width="7" height="52" rx="3.5" fill="#422006"/>
      <rect x="65" y="32" width="7" height="52" rx="3.5" fill="#422006"/>
      <rect x="71" y="34" width="7" height="48" rx="3.5" fill="#2E1C14"/>
      <path d="M24 92 C24 76 36 70 50 70 C64 70 76 76 76 92 Z" fill="#0284C7"/>
      <path d="M43 68 L57 68 L57 76 L43 76 Z" fill="#BA7345"/>
      <circle cx="50" cy="50" r="19" fill="#BA7345"/>
      <path d="M30 40 C30 24 70 24 70 40 Z" fill="#2E1C14"/>
      <circle cx="43" cy="50" r="2.5" fill="#FFFFFF"/>
      <circle cx="57" cy="50" r="2.5" fill="#FFFFFF"/>
      <circle cx="43" cy="50" r="1.5" fill="#000000"/>
      <circle cx="57" cy="50" r="1.5" fill="#000000"/>
      <path d="M45 59 Q50 63 55 59" stroke="#7C2D12" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="73" cy="54" r="2.5" fill="none" stroke="#FBBF24" stroke-width="1.5"/>
    </svg>`),
  },
  {
    id: 'avatar-rafael-fones',
    name: 'Rafael (Headset)',
    category: 'pessoas',
    description: 'Fone de ouvido no pescoço e vibe jovem',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-rafael" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#06B6D4"/>
          <stop offset="100%" stop-color="#0891B2"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-rafael)"/>
      <path d="M22 92 C22 75 35 68 50 68 C65 68 78 75 78 92 Z" fill="#475569"/>
      <path d="M42 66 L58 66 L58 75 L42 75 Z" fill="#DF9B68"/>
      <!-- Fone de ouvido no pescoço -->
      <path d="M32 68 C32 78 68 78 68 68" stroke="#0F172A" stroke-width="4" fill="none"/>
      <rect x="28" y="64" width="7" height="12" rx="3" fill="#F43F5E"/>
      <rect x="65" y="64" width="7" height="12" rx="3" fill="#F43F5E"/>
      <circle cx="50" cy="48" r="20" fill="#DF9B68"/>
      <path d="M30 42 C30 28 70 28 70 42 C60 34 40 34 30 42 Z" fill="#18181B"/>
      <circle cx="43" cy="49" r="2.5" fill="#18181B"/>
      <circle cx="57" cy="49" r="2.5" fill="#18181B"/>
      <path d="M46 57 Q50 61 54 57" stroke="#9A3412" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-rafael" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#06B6D4"/>
          <stop offset="100%" stop-color="#0891B2"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-rafael)"/>
      <path d="M22 92 C22 75 35 68 50 68 C65 68 78 75 78 92 Z" fill="#475569"/>
      <path d="M42 66 L58 66 L58 75 L42 75 Z" fill="#DF9B68"/>
      <path d="M32 68 C32 78 68 78 68 68" stroke="#0F172A" stroke-width="4" fill="none"/>
      <rect x="28" y="64" width="7" height="12" rx="3" fill="#F43F5E"/>
      <rect x="65" y="64" width="7" height="12" rx="3" fill="#F43F5E"/>
      <circle cx="50" cy="48" r="20" fill="#DF9B68"/>
      <path d="M30 42 C30 28 70 28 70 42 C60 34 40 34 30 42 Z" fill="#18181B"/>
      <circle cx="43" cy="49" r="2.5" fill="#18181B"/>
      <circle cx="57" cy="49" r="2.5" fill="#18181B"/>
      <path d="M46 57 Q50 61 54 57" stroke="#9A3412" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`),
  },
  {
    id: 'avatar-fernanda-franja',
    name: 'Fernanda (Franja Lisa)',
    category: 'pessoas',
    description: 'Cabelo liso com franja moderna',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-fernanda" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#E11D48"/>
          <stop offset="100%" stop-color="#9F1239"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-fernanda)"/>
      <!-- Cabelo atrás -->
      <path d="M26 40 L26 75 C26 75 35 78 50 78 C65 78 74 75 74 75 L74 40 Z" fill="#1E1B4B"/>
      <path d="M24 92 C24 76 36 70 50 70 C64 70 76 76 76 92 Z" fill="#FBBF24"/>
      <path d="M43 68 L57 68 L57 76 L43 76 Z" fill="#FFDFC4"/>
      <circle cx="50" cy="50" r="19" fill="#FFDFC4"/>
      <!-- Franja reta -->
      <path d="M30 42 C30 26 70 26 70 42 L70 46 C60 44 40 44 30 46 Z" fill="#1E1B4B"/>
      <circle cx="42" cy="51" r="2.5" fill="#1E1B4B"/>
      <circle cx="58" cy="51" r="2.5" fill="#1E1B4B"/>
      <path d="M45 59 Q50 63 55 59" stroke="#E11D48" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="37" cy="55" r="3" fill="#FDA4AF" opacity="0.6"/>
      <circle cx="63" cy="55" r="3" fill="#FDA4AF" opacity="0.6"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-fernanda" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#E11D48"/>
          <stop offset="100%" stop-color="#9F1239"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-fernanda)"/>
      <path d="M26 40 L26 75 C26 75 35 78 50 78 C65 78 74 75 74 75 L74 40 Z" fill="#1E1B4B"/>
      <path d="M24 92 C24 76 36 70 50 70 C64 70 76 76 76 92 Z" fill="#FBBF24"/>
      <path d="M43 68 L57 68 L57 76 L43 76 Z" fill="#FFDFC4"/>
      <circle cx="50" cy="50" r="19" fill="#FFDFC4"/>
      <path d="M30 42 C30 26 70 26 70 42 L70 46 C60 44 40 44 30 46 Z" fill="#1E1B4B"/>
      <circle cx="42" cy="51" r="2.5" fill="#1E1B4B"/>
      <circle cx="58" cy="51" r="2.5" fill="#1E1B4B"/>
      <path d="M45 59 Q50 63 55 59" stroke="#E11D48" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="37" cy="55" r="3" fill="#FDA4AF" opacity="0.6"/>
      <circle cx="63" cy="55" r="3" fill="#FDA4AF" opacity="0.6"/>
    </svg>`),
  },
  {
    id: 'avatar-diego-cavanhaque',
    name: 'Diego (Cavanhaque)',
    category: 'pessoas',
    description: 'Careca estiloso com cavanhaque esculpido',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-diego" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4F46E5"/>
          <stop offset="100%" stop-color="#3730A3"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-diego)"/>
      <path d="M22 92 C22 75 35 68 50 68 C65 68 78 75 78 92 Z" fill="#E11D48"/>
      <path d="M42 66 L58 66 L58 75 L42 75 Z" fill="#3A1D10"/>
      <!-- Cabeça raspada -->
      <circle cx="50" cy="48" r="21" fill="#3A1D10"/>
      <circle cx="43" cy="47" r="2.5" fill="#FFFFFF"/>
      <circle cx="57" cy="47" r="2.5" fill="#FFFFFF"/>
      <circle cx="43" cy="47" r="1.5" fill="#000000"/>
      <circle cx="57" cy="47" r="1.5" fill="#000000"/>
      <!-- Cavanhaque -->
      <path d="M42 55 L58 55 L54 67 L46 67 Z" fill="#171717"/>
      <path d="M45 59 Q50 63 55 59" stroke="#FFFFFF" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <circle cx="30" cy="50" r="2" fill="#FBBF24"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-diego" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4F46E5"/>
          <stop offset="100%" stop-color="#3730A3"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-diego)"/>
      <path d="M22 92 C22 75 35 68 50 68 C65 68 78 75 78 92 Z" fill="#E11D48"/>
      <path d="M42 66 L58 66 L58 75 L42 75 Z" fill="#3A1D10"/>
      <circle cx="50" cy="48" r="21" fill="#3A1D10"/>
      <circle cx="43" cy="47" r="2.5" fill="#FFFFFF"/>
      <circle cx="57" cy="47" r="2.5" fill="#FFFFFF"/>
      <circle cx="43" cy="47" r="1.5" fill="#000000"/>
      <circle cx="57" cy="47" r="1.5" fill="#000000"/>
      <path d="M42 55 L58 55 L54 67 L46 67 Z" fill="#171717"/>
      <path d="M45 59 Q50 63 55 59" stroke="#FFFFFF" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <circle cx="30" cy="50" r="2" fill="#FBBF24"/>
    </svg>`),
  },
  {
    id: 'avatar-mariana-ondulada',
    name: 'Mariana (Ondulado)',
    category: 'pessoas',
    description: 'Cabelo longo e ondulado dourado',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-mariana" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#14B8A6"/>
          <stop offset="100%" stop-color="#0F766E"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-mariana)"/>
      <!-- Cabelo atrás -->
      <path d="M24 44 C20 62 26 80 34 84 L66 84 C74 80 80 62 76 44 Z" fill="#CA8A04"/>
      <path d="M24 92 C24 76 36 70 50 70 C64 70 76 76 76 92 Z" fill="#7C3AED"/>
      <path d="M43 68 L57 68 L57 76 L43 76 Z" fill="#FCD0B1"/>
      <circle cx="50" cy="50" r="19" fill="#FCD0B1"/>
      <path d="M30 42 C30 26 70 26 70 42 C60 36 40 36 30 42 Z" fill="#EAB308"/>
      <circle cx="43" cy="50" r="2.5" fill="#334155"/>
      <circle cx="57" cy="50" r="2.5" fill="#334155"/>
      <path d="M45 58 Q50 62 55 58" stroke="#DC2626" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-mariana" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#14B8A6"/>
          <stop offset="100%" stop-color="#0F766E"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-mariana)"/>
      <path d="M24 44 C20 62 26 80 34 84 L66 84 C74 80 80 62 76 44 Z" fill="#CA8A04"/>
      <path d="M24 92 C24 76 36 70 50 70 C64 70 76 76 76 92 Z" fill="#7C3AED"/>
      <path d="M43 68 L57 68 L57 76 L43 76 Z" fill="#FCD0B1"/>
      <circle cx="50" cy="50" r="19" fill="#FCD0B1"/>
      <path d="M30 42 C30 26 70 26 70 42 C60 36 40 36 30 42 Z" fill="#EAB308"/>
      <circle cx="43" cy="50" r="2.5" fill="#334155"/>
      <circle cx="57" cy="50" r="2.5" fill="#334155"/>
      <path d="M45 58 Q50 62 55 58" stroke="#DC2626" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`),
  },
  {
    id: 'avatar-thiago-bandana',
    name: 'Thiago (Bandana)',
    category: 'pessoas',
    description: 'Bandana vermelha e visual urbano',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-thiago" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="100%" stop-color="#0F172A"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-thiago)"/>
      <path d="M22 92 C22 75 35 68 50 68 C65 68 78 75 78 92 Z" fill="#2563EB"/>
      <path d="M42 66 L58 66 L58 75 L42 75 Z" fill="#DF9B68"/>
      <circle cx="50" cy="48" r="20" fill="#DF9B68"/>
      <!-- Bandana -->
      <path d="M28 42 L72 42 L70 34 L30 34 Z" fill="#DC2626"/>
      <circle cx="43" cy="49" r="2.5" fill="#0F172A"/>
      <circle cx="57" cy="49" r="2.5" fill="#0F172A"/>
      <path d="M46 57 Q50 61 54 57" stroke="#9A3412" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-thiago" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="100%" stop-color="#0F172A"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-thiago)"/>
      <path d="M22 92 C22 75 35 68 50 68 C65 68 78 75 78 92 Z" fill="#2563EB"/>
      <path d="M42 66 L58 66 L58 75 L42 75 Z" fill="#DF9B68"/>
      <circle cx="50" cy="48" r="20" fill="#DF9B68"/>
      <path d="M28 42 L72 42 L70 34 L30 34 Z" fill="#DC2626"/>
      <circle cx="43" cy="49" r="2.5" fill="#0F172A"/>
      <circle cx="57" cy="49" r="2.5" fill="#0F172A"/>
      <path d="M46 57 Q50 61 54 57" stroke="#9A3412" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`),
  },
  {
    id: 'avatar-vanessa-afro',
    name: 'Vanessa (Afro Curto)',
    category: 'pessoas',
    description: 'Pele negra com corte afro curto estilizado',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-vanessa" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FBBF24"/>
          <stop offset="100%" stop-color="#F59E0B"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-vanessa)"/>
      <!-- Cabelo afro curto arredondado -->
      <circle cx="50" cy="42" r="24" fill="#1C1917"/>
      <path d="M24 92 C24 76 36 70 50 70 C64 70 76 76 76 92 Z" fill="#4338CA"/>
      <path d="M43 68 L57 68 L57 76 L43 76 Z" fill="#4E2818"/>
      <circle cx="50" cy="50" r="19" fill="#4E2818"/>
      <circle cx="43" cy="49" r="2.5" fill="#FFFFFF"/>
      <circle cx="57" cy="49" r="2.5" fill="#FFFFFF"/>
      <circle cx="43" cy="49" r="1.5" fill="#000000"/>
      <circle cx="57" cy="49" r="1.5" fill="#000000"/>
      <path d="M45 58 Q50 63 55 58" stroke="#F43F5E" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <!-- Brincos de argola grandes -->
      <circle cx="31" cy="53" r="3" fill="none" stroke="#FFFFFF" stroke-width="1.5"/>
      <circle cx="69" cy="53" r="3" fill="none" stroke="#FFFFFF" stroke-width="1.5"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-vanessa" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FBBF24"/>
          <stop offset="100%" stop-color="#F59E0B"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-vanessa)"/>
      <circle cx="50" cy="42" r="24" fill="#1C1917"/>
      <path d="M24 92 C24 76 36 70 50 70 C64 70 76 76 76 92 Z" fill="#4338CA"/>
      <path d="M43 68 L57 68 L57 76 L43 76 Z" fill="#4E2818"/>
      <circle cx="50" cy="50" r="19" fill="#4E2818"/>
      <circle cx="43" cy="49" r="2.5" fill="#FFFFFF"/>
      <circle cx="57" cy="49" r="2.5" fill="#FFFFFF"/>
      <circle cx="43" cy="49" r="1.5" fill="#000000"/>
      <circle cx="57" cy="49" r="1.5" fill="#000000"/>
      <path d="M45 58 Q50 63 55 58" stroke="#F43F5E" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="31" cy="53" r="3" fill="none" stroke="#FFFFFF" stroke-width="1.5"/>
      <circle cx="69" cy="53" r="3" fill="none" stroke="#FFFFFF" stroke-width="1.5"/>
    </svg>`),
  },
  {
    id: 'avatar-arthur-bigode',
    name: 'Arthur (Bigode Retrô)',
    category: 'pessoas',
    description: 'Visual clássico de lanchonete retrô',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-arthur" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#65A30D"/>
          <stop offset="100%" stop-color="#4D7C0F"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-arthur)"/>
      <path d="M22 92 C22 75 35 68 50 68 C65 68 78 75 78 92 Z" fill="#047857"/>
      <path d="M42 66 L58 66 L58 75 L42 75 Z" fill="#FCD0B1"/>
      <circle cx="50" cy="48" r="20" fill="#FCD0B1"/>
      <path d="M30 42 C30 26 70 26 70 42 C64 36 36 36 30 42 Z" fill="#451A03"/>
      <circle cx="43" cy="47" r="2.5" fill="#451A03"/>
      <circle cx="57" cy="47" r="2.5" fill="#451A03"/>
      <!-- Bigode curvado -->
      <path d="M42 56 C46 54 48 56 50 54 C52 56 54 54 58 56 C60 58 56 61 50 58 C44 61 40 58 42 56 Z" fill="#451A03"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-arthur" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#65A30D"/>
          <stop offset="100%" stop-color="#4D7C0F"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-arthur)"/>
      <path d="M22 92 C22 75 35 68 50 68 C65 68 78 75 78 92 Z" fill="#047857"/>
      <path d="M42 66 L58 66 L58 75 L42 75 Z" fill="#FCD0B1"/>
      <circle cx="50" cy="48" r="20" fill="#FCD0B1"/>
      <path d="M30 42 C30 26 70 26 70 42 C64 36 36 36 30 42 Z" fill="#451A03"/>
      <circle cx="43" cy="47" r="2.5" fill="#451A03"/>
      <circle cx="57" cy="47" r="2.5" fill="#451A03"/>
      <path d="M42 56 C46 54 48 56 50 54 C52 56 54 54 58 56 C60 58 56 61 50 58 C44 61 40 58 42 56 Z" fill="#451A03"/>
    </svg>`),
  },
  {
    id: 'avatar-larissa-coque',
    name: 'Larissa (Coque Alto)',
    category: 'pessoas',
    description: 'Pele morena e coque alto moderno',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-larissa" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#D946EF"/>
          <stop offset="100%" stop-color="#A21CAF"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-larissa)"/>
      <!-- Coque alto redondo -->
      <circle cx="50" cy="22" r="12" fill="#18181B"/>
      <path d="M24 92 C24 76 36 70 50 70 C64 70 76 76 76 92 Z" fill="#0284C7"/>
      <path d="M43 68 L57 68 L57 76 L43 76 Z" fill="#BA7345"/>
      <circle cx="50" cy="50" r="19" fill="#BA7345"/>
      <path d="M30 44 C30 28 70 28 70 44 Z" fill="#18181B"/>
      <circle cx="43" cy="50" r="2.5" fill="#18181B"/>
      <circle cx="57" cy="50" r="2.5" fill="#18181B"/>
      <path d="M45 59 Q50 63 55 59" stroke="#E11D48" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="30" cy="52" r="2.5" fill="none" stroke="#FBBF24" stroke-width="1.5"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-larissa" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#D946EF"/>
          <stop offset="100%" stop-color="#A21CAF"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-larissa)"/>
      <circle cx="50" cy="22" r="12" fill="#18181B"/>
      <path d="M24 92 C24 76 36 70 50 70 C64 70 76 76 76 92 Z" fill="#0284C7"/>
      <path d="M43 68 L57 68 L57 76 L43 76 Z" fill="#BA7345"/>
      <circle cx="50" cy="50" r="19" fill="#BA7345"/>
      <path d="M30 44 C30 28 70 28 70 44 Z" fill="#18181B"/>
      <circle cx="43" cy="50" r="2.5" fill="#18181B"/>
      <circle cx="57" cy="50" r="2.5" fill="#18181B"/>
      <path d="M45 59 Q50 63 55 59" stroke="#E11D48" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="30" cy="52" r="2.5" fill="none" stroke="#FBBF24" stroke-width="1.5"/>
    </svg>`),
  },

  // ==========================================
  // PERSONAGENS & MASCOTES DE ALIMENTOS (ZAP LANCHE)
  // ==========================================
  {
    id: 'avatar-snack-burger',
    name: 'Smash Burger',
    category: 'lanches',
    description: 'Hambúrguer com cheddar derretido e sorriso',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-s-burger" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#EA580C"/>
          <stop offset="100%" stop-color="#9A3412"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-s-burger)"/>
      <!-- Pão Superior -->
      <path d="M22 45 C22 25 78 25 78 45 Z" fill="#F59E0B"/>
      <!-- Gergelins -->
      <ellipse cx="38" cy="34" rx="2" ry="1" fill="#FEF3C7"/>
      <ellipse cx="50" cy="31" rx="2" ry="1" fill="#FEF3C7"/>
      <ellipse cx="62" cy="35" rx="2" ry="1" fill="#FEF3C7"/>
      <!-- Alface -->
      <path d="M20 45 Q26 48 32 45 Q38 48 44 45 Q50 48 56 45 Q62 48 68 45 Q74 48 80 45 L80 49 L20 49 Z" fill="#22C55E"/>
      <!-- Carne Smash -->
      <rect x="20" y="49" width="60" height="12" rx="4" fill="#451A03"/>
      <!-- Queijo Cheddar Derretendo -->
      <path d="M22 55 L38 55 L42 63 L46 55 L78 55 L78 58 L22 58 Z" fill="#FBBF24"/>
      <!-- Pão Inferior -->
      <path d="M24 64 C24 74 76 74 76 64 Z" fill="#F59E0B"/>
      <!-- Olhos fofos -->
      <circle cx="42" cy="40" r="3" fill="#1C1917"/>
      <circle cx="58" cy="40" r="3" fill="#1C1917"/>
      <circle cx="43" cy="39" r="1" fill="#FFFFFF"/>
      <circle cx="59" cy="39" r="1" fill="#FFFFFF"/>
      <path d="M46 44 Q50 48 54 44" stroke="#B45309" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="36" cy="43" r="2.5" fill="#EF4444" opacity="0.6"/>
      <circle cx="64" cy="43" r="2.5" fill="#EF4444" opacity="0.6"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-s-burger" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#EA580C"/>
          <stop offset="100%" stop-color="#9A3412"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-s-burger)"/>
      <path d="M22 45 C22 25 78 25 78 45 Z" fill="#F59E0B"/>
      <ellipse cx="38" cy="34" rx="2" ry="1" fill="#FEF3C7"/>
      <ellipse cx="50" cy="31" rx="2" ry="1" fill="#FEF3C7"/>
      <ellipse cx="62" cy="35" rx="2" ry="1" fill="#FEF3C7"/>
      <path d="M20 45 Q26 48 32 45 Q38 48 44 45 Q50 48 56 45 Q62 48 68 45 Q74 48 80 45 L80 49 L20 49 Z" fill="#22C55E"/>
      <rect x="20" y="49" width="60" height="12" rx="4" fill="#451A03"/>
      <path d="M22 55 L38 55 L42 63 L46 55 L78 55 L78 58 L22 58 Z" fill="#FBBF24"/>
      <path d="M24 64 C24 74 76 74 76 64 Z" fill="#F59E0B"/>
      <circle cx="42" cy="40" r="3" fill="#1C1917"/>
      <circle cx="58" cy="40" r="3" fill="#1C1917"/>
      <circle cx="43" cy="39" r="1" fill="#FFFFFF"/>
      <circle cx="59" cy="39" r="1" fill="#FFFFFF"/>
      <path d="M46 44 Q50 48 54 44" stroke="#B45309" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="36" cy="43" r="2.5" fill="#EF4444" opacity="0.6"/>
      <circle cx="64" cy="43" r="2.5" fill="#EF4444" opacity="0.6"/>
    </svg>`),
  },
  {
    id: 'avatar-snack-dogao',
    name: 'Dogão Prensado',
    category: 'lanches',
    description: 'Hot dog prensado com batata palha',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-s-dogao" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#DC2626"/>
          <stop offset="100%" stop-color="#991B1B"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-s-dogao)"/>
      <!-- Pão do Dogão -->
      <ellipse cx="50" cy="52" rx="36" ry="24" fill="#FDE047"/>
      <ellipse cx="50" cy="52" rx="34" ry="22" fill="#F59E0B"/>
      <!-- Salsicha suculenta -->
      <rect x="20" y="47" width="60" height="10" rx="5" fill="#EF4444"/>
      <!-- Batata palha e milho no topo -->
      <circle cx="35" cy="44" r="2" fill="#FDE047"/>
      <circle cx="45" cy="43" r="2" fill="#FDE047"/>
      <circle cx="55" cy="43" r="2" fill="#FDE047"/>
      <circle cx="65" cy="44" r="2" fill="#FDE047"/>
      <!-- Olhos piscando e sorriso -->
      <circle cx="42" cy="52" r="2.5" fill="#FFFFFF"/>
      <path d="M55 52 Q59 49 63 52" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M47 58 Q50 62 53 58" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-s-dogao" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#DC2626"/>
          <stop offset="100%" stop-color="#991B1B"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-s-dogao)"/>
      <ellipse cx="50" cy="52" rx="36" ry="24" fill="#FDE047"/>
      <ellipse cx="50" cy="52" rx="34" ry="22" fill="#F59E0B"/>
      <rect x="20" y="47" width="60" height="10" rx="5" fill="#EF4444"/>
      <circle cx="35" cy="44" r="2" fill="#FDE047"/>
      <circle cx="45" cy="43" r="2" fill="#FDE047"/>
      <circle cx="55" cy="43" r="2" fill="#FDE047"/>
      <circle cx="65" cy="44" r="2" fill="#FDE047"/>
      <circle cx="42" cy="52" r="2.5" fill="#FFFFFF"/>
      <path d="M55 52 Q59 49 63 52" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M47 58 Q50 62 53 58" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`),
  },
  {
    id: 'avatar-snack-batata',
    name: 'Batata Rústica',
    category: 'lanches',
    description: 'Pacotinho de batatas fritas crocantes',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-s-batata" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F59E0B"/>
          <stop offset="100%" stop-color="#B45309"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-s-batata)"/>
      <!-- Batatas saindo do pacote -->
      <rect x="36" y="24" width="7" height="30" rx="3" fill="#FDE047" transform="rotate(-10 36 24)"/>
      <rect x="46" y="20" width="7" height="32" rx="3" fill="#FBBF24"/>
      <rect x="56" y="23" width="7" height="30" rx="3" fill="#FDE047" transform="rotate(12 56 23)"/>
      <!-- Pacote vermelho -->
      <path d="M30 48 L70 48 L65 80 L35 80 Z" fill="#EF4444"/>
      <path d="M30 48 Q50 56 70 48 L65 52 Q50 60 35 52 Z" fill="#DC2626"/>
      <!-- Rostinho feliz no pacote -->
      <circle cx="44" cy="62" r="3" fill="#FFFFFF"/>
      <circle cx="56" cy="62" r="3" fill="#FFFFFF"/>
      <circle cx="44" cy="62" r="1.5" fill="#1C1917"/>
      <circle cx="56" cy="62" r="1.5" fill="#1C1917"/>
      <path d="M47 69 Q50 73 53 69" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-s-batata" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F59E0B"/>
          <stop offset="100%" stop-color="#B45309"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-s-batata)"/>
      <rect x="36" y="24" width="7" height="30" rx="3" fill="#FDE047" transform="rotate(-10 36 24)"/>
      <rect x="46" y="20" width="7" height="32" rx="3" fill="#FBBF24"/>
      <rect x="56" y="23" width="7" height="30" rx="3" fill="#FDE047" transform="rotate(12 56 23)"/>
      <path d="M30 48 L70 48 L65 80 L35 80 Z" fill="#EF4444"/>
      <path d="M30 48 Q50 56 70 48 L65 52 Q50 60 35 52 Z" fill="#DC2626"/>
      <circle cx="44" cy="62" r="3" fill="#FFFFFF"/>
      <circle cx="56" cy="62" r="3" fill="#FFFFFF"/>
      <circle cx="44" cy="62" r="1.5" fill="#1C1917"/>
      <circle cx="56" cy="62" r="1.5" fill="#1C1917"/>
      <path d="M47 69 Q50 73 53 69" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`),
  },
  {
    id: 'avatar-snack-pizza',
    name: 'Fatia de Pizza',
    category: 'lanches',
    description: 'Pizza de calabresa e queijo derretido',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-s-pizza" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#B91C1C"/>
          <stop offset="100%" stop-color="#7F1D1D"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-s-pizza)"/>
      <!-- Borda da pizza -->
      <path d="M25 28 Q50 20 75 28 L73 34 Q50 26 27 34 Z" fill="#D97706"/>
      <!-- Triângulo de queijo -->
      <path d="M27 34 L73 34 L50 82 Z" fill="#FDE047"/>
      <!-- Rodelas de calabresa -->
      <circle cx="42" cy="44" r="5" fill="#DC2626"/>
      <circle cx="58" cy="48" r="4.5" fill="#DC2626"/>
      <circle cx="48" cy="65" r="4" fill="#DC2626"/>
      <!-- Rostinho fofo -->
      <circle cx="45" cy="54" r="2.5" fill="#1E1B4B"/>
      <circle cx="55" cy="54" r="2.5" fill="#1E1B4B"/>
      <path d="M47 60 Q50 63 53 60" stroke="#78350F" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-s-pizza" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#B91C1C"/>
          <stop offset="100%" stop-color="#7F1D1D"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-s-pizza)"/>
      <path d="M25 28 Q50 20 75 28 L73 34 Q50 26 27 34 Z" fill="#D97706"/>
      <path d="M27 34 L73 34 L50 82 Z" fill="#FDE047"/>
      <circle cx="42" cy="44" r="5" fill="#DC2626"/>
      <circle cx="58" cy="48" r="4.5" fill="#DC2626"/>
      <circle cx="48" cy="65" r="4" fill="#DC2626"/>
      <circle cx="45" cy="54" r="2.5" fill="#1E1B4B"/>
      <circle cx="55" cy="54" r="2.5" fill="#1E1B4B"/>
      <path d="M47 60 Q50 63 53 60" stroke="#78350F" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`),
  },
  {
    id: 'avatar-snack-pastel',
    name: 'Pastel Dourado',
    category: 'lanches',
    description: 'Pastel de feira crocante e quentinho',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-s-pastel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#D97706"/>
          <stop offset="100%" stop-color="#78350F"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-s-pastel)"/>
      <!-- Massa do pastel retangular com bordas de garfo -->
      <rect x="22" y="32" width="56" height="42" rx="4" fill="#FDE047"/>
      <rect x="24" y="34" width="52" height="38" rx="3" fill="#FBBF24"/>
      <!-- Marcas de garfo na borda -->
      <line x1="26" y1="32" x2="26" y2="36" stroke="#B45309" stroke-width="2"/>
      <line x1="32" y1="32" x2="32" y2="36" stroke="#B45309" stroke-width="2"/>
      <line x1="38" y1="32" x2="38" y2="36" stroke="#B45309" stroke-width="2"/>
      <line x1="62" y1="32" x2="62" y2="36" stroke="#B45309" stroke-width="2"/>
      <line x1="68" y1="32" x2="68" y2="36" stroke="#B45309" stroke-width="2"/>
      <line x1="74" y1="32" x2="74" y2="36" stroke="#B45309" stroke-width="2"/>
      <!-- Olhos e bochechas -->
      <circle cx="42" cy="52" r="3" fill="#78350F"/>
      <circle cx="58" cy="52" r="3" fill="#78350F"/>
      <path d="M46 58 Q50 63 54 58" stroke="#78350F" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="35" cy="55" r="2.5" fill="#EF4444" opacity="0.5"/>
      <circle cx="65" cy="55" r="2.5" fill="#EF4444" opacity="0.5"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-s-pastel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#D97706"/>
          <stop offset="100%" stop-color="#78350F"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-s-pastel)"/>
      <rect x="22" y="32" width="56" height="42" rx="4" fill="#FDE047"/>
      <rect x="24" y="34" width="52" height="38" rx="3" fill="#FBBF24"/>
      <line x1="26" y1="32" x2="26" y2="36" stroke="#B45309" stroke-width="2"/>
      <line x1="32" y1="32" x2="32" y2="36" stroke="#B45309" stroke-width="2"/>
      <line x1="38" y1="32" x2="38" y2="36" stroke="#B45309" stroke-width="2"/>
      <line x1="62" y1="32" x2="62" y2="36" stroke="#B45309" stroke-width="2"/>
      <line x1="68" y1="32" x2="68" y2="36" stroke="#B45309" stroke-width="2"/>
      <line x1="74" y1="32" x2="74" y2="36" stroke="#B45309" stroke-width="2"/>
      <circle cx="42" cy="52" r="3" fill="#78350F"/>
      <circle cx="58" cy="52" r="3" fill="#78350F"/>
      <path d="M46 58 Q50 63 54 58" stroke="#78350F" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="35" cy="55" r="2.5" fill="#EF4444" opacity="0.5"/>
      <circle cx="65" cy="55" r="2.5" fill="#EF4444" opacity="0.5"/>
    </svg>`),
  },
  {
    id: 'avatar-snack-coxinha',
    name: 'Coxinha Quentinha',
    category: 'lanches',
    description: 'A clássica coxinha dourada brasileira',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-s-coxinha" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F97316"/>
          <stop offset="100%" stop-color="#C2410C"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-s-coxinha)"/>
      <!-- Formato de gota da coxinha -->
      <path d="M50 20 C54 32 74 58 74 68 C74 78 63 82 50 82 C37 82 26 78 26 68 C26 58 46 32 50 20 Z" fill="#F59E0B"/>
      <!-- Detalhes de crosta crocante -->
      <circle cx="43" cy="60" r="3" fill="#1C1917"/>
      <circle cx="57" cy="60" r="3" fill="#1C1917"/>
      <circle cx="44" cy="59" r="1" fill="#FFFFFF"/>
      <circle cx="58" cy="59" r="1" fill="#FFFFFF"/>
      <path d="M46 66 Q50 70 54 66" stroke="#9A3412" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="36" cy="64" r="2" fill="#EF4444" opacity="0.6"/>
      <circle cx="64" cy="64" r="2" fill="#EF4444" opacity="0.6"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-s-coxinha" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F97316"/>
          <stop offset="100%" stop-color="#C2410C"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-s-coxinha)"/>
      <path d="M50 20 C54 32 74 58 74 68 C74 78 63 82 50 82 C37 82 26 78 26 68 C26 58 46 32 50 20 Z" fill="#F59E0B"/>
      <circle cx="43" cy="60" r="3" fill="#1C1917"/>
      <circle cx="57" cy="60" r="3" fill="#1C1917"/>
      <circle cx="44" cy="59" r="1" fill="#FFFFFF"/>
      <circle cx="58" cy="59" r="1" fill="#FFFFFF"/>
      <path d="M46 66 Q50 70 54 66" stroke="#9A3412" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="36" cy="64" r="2" fill="#EF4444" opacity="0.6"/>
      <circle cx="64" cy="64" r="2" fill="#EF4444" opacity="0.6"/>
    </svg>`),
  },
  {
    id: 'avatar-snack-refri',
    name: 'Refri Gelado',
    category: 'lanches',
    description: 'Copo retrô com canudo listrado e gelo',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-s-refri" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284C7"/>
          <stop offset="100%" stop-color="#0369A1"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-s-refri)"/>
      <!-- Canudo listrado -->
      <line x1="56" y1="18" x2="52" y2="38" stroke="#EF4444" stroke-width="4"/>
      <line x1="56" y1="18" x2="52" y2="38" stroke="#FFFFFF" stroke-width="4" stroke-dasharray="4,4"/>
      <!-- Tampa do copo -->
      <ellipse cx="50" cy="38" rx="24" ry="6" fill="#F8FAFC"/>
      <!-- Copo cônico -->
      <path d="M30 40 L36 82 L64 82 L70 40 Z" fill="#EF4444"/>
      <!-- Rostinho sorridente -->
      <circle cx="44" cy="58" r="3" fill="#FFFFFF"/>
      <circle cx="56" cy="58" r="3" fill="#FFFFFF"/>
      <circle cx="44" cy="58" r="1.5" fill="#0F172A"/>
      <circle cx="56" cy="58" r="1.5" fill="#0F172A"/>
      <path d="M46 66 Q50 70 54 66" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-s-refri" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284C7"/>
          <stop offset="100%" stop-color="#0369A1"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-s-refri)"/>
      <line x1="56" y1="18" x2="52" y2="38" stroke="#EF4444" stroke-width="4"/>
      <line x1="56" y1="18" x2="52" y2="38" stroke="#FFFFFF" stroke-width="4" stroke-dasharray="4,4"/>
      <ellipse cx="50" cy="38" rx="24" ry="6" fill="#F8FAFC"/>
      <path d="M30 40 L36 82 L64 82 L70 40 Z" fill="#EF4444"/>
      <circle cx="44" cy="58" r="3" fill="#FFFFFF"/>
      <circle cx="56" cy="58" r="3" fill="#FFFFFF"/>
      <circle cx="44" cy="58" r="1.5" fill="#0F172A"/>
      <circle cx="56" cy="58" r="1.5" fill="#0F172A"/>
      <path d="M46 66 Q50 70 54 66" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`),
  },
  {
    id: 'avatar-snack-brigadeiro',
    name: 'Brigadeiro',
    category: 'lanches',
    description: 'Doce tradicional brasileiro com granulados',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-s-brigadeiro" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#A855F7"/>
          <stop offset="100%" stop-color="#6B21A8"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-s-brigadeiro)"/>
      <!-- Forminha frisada -->
      <path d="M28 66 L35 84 L65 84 L72 66 Z" fill="#F43F5E"/>
      <!-- Bola de chocolate -->
      <circle cx="50" cy="52" r="26" fill="#381D11"/>
      <!-- Granulados coloridos -->
      <rect x="34" y="42" width="6" height="2.5" rx="1" fill="#FBBF24" transform="rotate(20 34 42)"/>
      <rect x="44" y="32" width="6" height="2.5" rx="1" fill="#38BDF8" transform="rotate(-15 44 32)"/>
      <rect x="58" y="36" width="6" height="2.5" rx="1" fill="#F472B6" transform="rotate(35 58 36)"/>
      <rect x="66" y="46" width="6" height="2.5" rx="1" fill="#4ADE80" transform="rotate(-25 66 46)"/>
      <!-- Rostinho doce -->
      <circle cx="43" cy="54" r="2.5" fill="#FFFFFF"/>
      <circle cx="57" cy="54" r="2.5" fill="#FFFFFF"/>
      <path d="M46 60 Q50 64 54 60" stroke="#F43F5E" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,
    dataUrl: buildDataUrl(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-s-brigadeiro" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#A855F7"/>
          <stop offset="100%" stop-color="#6B21A8"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg-s-brigadeiro)"/>
      <path d="M28 66 L35 84 L65 84 L72 66 Z" fill="#F43F5E"/>
      <circle cx="50" cy="52" r="26" fill="#381D11"/>
      <rect x="34" y="42" width="6" height="2.5" rx="1" fill="#FBBF24" transform="rotate(20 34 42)"/>
      <rect x="44" y="32" width="6" height="2.5" rx="1" fill="#38BDF8" transform="rotate(-15 44 32)"/>
      <rect x="58" y="36" width="6" height="2.5" rx="1" fill="#F472B6" transform="rotate(35 58 36)"/>
      <rect x="66" y="46" width="6" height="2.5" rx="1" fill="#4ADE80" transform="rotate(-25 66 46)"/>
      <circle cx="43" cy="54" r="2.5" fill="#FFFFFF"/>
      <circle cx="57" cy="54" r="2.5" fill="#FFFFFF"/>
      <path d="M46 60 Q50 64 54 60" stroke="#F43F5E" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`),
  },
];

export const DEFAULT_AVATAR_ID = 'avatar-lucas-bone';
export const DEFAULT_AVATAR = AVATARS_GALLERY[0];
export const DEFAULT_AVATAR_URL = DEFAULT_AVATAR.dataUrl;

export function getAvatarById(id?: string | null): AvatarOption {
  if (!id) return DEFAULT_AVATAR;
  const found = AVATARS_GALLERY.find((a) => a.id === id);
  return found || DEFAULT_AVATAR;
}

export function getAvatarUrl(avatarIdOrUrl?: string | null): string {
  if (!avatarIdOrUrl) return DEFAULT_AVATAR_URL;
  if (avatarIdOrUrl.startsWith('data:image') || avatarIdOrUrl.startsWith('http://') || avatarIdOrUrl.startsWith('https://')) {
    return avatarIdOrUrl;
  }
  const found = AVATARS_GALLERY.find((a) => a.id === avatarIdOrUrl);
  return found ? found.dataUrl : DEFAULT_AVATAR_URL;
}
