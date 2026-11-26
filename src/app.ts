import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import type { NewNote, NotePatch, NotesRepo } from "./notes-repo.js";
import { indexHtml } from "./ui.js";

type Env = { Variables: { userId: string } };

const ID = /^[0-9a-z]{12}$/;
const USER = /^[\w-]{1,64}$/;

/** Valida y normaliza el body. Devuelve un string con el error si no es válido. */
function parseNote(body: unknown, partial: boolean): NewNote | NotePatch | string {
  if (typeof body !== "object" || body === null) return "El body debe ser un objeto JSON";
  const b = body as Record<string, unknown>;
  const out: NotePatch = {};

  if (b.title !== undefined) {
    if (typeof b.title !== "string" || !b.title.trim()) return "'title' debe ser texto no vacío";
    out.title = b.title.trim().slice(0, 200);
  } else if (!partial) {
    return "Falta 'title'";
  }
  if (b.content !== undefined) {
    if (typeof b.content !== "string") return "'content' debe ser texto";
    out.content = b.content.slice(0, 20_000);
  }
  if (b.tags !== undefined) {
    if (!Array.isArray(b.tags) || !b.tags.every((t) => typeof t === "string")) {
      return "'tags' debe ser una lista de textos";
    }
    out.tags = [...new Set(b.tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 10);
  }
  return out;
}

export function createApp(repo: NotesRepo) {
  const app = new Hono<Env>();

  // UI mínima servida por la misma función: sin S3 ni CloudFront que pagar.
  app.get("/", (c) => c.html(indexHtml));

  app.get("/api/health", (c) => c.json({ ok: true, service: "studynotes", time: new Date().toISOString() }));

  // ⚠️ Identidad de demo: el navegador manda un id anónimo en x-user-id.
  // Cualquiera puede falsificarlo. Antes de guardar datos reales, agrega autenticación.
  const identify = createMiddleware<Env>(async (c, next) => {
    const userId = c.req.header("x-user-id") ?? "demo";
    if (!USER.test(userId)) return c.json({ error: "x-user-id inválido" }, 400);
    c.set("userId", userId);
    await next();
  });
  app.use("/api/notes", identify);
  app.use("/api/notes/*", identify);

  app.get("/api/notes", async (c) => c.json({ notes: await repo.list(c.get("userId")) }));

  app.post("/api/notes", async (c) => {
    const parsed = parseNote(await c.req.json().catch(() => null), false);
    if (typeof parsed === "string") return c.json({ error: parsed }, 400);
    return c.json(await repo.create(c.get("userId"), parsed as NewNote), 201);
  });

  app.get("/api/notes/:id", async (c) => {
    const id = c.req.param("id");
    if (!ID.test(id)) return c.json({ error: "Id inválido" }, 400);
    const note = await repo.get(c.get("userId"), id);
    return note ? c.json(note) : c.json({ error: "No existe" }, 404);
  });

  app.patch("/api/notes/:id", async (c) => {
    const id = c.req.param("id");
    if (!ID.test(id)) return c.json({ error: "Id inválido" }, 400);
    const parsed = parseNote(await c.req.json().catch(() => null), true);
    if (typeof parsed === "string") return c.json({ error: parsed }, 400);
    const note = await repo.update(c.get("userId"), id, parsed);
    return note ? c.json(note) : c.json({ error: "No existe" }, 404);
  });

  app.delete("/api/notes/:id", async (c) => {
    const id = c.req.param("id");
    if (!ID.test(id)) return c.json({ error: "Id inválido" }, 400);
    const ok = await repo.remove(c.get("userId"), id);
    return ok ? c.body(null, 204) : c.json({ error: "No existe" }, 404);
  });

  app.notFound((c) => c.json({ error: "Ruta no encontrada" }, 404));
  app.onError((err, c) => {
    console.error(JSON.stringify({ event: "error", path: c.req.path, message: err.message }));
    return c.json({ error: "Error interno" }, 500);
  });

  return app;
}
