import type { ComponentChildren, JSX } from "preact";
import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { Frontmatter } from "./types.ts";

const FrontmatterContext = createContext<Frontmatter | null>(null);
const BasePathContext = createContext<string>("");

/**
 * Markdown rendering configuration.
 */
export interface MarkdownConfig {
  /** CSS class name(s) to apply to the markdown wrapper div. */
  wrapperClassName?: string;
}

const MarkdownConfigContext = createContext<MarkdownConfig>({});

/**
 * Props for the FrontmatterProvider component.
 * @internal
 */
export interface FrontmatterProviderProps {
  /** Frontmatter data to provide to descendants. */
  frontmatter: Frontmatter;
  /** Child components that can access frontmatter via useFrontmatter. */
  children: ComponentChildren;
}

/**
 * Provides frontmatter data to descendant components.
 *
 * @internal This provider is automatically injected by the framework during
 * page rendering. Users should not need to use this directly - use the
 * `useFrontmatter` hook instead.
 */
export function FrontmatterProvider({
  frontmatter,
  children,
}: FrontmatterProviderProps): JSX.Element {
  return (
    <FrontmatterContext.Provider value={frontmatter}>
      {children}
    </FrontmatterContext.Provider>
  );
}

/**
 * Hook to access frontmatter data from the current page context.
 *
 * Must be used within a `FrontmatterProvider`. Throws an error if called
 * outside of a provider.
 *
 * @returns Frontmatter object containing page metadata.
 * @throws {Error} If called outside of FrontmatterProvider.
 *
 * @example
 * ```tsx
 * import { useFrontmatter } from "@tabirun/pages/preact";
 *
 * function PageTitle() {
 *   const { title, description } = useFrontmatter();
 *   return <h1>{title}</h1>;
 * }
 * ```
 */
export function useFrontmatter(): Frontmatter {
  const ctx = useContext(FrontmatterContext);
  if (ctx === null) {
    throw new Error("useFrontmatter must be used within FrontmatterProvider");
  }
  return ctx;
}

/**
 * Props for the BasePathProvider component.
 * @internal
 */
export interface BasePathProviderProps {
  /** Base path prefix for the site (e.g., "/docs"). */
  basePath: string;
  /** Child components that can access basePath via useBasePath. */
  children: ComponentChildren;
}

/**
 * Provides basePath to descendant components.
 *
 * @internal This provider is automatically injected by the framework during
 * page rendering. Users should not need to use this directly - use the
 * `useBasePath` hook instead.
 */
export function BasePathProvider({
  basePath,
  children,
}: BasePathProviderProps): JSX.Element {
  return (
    <BasePathContext.Provider value={basePath}>
      {children}
    </BasePathContext.Provider>
  );
}

/**
 * Hook to access the configured basePath from context.
 *
 * Returns the basePath configured in the pages config (e.g., "/docs").
 * Returns empty string if no basePath is configured (site is at root).
 *
 * @returns The basePath string (empty string for root).
 *
 * @example
 * ```tsx
 * import { useBasePath } from "@tabirun/pages/preact";
 *
 * function Navigation() {
 *   const basePath = useBasePath();
 *   return <a href={`${basePath}/about`}>About</a>;
 * }
 * ```
 */
export function useBasePath(): string {
  return useContext(BasePathContext);
}

/**
 * Props for the MarkdownConfigProvider component.
 * @internal
 */
export interface MarkdownConfigProviderProps {
  /** Markdown configuration to provide to descendants. */
  config: MarkdownConfig;
  /** Child components that can access markdown config via useMarkdownConfig. */
  children: ComponentChildren;
}

/**
 * Provides markdown configuration to descendant components.
 *
 * @internal This provider is automatically injected by the framework during
 * page rendering. Users should not need to use this directly - use the
 * `useMarkdownConfig` hook instead.
 */
export function MarkdownConfigProvider({
  config,
  children,
}: MarkdownConfigProviderProps): JSX.Element {
  return (
    <MarkdownConfigContext.Provider value={config}>
      {children}
    </MarkdownConfigContext.Provider>
  );
}

/**
 * Hook to access markdown configuration from context.
 *
 * Returns the markdown config set in pages configuration.
 * Returns empty object if no config is set.
 *
 * @returns The markdown configuration object.
 * @internal
 */
export function useMarkdownConfig(): MarkdownConfig {
  return useContext(MarkdownConfigContext);
}
