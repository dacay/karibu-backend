# Code Style Conventions

## General

- **No emojis** in code or logs
- **Logging**: Use `...` for ongoing states (e.g., "Server is running..."), `.` for completed actions (e.g., "Database connection failed.")

## Log Levels

Choose carefully to keep production logs meaningful and small:

- `error` — something went wrong and the system is likely in a bad state
- `warn` — something might be broken but we are not sure
- `info` — an important business event that we should know about in production (e.g. document uploaded, user created)
- `debug` — extra information useful when actively debugging; use this by default for routine operations (cache hits, middleware steps, auth failures from bots, etc.)

## Semicolons

Use semicolons on statements (imports, variable declarations, returns), but NOT on closing braces of function bodies:

```typescript
// Good
import { foo } from './bar.js';

const value = 42;

export const myFunction = () => {

  return value;
}

// Bad - semicolon on closing brace
export const myFunction = () => {

  return value;
};
```

## Block Spacing

Always add blank lines inside code blocks (functions, if statements, callbacks), but NOT inside object literals:

```typescript
// Good - functions and blocks
if (condition) {

  doSomething()
}

function example() {

  return value
}

// Good - objects (no initial blank line)
const obj = {
  foo: 'bar',
  baz: 'qux',
};

return c.json({
  status: 'ok',
});

// Bad - no spacing in function
if (condition) {
  doSomething()
}

// Bad - blank line in object
const obj = {

  foo: 'bar',
};
```
