/**
 * Isola os caches locais por ambiente, usando a mesma chave de seleção do cliente Supabase.
 * Os dados legados permanecem associados à Produção; Homologação recebe um namespace próprio.
 */
export function getEnvironmentStorageKey(key: string): string {
  if (typeof window === 'undefined') return key;
  try {
    return window.localStorage.getItem('zaplanche_env_mode') === 'homologation'
      ? `${key}::homologation`
      : key;
  } catch {
    return key;
  }
}
