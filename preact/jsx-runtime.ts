/**
 * JSX runtime for Preact.
 *
 * This module re-exports the Preact JSX runtime to ensure all consumers
 * use the same Preact instance, avoiding version mismatch issues in Deno.
 *
 * Configure your project's deno.json:
 * ```json
 * {
 *   "compilerOptions": {
 *     "jsx": "react-jsx",
 *     "jsxImportSource": "@tabirun/pages/preact"
 *   }
 * }
 * ```
 *
 * @module
 */

export { Fragment, jsx, jsxDEV, jsxs } from "preact/jsx-runtime";
export type { JSX } from "preact/jsx-runtime";
