# utils

Internal utilities shared across modules.

## API

| Function       | Description                                   |
| -------------- | --------------------------------------------- |
| `escapeHtml`   | Escape HTML special characters to prevent XSS |
| `unescapeHtml` | Restore escaped HTML entities                 |

## Notes

- Internal module; not part of public API
- Order of operations prevents double-escaping/unescaping
- Used by markdown and preact modules
