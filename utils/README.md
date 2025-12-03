# utils

Internal utilities shared across modules.

## API

### escapeHtml

Escapes HTML special characters to prevent XSS.

```typescript
import { escapeHtml } from "../utils/html.ts";

escapeHtml('<div class="test">'); // "&lt;div class=&quot;test&quot;&gt;"
```

### unescapeHtml

Restores escaped HTML entities to original characters.

```typescript
import { unescapeHtml } from "../utils/html.ts";

unescapeHtml("&lt;div&gt;"); // "<div>"
```

## Notes

- Internal module; not part of public API
- Order of operations prevents double-escaping/unescaping
- Used by markdown and preact modules
