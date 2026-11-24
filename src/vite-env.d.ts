/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL du projet Supabase (facultatif : sans elle, mode invité uniquement) */
  readonly VITE_SUPABASE_URL?: string
  /** Clé publique « anon » du projet Supabase */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
