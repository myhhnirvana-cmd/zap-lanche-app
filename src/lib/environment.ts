export type SupabaseEnvironment = 'production' | 'homologation';

const ACTIVE_ENVIRONMENT_STORAGE_KEY = 'zaplanche:active-environment';

/**
 * O ambiente é escolhido antes da criação do cliente Supabase.
 * A troca sempre recarrega a aplicação para que todos os módulos usem
 * exatamente o mesmo projeto durante todo o ciclo de vida da página.
 */
export function getActiveEnvironment(): SupabaseEnvironment {
  if (typeof window === 'undefined') return 'production';
  try {
    return window.localStorage.getItem(ACTIVE_ENVIRONMENT_STORAGE_KEY) === 'homologation'
      ? 'homologation'
      : 'production';
  } catch {
    return 'production';
  }
}

export function getEnvironmentStorageKey(key: string): string {
  return `${key}::${getActiveEnvironment()}`;
}

export function persistActiveEnvironment(environment: SupabaseEnvironment): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACTIVE_ENVIRONMENT_STORAGE_KEY, environment);
}
