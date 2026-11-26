import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { MemoryNotesRepo } from "../src/notes-repo.js";

const setup = () => createApp(new MemoryNotesRepo());
const json = (body: unknown, user = "ana") => ({
  method: "POST",
  headers: { "content-type": "application/json", "x-user-id": user },
  body: JSON.stringify(body),
});

describe("StudyNotes API", () => {
  it("responde health", async () => {
    const res = await setup().request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, service: "studynotes" });
  });

  it("sirve la UI en /", async () => {
    const res = await setup().request("/");
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("crea, lista, actualiza y borra una note", async () => {
    const app = setup();
    const created = await app.request("/api/notes", json({ title: "Regiones", tags: ["AWS", "aws", " cloud "] }));
    expect(created.status).toBe(201);
    const note = await created.json();
    expect(note.tags).toEqual(["aws", "cloud"]);

    const list = await (await app.request("/api/notes", { headers: { "x-user-id": "ana" } })).json();
    expect(list.notes).toHaveLength(1);

    const patched = await app.request(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-user-id": "ana" },
      body: JSON.stringify({ content: "3+ zonas de disponibilidad" }),
    });
    expect((await patched.json()).content).toBe("3+ zonas de disponibilidad");

    const del = await app.request(`/api/notes/${note.id}`, { method: "DELETE", headers: { "x-user-id": "ana" } });
    expect(del.status).toBe(204);
  });

  it("aísla las notes de cada usuario", async () => {
    const app = setup();
    await app.request("/api/notes", json({ title: "De Ana" }, "ana"));
    const list = await (await app.request("/api/notes", { headers: { "x-user-id": "beto" } })).json();
    expect(list.notes).toEqual([]);
  });

  it("valida la entrada", async () => {
    const app = setup();
    expect((await app.request("/api/notes", json({ content: "sin título" }))).status).toBe(400);
    expect((await app.request("/api/notes/NO-VALIDO", { headers: { "x-user-id": "ana" } })).status).toBe(400);
    expect((await app.request("/api/notes", { headers: { "x-user-id": "ana b" } })).status).toBe(400);
  });

  it("devuelve 404 para notes que no existen", async () => {
    const res = await setup().request("/api/notes/000000000000", { headers: { "x-user-id": "ana" } });
    expect(res.status).toBe(404);
  });
});
