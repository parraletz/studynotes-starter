// UI mínima en un solo archivo HTML. Sin build de frontend: es un punto de partida, no un framework.
export const indexHtml = /* html */ `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>StudyNotes</title>
<style>
  :root { --ink:#14181f; --paper:#f6f4ef; --card:#fbfaf7; --line:#d6cfc1; --acc:#9a4e00; --muted:#4a5260; }
  * { box-sizing: border-box; }
  body { margin:0; font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; background: var(--paper); color: var(--ink); }
  main { max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; }
  h1 { margin: 0 0 4px; font-size: 32px; }
  .sub { color: var(--muted); margin: 0 0 24px; }
  form, .note { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
  form { display: grid; gap: 8px; margin-bottom: 24px; }
  input, textarea { width: 100%; font: inherit; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
  textarea { min-height: 90px; resize: vertical; }
  button { font: inherit; padding: 8px 14px; border-radius: 8px; border: 0; background: var(--ink); color: var(--paper); cursor: pointer; justify-self: start; }
  button.link { background: none; color: var(--acc); padding: 0; }
  .notes { display: grid; gap: 12px; }
  .note h2 { margin: 0; font-size: 18px; }
  .note p { margin: 6px 0; white-space: pre-wrap; }
  .meta { display: flex; justify-content: space-between; align-items: center; color: var(--muted); font-size: 13px; }
  .tag { display: inline-block; background: var(--paper); border: 1px solid var(--line); border-radius: 999px; padding: 0 8px; margin-right: 4px; }
  .empty, .error { color: var(--muted); }
  .error { color: #a3271b; }
</style>
</head>
<body>
<main>
  <h1>StudyNotes</h1>
  <p class="sub">Tus apuntes, en AWS Lambda Web Functions + DynamoDB.</p>
  <form id="form">
    <input name="title" placeholder="Título" required maxlength="200">
    <textarea name="content" placeholder="Contenido"></textarea>
    <input name="tags" placeholder="Etiquetas separadas por coma (aws, dynamodb)">
    <button>Guardar</button>
    <p id="error" class="error" hidden></p>
  </form>
  <section id="notes" class="notes"><p class="empty">Cargando…</p></section>
</main>
<script>
  // Id anónimo por navegador. ⚠️ Solo para demo: no es autenticación.
  const userId = localStorage.studynotesUser ||= "u-" + crypto.randomUUID().slice(0, 8);
  const api = (path, opts = {}) =>
    fetch("/api" + path, { ...opts, headers: { "content-type": "application/json", "x-user-id": userId, ...opts.headers } });
  const el = (tag, props = {}, ...children) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  };

  async function load() {
    const box = document.getElementById("notes");
    const res = await api("/notes");
    const { notes = [] } = await res.json();
    box.replaceChildren();
    if (!notes.length) box.append(el("p", { className: "empty", textContent: "Aún no tienes notas. Crea la primera." }));
    for (const n of notes) {
      const del = el("button", { className: "link", textContent: "Borrar" });
      del.onclick = async () => { await api("/notes/" + n.id, { method: "DELETE" }); load(); };
      box.append(el("article", { className: "note" },
        el("h2", { textContent: n.title }),
        el("p", { textContent: n.content }),
        el("div", { className: "meta" },
          el("span", {}, ...n.tags.map((t) => el("span", { className: "tag", textContent: t }))),
          el("span", {}, new Date(n.createdAt).toLocaleString(), " · ", del))));
    }
  }

  document.getElementById("form").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = {
      title: f.get("title"),
      content: f.get("content"),
      tags: String(f.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean),
    };
    const res = await api("/notes", { method: "POST", body: JSON.stringify(body) });
    const err = document.getElementById("error");
    if (!res.ok) { err.textContent = (await res.json()).error; err.hidden = false; return; }
    err.hidden = true;
    e.target.reset();
    load();
  };

  load();
</script>
</body>
</html>`;
