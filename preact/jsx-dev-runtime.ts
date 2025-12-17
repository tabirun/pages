/**
 * JSX development runtime for Preact.
 *
 * This module re-exports the Preact JSX dev runtime to ensure all consumers
 * use the same Preact instance, avoiding version mismatch issues in Deno.
 *
 * @module
 */

export { Fragment, jsx, jsxDEV, jsxs } from "preact/jsx-dev-runtime";
