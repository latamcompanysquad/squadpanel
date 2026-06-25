const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Secret",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Manejar preflight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === "/health") {
      return json({ ok: true, ts: Date.now() });
    }

    // POST: guardar datos de la partida
    if (request.method === "POST" && url.pathname === "/api/match") {
      // 1. Verificar secreto
      const secret = request.headers.get("X-Secret");
      if (!env.WRITE_SECRET || secret !== env.WRITE_SECRET) {
        return json({ error: "Unauthorized" }, 401);
      }

      // 2. Parsear JSON
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      // 3. Guardar en Supabase (principal) y en KV (fallback)
      try {
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_KEY;

        // Upsert en Supabase usando POST con resolución de duplicados
        const response = await fetch(`${supabaseUrl}/rest/v1/match_state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify({
            id: 'latest',
            data: body,
            updated_at: Date.now()
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Supabase error ${response.status}: ${errorText}`);
        }

        // Si Supabase funciona, guardar también en KV (opcional, como respaldo)
        try {
          await env.SQUAD_KV.put("match:latest", JSON.stringify(body));
        } catch (kvError) {
          // Si falla KV, no importa porque Supabase ya guardó
          console.error("KV backup failed:", kvError.message);
        }

        return json({ ok: true, source: "supabase" });
      } catch (supabaseError) {
        // Si Supabase falla, intentar guardar solo en KV (fallback)
        try {
          await env.SQUAD_KV.put("match:latest", JSON.stringify(body));
          return json({ ok: true, source: "kv" });
        } catch (kvError) {
          // Si ambos fallan, devolver error
          return json({ error: `Both Supabase and KV failed: ${supabaseError.message} / ${kvError.message}` }, 500);
        }
      }
    }

    // GET: obtener datos de la partida
    if (request.method === "GET" && url.pathname === "/api/match") {
      // Intentar leer de Supabase primero
      try {
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_KEY;

        const response = await fetch(`${supabaseUrl}/rest/v1/match_state?id=eq.latest&select=data`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });

        if (response.ok) {
          const rows = await response.json();
          if (rows && rows.length > 0 && rows[0].data) {
            const data = rows[0].data;
            data.live = true;
            return json(data);
          }
        } else {
          // Si Supabase devuelve error, intentar leer de KV
          throw new Error("Supabase read failed, falling back to KV");
        }
      } catch (e) {
        // Fallback a KV si Supabase falla o no hay datos
        try {
          const raw = await env.SQUAD_KV.get("match:latest");
          if (!raw) {
            return json({ serverName: "", map: "", layer: "", players: [], fobs: [], ts: null, live: false });
          }
          const data = JSON.parse(raw);
          data.live = true;
          return json(data);
        } catch (kvError) {
          // Si todo falla, devolver datos vacíos
          return json({ serverName: "", map: "", layer: "", players: [], fobs: [], ts: null, live: false });
        }
      }
    }

    // 404 para cualquier otra ruta
    return json({ error: "Not found" }, 404);
  },
};

// Utilidad para respuestas JSON con CORS
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}