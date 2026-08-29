/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for API calls. Defaults to /api/v1 (proxied in dev). */
  readonly VITE_API_BASE_URL?: string;
  /** Dev-server proxy target for /api. Defaults to http://127.0.0.1:8000. */
  readonly VITE_API_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
