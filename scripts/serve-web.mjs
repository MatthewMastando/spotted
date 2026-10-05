import { createReadStream, realpathSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const port = Number(process.env.PORT ?? "8090");
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".wasm", "application/wasm"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);
const rootRealPath = realpathSync(root);

function isInsideRoot(path) {
  return path === rootRealPath || path.startsWith(`${rootRealPath}${sep}`);
}

function findFile(path) {
  try {
    const realPath = realpathSync(path);
    if (!isInsideRoot(realPath)) return { blocked: true };
    const stats = statSync(realPath);
    if (stats.isDirectory()) return findFile(resolve(realPath, "index.html"));
    return stats.isFile() ? { path: realPath, stats } : null;
  } catch {
    return null;
  }
}

const server = createServer((request, response) => {
  response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }

  const rawPath = (request.url ?? "/").split("?", 1)[0] || "/";
  let pathname;
  try {
    pathname = decodeURIComponent(rawPath).replace(/\\/g, "/");
  } catch {
    response.writeHead(400);
    response.end("Bad Request");
    return;
  }

  if (pathname.split("/").includes("..")) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  const candidate = resolve(root, `.${pathname}`);
  if (!isInsideRoot(candidate)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  let file = findFile(candidate);
  if (file?.blocked) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  if (!file) {
    const finalSegment = pathname.replace(/\/+$/, "").split("/").at(-1) ?? "";
    if (finalSegment.includes(".")) {
      response.writeHead(404);
      response.end("Not Found");
      return;
    }
    file = findFile(resolve(root, "index.html"));
  }

  if (!file || file.blocked) {
    response.writeHead(file?.blocked ? 403 : 404);
    response.end(file?.blocked ? "Forbidden" : "Not Found");
    return;
  }

  response.writeHead(200, {
    "Content-Length": file.stats.size,
    "Content-Type":
      mimeTypes.get(extname(file.path).toLowerCase()) ??
      "application/octet-stream",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }

  const stream = createReadStream(file.path);
  stream.on("error", () => {
    if (response.headersSent) {
      response.destroy();
    } else {
      response.writeHead(500);
      response.end("Internal Server Error");
    }
  });
  stream.pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving dist/ at http://localhost:${port}`);
});
