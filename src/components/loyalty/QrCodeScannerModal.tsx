import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { X, Camera, AlertCircle, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

interface QrCodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
  targetRestaurantName?: string;
  isProcessing?: boolean;
}

export const QrCodeScannerModal: React.FC<QrCodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  targetRestaurantName,
  isProcessing = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const isScannedRef = useRef(false);

  const [cameraState, setCameraState] = useState<'initializing' | 'active' | 'permission_denied' | 'not_found' | 'error'>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isInitializingRef = useRef(false);

  // Função centralizada para encerrar a câmera e liberar streams
  const stopCamera = useCallback(async () => {
    if (controlsRef.current) {
      try {
        await controlsRef.current.stop();
      } catch (err) {
        console.warn('Erro ao parar controls do scanner:', err);
      }
      controlsRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      } catch (err) {
        console.warn('Erro ao liberar faixas de vídeo:', err);
      }
    }
  }, []);

  const handleClose = useCallback(async () => {
    await stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  const startScanner = useCallback(async () => {
    if (!isOpen || isInitializingRef.current) return;
    
    isInitializingRef.current = true;
    await stopCamera();
    isScannedRef.current = false;
    setCameraState('initializing');
    setErrorMessage(null);

    // Pequena pausa para garantir que o hardware da câmera liberou
    await new Promise(resolve => setTimeout(resolve, 600));

    // Verifica suporte básico
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraState('not_found');
      setErrorMessage('Seu navegador não suporta acesso à câmera.');
      isInitializingRef.current = false;
      return;
    }

    try {
      const codeReader = new BrowserQRCodeReader();
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      if (!videoRef.current) {
        isInitializingRef.current = false;
        return;
      }

      const controls = await codeReader.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result, error, scannerControls) => {
          controlsRef.current = scannerControls;

          if (result && !isScannedRef.current) {
            isScannedRef.current = true;
            const text = result.getText();
            stopCamera().then(() => onScan(text));
          }
        }
      );

      controlsRef.current = controls;
      setCameraState('active');
    } catch (err: any) {
      console.warn('Falha ao inicializar leitor:', err);
      
      // Mapeamento preciso de erros
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('permission_denied');
        setErrorMessage('Permissão negada. Verifique as configurações de site do navegador.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraState('not_found');
        setErrorMessage('Nenhuma câmera traseira detectada.');
      } else if (err.name === 'NotReadableError') {
        setCameraState('error');
        setErrorMessage('Câmera ocupada ou inacessível.');
      } else {
        setCameraState('error');
        setErrorMessage(err?.message || 'Erro ao acessar a câmera.');
      }
    } finally {
      isInitializingRef.current = false;
    }
  }, [isOpen, onScan, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startScanner, stopCamera]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-[#13151f] border border-orange-500/40 rounded-3xl p-5 shadow-2xl space-y-4 overflow-hidden relative">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-orange-500/20 text-orange-400">
              <Camera className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Leitor de QR Code</h3>
              {targetRestaurantName && (
                <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                  Loja: {targetRestaurantName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
            aria-label="Fechar scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Área de Vídeo / Enquadramento do Scanner */}
        <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center border-2 border-slate-800">
          {/* Elemento de vídeo da câmera */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              cameraState === 'active' ? 'opacity-100' : 'opacity-0'
            }`}
            playsInline
            muted
            autoPlay
          />

          {/* Estado: Carregando câmera */}
          {cameraState === 'initializing' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-2 bg-slate-950">
              <RefreshCw className="w-8 h-8 text-orange-400 animate-spin" />
              <p className="text-xs font-semibold text-slate-300">Iniciando câmera...</p>
              <p className="text-[10px] text-slate-500">Solicitando acesso ao dispositivo de vídeo</p>
            </div>
          )}

          {/* Estado: Câmera Ativa - Retículo de enquadramento */}
          {cameraState === 'active' && !isProcessing && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Moldura escura em volta com recorte central */}
              <div className="relative w-56 h-56 border-2 border-orange-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                {/* Cantoneiras estilizadas */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-orange-500 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-orange-500 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-orange-500 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-orange-500 rounded-br-lg" />

                {/* Linha de varredura animada */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_8px_rgba(249,115,22,0.9)] animate-pulse mt-12" />
              </div>
            </div>
          )}

          {/* Estado: Processando Check-in */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center space-y-3">
              <RefreshCw className="w-9 h-9 text-orange-400 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Registrando check-in...</p>
                <p className="text-[11px] text-slate-400">Validando com o banco de dados Supabase</p>
              </div>
            </div>
          )}

          {/* Estado: Permissão negada */}
          {cameraState === 'permission_denied' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center space-y-3 bg-slate-950">
              <div className="p-3 rounded-full bg-rose-500/15 text-rose-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">Acesso à câmera bloqueado</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {errorMessage || 'Permita o acesso à câmera para escanear o QR Code da loja.'}
                </p>
              </div>
              <button
                onClick={startScanner}
                className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tentar novamente
              </button>
            </div>
          )}

          {/* Estado: Câmera não encontrada ou erro */}
          {(cameraState === 'not_found' || cameraState === 'error') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center space-y-3 bg-slate-950">
              <div className="p-3 rounded-full bg-amber-500/15 text-amber-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">
                  {cameraState === 'not_found' ? 'Câmera indisponível' : 'Erro no leitor'}
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {errorMessage || 'Não foi possível ler o vídeo do dispositivo.'}
                </p>
              </div>
              <button
                onClick={startScanner}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tentar novamente
              </button>
            </div>
          )}
        </div>

        {/* Instrução ao usuário */}
        {cameraState === 'active' && !isProcessing && (
          <p className="text-xs text-center text-slate-300 font-medium">
            Centralize o QR Code da loja dentro da área indicada.
          </p>
        )}

        {/* Botão de Cancelar */}
        <div className="pt-1">
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
