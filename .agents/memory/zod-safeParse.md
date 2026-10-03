---
name: Zod safeParse generic signature
description: Correct TypeScript generic signature for a safe-parse helper when schemas use .default()
---

## The rule
When wrapping `schema.safeParse()` in a generic helper, use `<S extends z.ZodTypeAny>` + `z.output<S>` as the return type — NOT `<T>(schema: z.ZodType<T>): T | null`.

```ts
// CORRECT
export function safeParse<S extends z.ZodTypeAny>(
  schema: S,
  raw: unknown,
): z.output<S> | null {
  const result = schema.safeParse(raw);
  if (!result.success) return null;
  return result.data as z.output<S>;
}

// WRONG — loses .default() output type, causes TS2322
export function safeParse<T>(schema: z.ZodType<T>, raw: unknown): T | null { ... }
```

**Why:** `z.ZodType<T>` defaults the third type param (Input) to `T`, so TypeScript infers `T` as the intersection of input and output types. For `z.number().default(2)`, input is `number | undefined` and output is `number` — the wrong signature makes `T = number | undefined` causing the schema's output to be typed as optional. `z.output<S>` explicitly reads the output type, giving `number`.

**How to apply:** Any time you write a generic parse/validate utility in this codebase, use the `extends z.ZodTypeAny` + `z.output<S>` pattern. The existing `safeParse` and `parseOrDefault` in `src/schemas/appDataSchemas.ts` already use it.
