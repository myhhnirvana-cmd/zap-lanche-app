/**
 * Utilitários para criação e validação do QR Code oficial do ZAP LANCHE.
 *
 * Formato padrão:
 * ZAPLANche://restaurant/<UUID>
 *
 * Exigências:
 * - O identificador DEVE ser um UUID válido (RFC 4122) referente a public.restaurants.id.
 * - Slugs, IDs de teste ou links externos são estritamente rejeitados.
 * - Nunca aceita profile_id pelo QR Code (segurança).
 */

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const QR_PREFIX_LOWER = 'zaplanche://restaurant/';

/**
 * Gera o payload de texto oficial do QR Code para uma loja a partir do seu UUID real.
 */
export function buildRestaurantQrValue(restaurantUuid: string): string {
  const clean = restaurantUuid.trim();
  if (!UUID_REGEX.test(clean)) {
    throw new Error(`Tentativa de gerar QR Code com identificador que não é UUID válido: "${restaurantUuid}"`);
  }
  return `ZAPLANche://restaurant/${clean}`;
}

export interface QrParseResult {
  isValid: boolean;
  restaurantId: string | null;
  errorMessage?: string;
}

/**
 * Valida rigorosamente o conteúdo lido pelo scanner de QR Code.
 */
export function parseAndValidateRestaurantQr(rawText: string): QrParseResult {
  if (!rawText || typeof rawText !== 'string') {
    return {
      isValid: false,
      restaurantId: null,
      errorMessage: 'QR Code inválido. Aponte a câmera para o QR Code oficial do ZAP LANCHE.',
    };
  }

  const trimmed = rawText.trim();
  const lower = trimmed.toLowerCase();

  let candidateUuid: string | null = null;

  if (lower.startsWith(QR_PREFIX_LOWER)) {
    candidateUuid = trimmed.slice(QR_PREFIX_LOWER.length).trim();
  } else if (UUID_REGEX.test(trimmed)) {
    // Compatibilidade segura caso um leitor decodifique apenas o UUID direto
    candidateUuid = trimmed;
  }

  if (!candidateUuid || !UUID_REGEX.test(candidateUuid)) {
    return {
      isValid: false,
      restaurantId: null,
      errorMessage: 'QR Code inválido. Aponte a câmera para o QR Code oficial do ZAP LANCHE.',
    };
  }

  return {
    isValid: true,
    restaurantId: candidateUuid.toLowerCase(),
  };
}
