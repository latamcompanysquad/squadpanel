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

    // POST: actualizar vehicle mappings y pushear a GitHub
    if (request.method === "POST" && url.pathname === "/api/push-vehicle-mappings") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const { mappings } = body;
      if (!mappings || typeof mappings !== "object") {
        return json({ error: "Missing or invalid mappings" }, 400);
      }

      try {
        const token = env.GITHUB_TOKEN;
        const owner = "latamcompanysquad";
        const repo = "squadpanel";
        const branch = "main";
        const filePath = "vehicle_icon_mapping.json";

        // 1. Leer archivo actual de GitHub
        const getResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/vnd.github.v3.raw",
            },
          }
        );

        if (!getResponse.ok) {
          throw new Error(`GitHub read failed: ${getResponse.status}`);
        }

        const rawContent = await getResponse.text();
        const currentData = JSON.parse(rawContent);

        // 2. Mergear nuevo mappings en detailed_vehicle_mapping
        if (!currentData.detailed_vehicle_mapping) {
          currentData.detailed_vehicle_mapping = {};
        }
        Object.assign(currentData.detailed_vehicle_mapping, mappings);

        // 3. Preparar para commit
        const newContent = JSON.stringify(currentData, null, 2);
        const encoder = new TextEncoder();
        const bytes = encoder.encode(newContent);
        const base64 = btoa(String.fromCharCode(...bytes));

        // 4. Obtener SHA del archivo actual (necesario para actualizar)
        const shaResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/vnd.github.v3+json",
            },
          }
        );

        const shaData = await shaResponse.json();
        const sha = shaData.sha;

        // 5. Hacer commit y push
        const commitResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
          {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: `feat: add new vehicle mappings from SquadPanel UI (${Object.keys(mappings).length} vehicles)`,
              content: base64,
              sha: sha,
              branch: branch,
            }),
          }
        );

        if (!commitResponse.ok) {
          const errText = await commitResponse.text();
          throw new Error(`GitHub commit failed: ${commitResponse.status} - ${errText}`);
        }

        return json({ success: true, count: Object.keys(mappings).length });
      } catch (error) {
        console.error("Push vehicle mappings error:", error.message);
        return json({ error: error.message }, 500);
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

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER ADMIN EXTENSION — agregar al worker existente
// squadpanel-worker / src/index.js (o worker.js)
//
// DEPENDE DE: Cloudflare KV namespace "SQUADPANEL_KV" (ya existente)
// Agregar un segundo KV binding: ADMIN_KV (o reusar el mismo con prefijo)
//
// Para usar el mismo KV existente, reemplaza ADMIN_KV con tu KV actual.
// ═══════════════════════════════════════════════════════════════════════════════

// ── ROUTER (agregar estas rutas al fetch handler existente) ──────────────────
//
// En tu fetch handler principal, ANTES del return de rutas desconocidas:
//
//   if (url.pathname === '/api/admin/command' && request.method === 'POST')
//     return handleAdminCommand(request, env);
//   if (url.pathname === '/api/admin/pending' && request.method === 'GET')
//     return handleAdminPending(request, env);
//   if (url.pathname.startsWith('/api/admin/done/') && request.method === 'DELETE')
//     return handleAdminDone(request, env);

// ── CORS helper (probablemente ya lo tienes) ──────────────────────────────────
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

// ── POST /api/admin/command ───────────────────────────────────────────────────
// Frontend → Worker: encolar un comando para el plugin
async function handleAdminCommand(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return jsonRes({ error: 'Invalid JSON' }, 400); }

  const { action } = body;
  const VALID_ACTIONS = [
    'warn', 'kick', 'ban', 'switchTeam', 'respawn',
    'broadcast', 'setNextMap', 'endMatch',
    'pauseMatch', 'unpauseMatch',
  ];
  if (!VALID_ACTIONS.includes(action)) {
    return jsonRes({ error: `Unknown action: ${action}` }, 400);
  }

  const id = `cmd_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const cmd = {
    id,
    action,
    payload: body,           // toda la info: steamID, reason, message, map, etc.
    createdAt: Date.now(),
    status: 'pending',
  };

  // Guardar en KV con TTL de 60s (si el plugin no lo recoge en 60s, se pierde)
  // Usa el KV que tengas: env.SQUADPANEL_KV o env.ADMIN_KV
  await env.SQUADPANEL_KV.put(`admin:${id}`, JSON.stringify(cmd), { expirationTtl: 60 });

  // También mantener lista de pending IDs (para que el plugin pueda listar)
  const listRaw = await env.SQUADPANEL_KV.get('admin:pending_list');
  const list = listRaw ? JSON.parse(listRaw) : [];
  list.push(id);
  // Limpiar IDs muy viejos de la lista (por si acaso)
  const cutoff = Date.now() - 120_000;
  const cleanList = list.filter(i => {
    const ts = parseInt(i.split('_')[1]);
    return ts > cutoff;
  });
  cleanList.push(id);
  await env.SQUADPANEL_KV.put('admin:pending_list', JSON.stringify([...new Set(cleanList)]), { expirationTtl: 120 });

  return jsonRes({ ok: true, id });
}

// ── GET /api/admin/pending ────────────────────────────────────────────────────
// Plugin → Worker: obtener lista de comandos pendientes
async function handleAdminPending(request, env) {
  const listRaw = await env.SQUADPANEL_KV.get('admin:pending_list');
  if (!listRaw) return jsonRes({ commands: [] });

  const list = JSON.parse(listRaw);
  const commands = [];

  for (const id of list) {
    const raw = await env.SQUADPANEL_KV.get(`admin:${id}`);
    if (raw) {
      const cmd = JSON.parse(raw);
      if (cmd.status === 'pending') commands.push(cmd);
    }
  }

  return jsonRes({ commands });
}

// ── DELETE /api/admin/done/:id ────────────────────────────────────────────────
// Plugin → Worker: marcar comando como ejecutado
async function handleAdminDone(request, env) {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();
  if (!id.startsWith('cmd_')) return jsonRes({ error: 'Invalid id' }, 400);

  const raw = await env.SQUADPANEL_KV.get(`admin:${id}`);
  if (raw) {
    const cmd = JSON.parse(raw);
    cmd.status = 'done';
    cmd.doneAt = Date.now();
    // Guardar como done por 10s más para debug, luego se limpia solo
    await env.SQUADPANEL_KV.put(`admin:${id}`, JSON.stringify(cmd), { expirationTtl: 10 });
  }

  // Remover de pending list
  const listRaw = await env.SQUADPANEL_KV.get('admin:pending_list');
  if (listRaw) {
    const list = JSON.parse(listRaw).filter(i => i !== id);
    await env.SQUADPANEL_KV.put('admin:pending_list', JSON.stringify(list), { expirationTtl: 120 });
  }

  return jsonRes({ ok: true, id });
}
