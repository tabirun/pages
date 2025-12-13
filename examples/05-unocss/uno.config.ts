export default {
  // Custom rules - no presets, just these utilities
  rules: [
    // Spacing
    ["p-sm", { padding: "0.5rem" }],
    ["p-md", { padding: "1rem" }],
    ["p-lg", { padding: "2rem" }],
    ["p-xl", { padding: "4rem" }],
    ["m-sm", { margin: "0.5rem" }],
    ["m-md", { margin: "1rem" }],
    ["m-lg", { margin: "2rem" }],
    ["mx-auto", { "margin-left": "auto", "margin-right": "auto" }],

    // Typography
    ["text-sm", { "font-size": "0.875rem" }],
    ["text-base", { "font-size": "1rem" }],
    ["text-lg", { "font-size": "1.25rem" }],
    ["text-xl", { "font-size": "1.5rem" }],
    ["text-2xl", { "font-size": "2rem" }],
    ["font-bold", { "font-weight": "700" }],
    ["text-center", { "text-align": "center" }],

    // Colors
    ["text-primary", { color: "#3b82f6" }],
    ["text-secondary", { color: "#64748b" }],
    ["text-success", { color: "#22c55e" }],
    ["bg-light", { "background-color": "#f8fafc" }],
    ["bg-primary", { "background-color": "#3b82f6" }],
    ["text-white", { color: "#ffffff" }],

    // Layout
    ["max-w-md", { "max-width": "28rem" }],
    ["max-w-lg", { "max-width": "32rem" }],
    ["rounded", { "border-radius": "0.25rem" }],
    ["rounded-lg", { "border-radius": "0.5rem" }],
    ["shadow", { "box-shadow": "0 1px 3px rgba(0,0,0,0.1)" }],

    // Flexbox
    ["flex", { display: "flex" }],
    ["flex-col", { "flex-direction": "column" }],
    ["items-center", { "align-items": "center" }],
    ["justify-center", { "justify-content": "center" }],
    ["gap-sm", { gap: "0.5rem" }],
    ["gap-md", { gap: "1rem" }],
  ],
};
