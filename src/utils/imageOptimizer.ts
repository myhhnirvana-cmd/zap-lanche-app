/**
 * Utilitário de Otimização Automática de Imagens (ZAP LANCHE)
 * 
 * Regras:
 * - 100% no cliente via HTML5 Canvas (sem serviços pagos externos).
 * - Redimensiona imagens grandes para no máximo 1600px no maior lado preservando proporção.
 * - Não amplia imagens pequenas para preservar nitidez.
 * - Qualidade visual de ~80% (0.8).
 * - Preferência para WebP quando suportado pelo navegador, com fallback transparente para JPEG.
 * - Validação estrita de arquivos de imagem e mensagens em português.
 */

export interface OptimizedImageResult {
  dataUrl: string;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
  format: 'webp' | 'jpeg';
  fileName: string;
  reductionPercentage: number;
}

export async function optimizeImage(
  file: File,
  maxDimension = 1600,
  quality = 0.8
): Promise<OptimizedImageResult> {
  // 1. Validação do tipo do arquivo
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('O arquivo selecionado não é uma imagem válida (PNG, JPG, WebP ou GIF).');
  }

  // 2. Leitura do arquivo para Image element
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImageElement(dataUrl);

  const originalWidth = img.naturalWidth || img.width;
  const originalHeight = img.naturalHeight || img.height;

  if (originalWidth === 0 || originalHeight === 0) {
    throw new Error('Não foi possível ler as dimensões da imagem selecionada.');
  }

  // 3. Cálculo de dimensões: apenas reduzir se for maior que maxDimension (nunca ampliar!)
  let targetWidth = originalWidth;
  let targetHeight = originalHeight;

  if (originalWidth > maxDimension || originalHeight > maxDimension) {
    if (originalWidth >= originalHeight) {
      targetWidth = maxDimension;
      targetHeight = Math.round((originalHeight / originalWidth) * maxDimension);
    } else {
      targetHeight = maxDimension;
      targetWidth = Math.round((originalWidth / originalHeight) * maxDimension);
    }
  }

  // 4. Desenho no Canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Falha ao inicializar o processador gráfico do navegador.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fundo branco caso PNG transparente seja convertido em JPEG
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // 5. Tentativa de exportar WebP (qualidade 0.8) com fallback para JPEG
  let optimizedDataUrl = '';
  let format: 'webp' | 'jpeg' = 'webp';

  try {
    optimizedDataUrl = canvas.toDataURL('image/webp', quality);
    if (!optimizedDataUrl.startsWith('data:image/webp')) {
      // Navegador não suporta toDataURL com image/webp
      optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
      format = 'jpeg';
    }
  } catch (e) {
    optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
    format = 'jpeg';
  }

  // 6. Cálculo do tamanho aproximado em bytes a partir da Base64
  const base64Content = optimizedDataUrl.split(',')[1] || '';
  const optimizedSize = Math.round((base64Content.length * 3) / 4);
  const reductionPercentage = file.size > 0
    ? Math.max(0, Math.round(((file.size - optimizedSize) / file.size) * 100))
    : 0;

  return {
    dataUrl: optimizedDataUrl,
    originalSize: file.size,
    optimizedSize,
    width: targetWidth,
    height: targetHeight,
    format,
    fileName: file.name,
    reductionPercentage,
  };
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Erro ao ler os dados do arquivo no seu dispositivo.'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('A imagem selecionada está corrompida ou em formato ilegível.'));
    img.src = src;
  });
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const absBytes = Math.abs(bytes);
  const i = absBytes < k ? 0 : Math.min(Math.floor(Math.log(absBytes) / Math.log(k)), sizes.length - 1);
  const value = bytes / Math.pow(k, i);

  return `${parseFloat(value.toFixed(dm))} ${sizes[i]}`;
}
