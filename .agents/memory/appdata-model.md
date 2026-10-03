---
name: AppData unified model
description: Architecture of the unified AppData document replacing 10+ old localStorage keys
---

## The rule
All user data lives in one `AppData` document. localStorage key: `planer-app-data`. Server column: `app_data JSONB` in `user_data` table. `SCHEMA_VERSION = 2`.

**Why:** Old code used 10+ separate localStorage keys with fragmented remote sync (only some fields synced). New model makes sync atomic and supports proper conflict detection.

**How to apply:**
- Add new user-facing data fields to the `AppData` interface in `src/types/appData.ts` and the matching Zod schema in `src/schemas/appDataSchemas.ts`
- Add defaults in `src/data/defaultAppData.ts` → `createDefaultAppData()`
- If migrating old data, add a branch in `src/data/migrations.ts` → `migrateAppData()`
- Components must use `useAppData()` and `updateSection()` / `updateData()` — never write to localStorage directly

## Old localStorage keys (v1, legacy — kept for one-time migration only)
`planer-treningow`, `planer-historia`, `planer-refleksja`, `planer-reflection-count`, `planer-key-dates`, `planer-training-data`, `planer-body-measurements`, `planer-notes`, `planer-reminder-settings`, `planer-program`

## Server migration
Server rows with `schema_version < 2` return legacy flat fields; frontend `migrateFromServerV1()` converts them. New writes always use `schema_version = 2` + `app_data JSONB`.
