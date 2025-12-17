/**
 * Preact hooks re-exports.
 *
 * This module re-exports all Preact hooks to ensure all consumers
 * use the same Preact instance, avoiding version mismatch issues in Deno.
 *
 * @example
 * ```tsx
 * import { useState, useEffect } from "@tabirun/pages/preact/hooks";
 *
 * function Counter() {
 *   const [count, setCount] = useState(0);
 *   useEffect(() => {
 *     document.title = `Count: ${count}`;
 *   }, [count]);
 *   return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
 * }
 * ```
 *
 * @module
 */

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
