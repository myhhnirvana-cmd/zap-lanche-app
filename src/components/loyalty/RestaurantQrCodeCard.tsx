import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Printer, CheckCircle2, AlertTriangle, Sparkles, Store, Copy, Check } from 'lucide-react';
import { Restaurant } from '../../types';
import { UUID_REGEX, buildRestaurantQrValue } from '../../utils/qrCode';
import { isSupabaseConfigured } from '../../lib/supabase';

interface RestaurantQrCodeCardProps {
  restaurant: Restaurant;
  className?: string;
}

export const RestaurantQrCodeCard: React.FC<RestaurantQrCodeCardProps> = ({
  restaurant,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedValue, setCopiedValue] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Determina se a loja possui UUID real do Supabase
  const realUuid =
    (restaurant.supabaseId && UUID_REGEX.test(restaurant.supabaseId) && restaurant.supabaseId) ||
    (restaurant.id && UUID_REGEX.test(restaurant.id) && restaurant.id) ||
    null;

  // Valor a ser codificado no QR Code
  let qrPayload: string | null = null;
  let isDemoMode = false;

  if (realUuid) {
    qrPayload = buildRestaurantQrValue(realUuid);
  } else {
    isDemoMode = true;
    qrPayload = `ZAPLANche://restaurant/demo-${restaurant.id}`;
  }

  useEffect(() => {
    if (!qrPayload || !canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      qrPayload,
      {
        width: 240,
        margin: 2,
        color: {
          dark: '#0f172a', // Slate 900
          light: '#ffffff', // Branco
        },
        errorCorrectionLevel: 'M',
      },
      (error) => {
        if (error) {
          console.error('Erro ao renderizar QR Code no canvas:', error);
          setGenerationError('Falha ao gerar a imagem do QR Code.');
        } else {
          setGenerationError(null);
          if (canvasRef.current) {
            setQrDataUrl(canvasRef.current.toDataURL('image/png'));
          }
        }
      }
    );
  }, [qrPayload]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `qrcode-zaplanche-${restaurant.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrint = () => {
    if (!qrDataUrl) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code Oficial - ${restaurant.name}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              text-align: center;
              padding: 40px 20px;
              color: #0f172a;
            }
            .card {
              max-width: 400px;
              margin: 0 auto;
              border: 3px solid #f97316;
              border-radius: 24px;
              padding: 32px 24px;
            }
            h1 { font-size: 24px; margin: 0 0 4px 0; }
            h2 { font-size: 14px; color: #64748b; font-weight: normal; margin: 0 0 24px 0; }
            img { width: 260px; height: 260px; border-radius: 16px; border: 1px solid #e2e8f0; }
            .badge {
              display: inline-block;
              background: #fff7ed;
              color: #c2410c;
              padding: 6px 14px;
              border-radius: 9999px;
              font-size: 13px;
              font-weight: bold;
              margin-top: 18px;
            }
            p.instructions {
              font-size: 13px;
              color: #475569;
              margin-top: 16px;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${restaurant.name}</h1>
            <h2>${restaurant.neighborhoodName} · Programa de Fidelidade ZAP LANCHE</h2>
            <img src="${qrDataUrl}" alt="QR Code" />
            <br />
            <div class="badge">+5 pontos por check-in (novo check-in a cada 2 horas)</div>
            <p class="instructions">
              Abra o aplicativo <strong>ZAP LANCHE</strong> pelo celular,<br />
              toque em <strong>"Fazer check-in"</strong> e aponte a câmera para este código.
            </p>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopyCode = () => {
    if (!qrPayload) return;
    navigator.clipboard?.writeText(qrPayload);
    setCopiedValue(true);
    setTimeout(() => setCopiedValue(false), 2500);
  };

  return (
    <div
      className={`rounded-3xl bg-[#13151f] border border-orange-500/40 p-5 space-y-4 shadow-xl ${className}`}
    >
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
            <QrCode className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-white font-display">
              QR Code da sua loja
            </h3>
            <p className="text-xs text-slate-400">
              Imprima e coloque no balcão ou nas mesas para os clientes fazerem check-in
            </p>
          </div>
        </div>

        {realUuid ? (
          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 font-bold text-xs border border-emerald-500/30 self-start sm:self-auto flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Oficial Supabase
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 font-bold text-xs border border-amber-500/30 self-start sm:self-auto flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Modo Demonstrativo
          </span>
        )}
      </div>

      {/* Conteúdo Central: Exibição do QR Code */}
      <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
        {/* Canvas do QR Code */}
        <div className="p-3 bg-white rounded-2xl shadow-lg border-2 border-slate-800 shrink-0 flex items-center justify-center">
          <canvas ref={canvasRef} className="w-48 h-48 block" />
        </div>

        {/* Informações da Loja e Instruções */}
        <div className="space-y-3 flex-1 text-center sm:text-left">
          <div>
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wide block">
              {restaurant.name}
            </span>
            <h4 className="text-sm font-semibold text-white mt-0.5">
              Check-in de Fidelidade Oficial
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Cada cliente que escanear este QR Code ganha <strong>5 pontos</strong> por check-in validado (intervalo mínimo de 2 horas entre check-ins no mesmo restaurante). O sistema valida automaticamente o tempo e a autenticação.
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-black/50 border border-slate-800 text-[11px] space-y-1">
            <div className="text-slate-400">
              Identificador da Loja ({realUuid ? 'UUID Oficial' : 'Slug Local'}):
            </div>
            <div className="font-mono text-xs text-amber-300 break-all select-all font-semibold">
              {realUuid || restaurant.id}
            </div>
          </div>

          {/* Botões de Ação para o Comerciante */}
          <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
            <button
              onClick={handleDownload}
              className="px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar Imagem (PNG)
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir para o Balcão
            </button>
            <button
              onClick={handleCopyCode}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-medium text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
              title="Copiar código URI oficial"
            >
              {copiedValue ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedValue ? 'URI Copiada' : 'Copiar URI'}
            </button>
          </div>
        </div>
      </div>

      {generationError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {generationError}
        </div>
      )}

      {!realUuid && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 leading-relaxed">
          * Esta loja está utilizando dados locais de teste. Para emitir QR Codes integrados ao Supabase, a loja precisa estar cadastrada na tabela <code>public.restaurants</code> com um UUID válido.
        </div>
      )}
    </div>
  );
};
