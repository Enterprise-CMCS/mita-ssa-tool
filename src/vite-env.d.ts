/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

/**
 * App version injected at build time from package.json
 * @see vite.config.ts
 */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /**
   * Set to the string `'false'` to remove the draft disclaimer from the app and
   * from every export. Any other value, including unset, keeps the tool marked as
   * a draft. Default-on so an omission cannot silently drop the marker.
   * @see src/constants/index.ts IS_DRAFT
   */
  readonly VITE_DRAFT_MODE?: string;
  /** Repository URL for in-app GitHub links; falls back to the upstream repo. */
  readonly VITE_GITHUB_REPO_URL?: string;
  /** Base path for deployment, e.g. `/mita-ssa-tool/` on GitHub Pages. */
  readonly VITE_BASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
