/**
 * Preact components and hooks for Tabirun Pages.
 *
 * IMPORTANT: Always import Preact APIs from this module, not directly from "preact".
 * This ensures all code uses the same Preact instance, avoiding version mismatch
 * issues that can cause hooks and context to fail.
 *
 * @example
 * ```tsx
 * // Correct - use @tabirun/pages/preact
 * import { useState, useEffect, Head, useFrontmatter } from "@tabirun/pages/preact";
 *
 * // Wrong - do NOT import directly from preact
 * // import { useState } from "preact/hooks";
 *
 * export default function Page() {
 *   const [count, setCount] = useState(0);
 *   const frontmatter = useFrontmatter();
 *
 *   useEffect(() => {
 *     document.title = `${frontmatter.title} - Count: ${count}`;
 *   }, [count, frontmatter.title]);
 *
 *   return (
 *     <>
 *       <Head>
 *         <title>{frontmatter.title}</title>
 *       </Head>
 *       <h1>{frontmatter.title}</h1>
 *       <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
 *     </>
 *   );
 * }
 * ```
 *
 * @module
 */

// =============================================================================
// Preact Core Re-exports
// =============================================================================

export {
  cloneElement,
  Component,
  createContext,
  createElement,
  createRef,
  Fragment,
  h,
  hydrate,
  isValidElement,
  options,
  render,
  toChildArray,
} from "preact";

export type {
  ComponentChild,
  ComponentChildren,
  ComponentClass,
  ComponentType,
  FunctionComponent,
  JSX,
  RefCallback,
  RefObject,
  RenderableProps,
  VNode,
} from "preact";

// =============================================================================
// Preact Hooks Re-exports
// =============================================================================

export {
  useCallback,
  useContext,
  useDebugValue,
  useEffect,
  useErrorBoundary,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "preact/hooks";

// =============================================================================
// Preact Render-to-String Re-exports (SSR)
// =============================================================================

export {
  render as renderToString,
  renderToStringAsync,
} from "preact-render-to-string";

// =============================================================================
// Tabirun Pages Components
// =============================================================================

export { Code } from "./code.tsx";
export { Head } from "./head.tsx";
export { useBasePath, useFrontmatter } from "./context.tsx";

// =============================================================================
// Tabirun Pages Types
// =============================================================================

export type { CodeProps } from "./code.tsx";
export type { DocumentProps } from "../renderer/types.ts";
export type { HeadProps } from "./head.tsx";
export type { Frontmatter } from "./types.ts";
export type { LayoutProps } from "../loaders/types.ts";
