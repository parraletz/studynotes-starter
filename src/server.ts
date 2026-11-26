import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { createRepo } from "./notes-repo.js";

// Lambda Web Functions te dice dónde escuchar con AWS_LAMBDA_HTTP_ENDPOINT ("host:puerto").
// En tu máquina esa variable no existe, así que usamos 127.0.0.1:3000.
const [hostname, port] = (process.env.AWS_LAMBDA_HTTP_ENDPOINT ?? "127.0.0.1:3000").split(":");

const app = createApp(createRepo());

// Debe empezar a escuchar en menos de 10 segundos: no hagas trabajo pesado antes de esto.
const server = serve({ fetch: app.fetch, hostname, port: Number(port) }, (info) => {
  console.log(`[studynotes] escuchando en http://${info.address}:${info.port}`);
});

// Lambda manda SIGTERM al apagar un entorno y da ~1 s para cerrar.
process.on("SIGTERM", () => {
  server.close();
  process.exit(0);
});
