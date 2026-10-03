import { Router, type IRouter, type Request, type Response } from "express";
import { db, userDataTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// ─── GET /api/data ─────────────────────────────────────────────────────────────
router.get("/data", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;
  const [row] = await db.select().from(userDataTable).where(eq(userDataTable.userId, userId));

  if (!row) {
    res.json({ data: null, updatedAt: null });
    return;
  }

  // v2: return unified AppData document
  if (row.appData && row.schemaVersion >= 2) {
    res.json({ data: row.appData, updatedAt: row.updatedAt.toISOString() });
    return;
  }

  // v1 legacy: build AppData shape from old columns so frontend can migrate
  const legacyData = {
    currentWorkouts: row.currentWorkouts ?? [],
    historyEntries:  row.historyEntries  ?? [],
    currentReflection: row.currentReflection ?? null,
    reflectionShownCount: parseInt(row.reflectionShownCount ?? "0", 10),
    motivationalDate: row.motivationalDate ?? null,
    motivationalLabel: row.motivationalLabel ?? null,
  };
  res.json({ data: legacyData, updatedAt: row.updatedAt.toISOString() });
});

// ─── PUT /api/data ─────────────────────────────────────────────────────────────
router.put("/data", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;
  const { data, baseServerUpdatedAt } = req.body as {
    data: unknown;
    clientUpdatedAt?: string;
    baseServerUpdatedAt?: string | null;
  };

  if (!data || typeof data !== "object") {
    res.status(400).json({ error: "Missing data" });
    return;
  }

  // ── Conflict check ────────────────────────────────────────────────────────
  if (baseServerUpdatedAt) {
    const [current] = await db
      .select({ updatedAt: userDataTable.updatedAt, appData: userDataTable.appData, schemaVersion: userDataTable.schemaVersion })
      .from(userDataTable)
      .where(eq(userDataTable.userId, userId));

    if (current && current.updatedAt) {
      const serverTs = current.updatedAt.getTime();
      const baseTs   = new Date(baseServerUpdatedAt).getTime();

      if (serverTs > baseTs + 1000) {
        // Server has newer data — return conflict
        res.status(409).json({
          conflict: true,
          serverData: current.appData ?? null,
          serverUpdatedAt: current.updatedAt.toISOString(),
        });
        return;
      }
    }
  }

  // ── Upsert ────────────────────────────────────────────────────────────────
  await db
    .insert(userDataTable)
    .values({
      userId,
      appData: data,
      schemaVersion: 2,
      // legacy fields — keep defaults, no longer written
      currentWorkouts: [],
      historyEntries: [],
      reflectionShownCount: "0",
    })
    .onConflictDoUpdate({
      target: userDataTable.userId,
      set: {
        appData: data,
        schemaVersion: 2,
        updatedAt: new Date(), // $onUpdate doesn't fire on onConflictDoUpdate — set explicitly
      },
    });

  // Re-read to get DB-generated updatedAt
  const [saved] = await db
    .select({ updatedAt: userDataTable.updatedAt, appData: userDataTable.appData })
    .from(userDataTable)
    .where(eq(userDataTable.userId, userId));

  res.json({
    data: saved?.appData ?? data,
    updatedAt: saved?.updatedAt.toISOString() ?? new Date().toISOString(),
  });
});

export default router;
