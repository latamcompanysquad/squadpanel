/**
 * SquadPanel Cloudflare Worker
 * 
 * POST /api/match  — recibe snapshot del plugin SquadJS (requiere header X-Secret)
 * GET  /api/match  — devuelve el último snapshot al frontend
 * GET  /health     — healthcheck
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Secret",
};

export default {
  async fetch(request, env) {
    const SECRET = "holaholahola"; // hardcodeado
    const url = new URL(request.url);

    // Preflight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === "/health") {
      return json({ ok: true, ts: Date.now() });
    }

    // ── POST /api/match  (viene del plugin SquadJS) ──────────────────────────
    if (request.method === "POST" && url.pathname === "/api/match") {
      // Validar secret para que nadie externo pueda escribir datos falsos
      const secret = request.headers.get("X-Secret");
      if (!env.WRITE_SECRET || secret !== env.WRITE_SECRET) {
        return json({ error: "Unauthorized" }, 401);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      // Guardar en KV con TTL de 30s (si el plugin muere, los datos expiran solos)
      await env.SQUAD_KV.put("match:latest", JSON.stringify(body), {
        expirationTtl: 30,
      });

      return json({ ok: true });
    }

    // ── GET /api/match  (viene del frontend) ─────────────────────────────────
    if (request.method === "GET" && url.pathname === "/api/match") {
      const raw = await env.SQUAD_KV.get("match:latest");

      if (!raw) {
        // No hay datos todavía — devuelve estructura vacía para que el frontend no explote
        return json({
          serverName: "",
          map: "",
          layer: "",
          players: [],
          fobs: [],
          ts: null,
          live: false,
        });
      }

      const data = JSON.parse(raw);
      data.live = true;
      return json(data);
    }

    return json({ error: "Not found" }, 404);
  },
};

// Helper
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
