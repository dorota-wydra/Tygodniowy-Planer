---
name: Sync pickNewer bug — fresh local data vs server
description: Two root causes that break cross-device sync in the workout planner.
---

# Sync pickNewer pitfalls

## Rule 1: createDefaultAppData must use epoch, not now()
`createDefaultAppData()` must set `updatedAt: new Date(0).toISOString()` (epoch), NOT `now()`.

**Why:** On any fresh/cleared device, `loadLocalData()` returns default empty data. If `updatedAt = now()`, that empty data appears *newer* than the server's real data, so `pickNewer(local, server)` picks local, then `performSync(localEmpty)` overwrites the server — silently deleting all the user's workouts.

**How to apply:** Only set `updatedAt = now()` when there is real user-generated data (e.g. after `updateData()`, or in migration paths that read actual localStorage content).

## Rule 2: onConflictDoUpdate must explicitly set updatedAt
Drizzle ORM's `$onUpdate` hook does **not** fire during `.insert().onConflictDoUpdate()`. Only fires on `.update()` calls.

**Why:** Without an explicit `updatedAt: new Date()` in the `set` object, the DB `updated_at` column never changes after the first INSERT — so conflict detection always sees `serverTs === baseTs`, and concurrent writes from different devices are never flagged as conflicts.

**How to apply:** Always include `updatedAt: new Date()` in every `onConflictDoUpdate({ set: { ... } })` block that touches user data.
