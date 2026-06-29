# 🔄 Planificación: Migración Worker → Supabase Edge Functions

**Objetivo:** Remover completamente Cloudflare Worker, migrar todo backend a Supabase Edge Functions.

**Estado actual (2025-06-29):**
- Worker: `squadpanel-worker.latamcompanysquad.workers.dev`
- Endpoints: `/api/match` (GET/POST), `/api/push-vehicle-mappings` (POST)
- Frontend llamadas: replays.html, script.html
- Secrets: `GITHUB_TOKEN`, `WRITE_SECRET`, `SUPABASE_URL`, `SUPABASE_KEY`

---

## 📋 FASE 1: Crear Edge Functions en Supabase

### 1.1 Function: `match-get` (GET /match)
**Ruta:** `supabase/functions/match-get/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const client = createClient(supabaseUrl, supabaseKey);

    // Leer match_state más reciente
    const { data, error } = await client
      .from("match_state")
      .select("data")
      .eq("id", "latest")
      .single();

    if (error) {
      return new Response(JSON.stringify({ serverName: "", map: "", layer: "", players: [], fobs: [], ts: null, live: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = {
      ...data.data,
      live: true,
      ts: Date.now(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### 1.2 Function: `match-post` (POST /match)
**Ruta:** `supabase/functions/match-post/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Verificar secreto
    const secret = req.headers.get("X-Secret");
    const expectedSecret = Deno.env.get("WRITE_SECRET");
    if (!expectedSecret || secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // Service role para INSERT

    const client = createClient(supabaseUrl, supabaseKey);

    // Upsert en match_state
    const { error } = await client
      .from("match_state")
      .upsert({
        id: "latest",
        data: body,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ ok: true, source: "supabase" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### 1.3 Function: `push-vehicle-mappings` (POST /mappings)
**Ruta:** `supabase/functions/push-vehicle-mappings/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { mappings } = await req.json();
    if (!mappings || typeof mappings !== "object") {
      return new Response(JSON.stringify({ error: "Missing or invalid mappings" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = Deno.env.get("GITHUB_TOKEN");
    if (!token) {
      return new Response(JSON.stringify({ error: "GITHUB_TOKEN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const owner = "latamcompanysquad";
    const repo = "squadpanel";
    const branch = "main";
    const filePath = "vehicle_icon_mapping.json";

    // 1. Leer archivo actual
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

    // 2. Mergear mappings
    if (!currentData.detailed_vehicle_mapping) {
      currentData.detailed_vehicle_mapping = {};
    }
    Object.assign(currentData.detailed_vehicle_mapping, mappings);

    // 3. Preparar contenido base64
    const newContent = JSON.stringify(currentData, null, 2);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(newContent);
    const base64 = btoa(String.fromCharCode(...Array.from(bytes)));

    // 4. Obtener SHA
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

    // 5. Commit y push
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

    return new Response(JSON.stringify({ success: true, count: Object.keys(mappings).length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Push vehicle mappings error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

## 🔐 FASE 2: Configurar Secrets en Supabase

En **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Environment Variables**:

| Variable | Valor | Origen |
|----------|-------|--------|
| `GITHUB_TOKEN` | `ghp_...` | GitHub Settings |
| `WRITE_SECRET` | (actual del Worker) | Cloudflare Worker env |
| `SUPABASE_URL` | `https://vaddajsbjijtzibjhafj.supabase.co` | Supabase Project Settings |
| `SUPABASE_ANON_KEY` | (tu API Key anon) | Supabase Project Settings |
| `SUPABASE_SERVICE_ROLE_KEY` | (tu Service Role Key) | Supabase Project Settings |

---

## 📱 FASE 3: Actualizar URLs en Frontend

### 3.1 replays.html
**Cambio actual (línea ~231):**
```javascript
const WORKER_URL = 'https://squadpanel-worker.latamcompanysquad.workers.dev';
```

**Por:**
```javascript
const SUPABASE_FUNCTIONS_URL = 'https://vaddajsbjijtzibjhafj.supabase.co/functions/v1';
```

**Cambio en función rPushToGithub() (línea ~1259):**
```javascript
const res = await fetch(`${WORKER_URL}/api/push-vehicle-mappings`, {
```

**Por:**
```javascript
const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/push-vehicle-mappings`, {
```

### 3.2 script.html (LIVE map)
**Buscar todas las referencias a WORKER_URL y aplicar los mismos cambios.**

Típicamente:
- Línea con `fetch(...WORKER_URL.../api/match...` → cambiar a `SUPABASE_FUNCTIONS_URL/match-get`
- Línea con POST a match → cambiar a `SUPABASE_FUNCTIONS_URL/match-post`

---

## 🗑️ FASE 4: Remover Worker

1. **GitHub:** Eliminar carpeta `/worker` del repo
   ```bash
   git rm -r worker/
   git commit -m "remove: Cloudflare Worker (migrado a Supabase Edge Functions)"
   git push
   ```

2. **Cloudflare Dashboard:**
   - Workers & Pages → squadpanel-worker → Delete

3. **GitHub Actions (si existe):** Remover triggers/deploys del Worker

---

## 🧪 FASE 5: Testing

### Test 1: GET /match (LIVE map)
```bash
curl 'https://vaddajsbjijtzibjhafj.supabase.co/functions/v1/match-get'
# Esperado: { serverName: "", map: "", ... }
```

### Test 2: POST /match (SquadJS plugin)
```bash
curl -X POST 'https://vaddajsbjijtzibjhafj.supabase.co/functions/v1/match-post' \
  -H 'Content-Type: application/json' \
  -H 'X-Secret: YOUR_WRITE_SECRET' \
  -d '{"serverName":"Test","map":"Narva","players":[]}'
# Esperado: { ok: true, source: "supabase" }
```

### Test 3: POST /push-vehicle-mappings (Replay mapping UI)
```bash
curl -X POST 'https://vaddajsbjijtzibjhafj.supabase.co/functions/v1/push-vehicle-mappings' \
  -H 'Content-Type: application/json' \
  -d '{"mappings":{"Test Vehicle":{"type":"TRAN","fallback_icon":"..."}}}'
# Esperado: { success: true, count: 1 }
```

---

## ⚠️ Rollback Plan

Si algo falla:

1. **Mantener Worker desplegado** hasta confirmar que Edge Functions funcionan
2. **Dual-write:** Hacer que plugin escriba en ambos (Worker + Edge Function) durante transición
3. **Revertir URLs** en frontend si Edge Functions fallan
4. **Monitoreo:** Ver logs de Supabase → Functions → Execution Logs

---

## 📊 Arquitectura Nueva

```
┌─────────────────────┐
│   Cloudflare Pages  │
│ (replays.html, etc) │
└──────────┬──────────┘
           │
           ├─────────────────────────────────┐
           │                                 │
      ┌────▼────────────┐     ┌──────────────▼──────┐
      │  Supabase       │     │  Supabase           │
      │  Edge Functions │     │  Edge Functions     │
      │  /match-get     │     │  /push-vehicle-maps │
      │  /match-post    │     │                     │
      └────┬────────────┘     └──────────┬──────────┘
           │                            │
           └─────────────┬──────────────┘
                         │
                    ┌────▼────────┐
                    │  Supabase   │
                    │  PostgreSQL │
                    │  (data)     │
                    └─────────────┘
                    
           ┌────────────────────────┐
           │     GitHub API         │
           │ (vehicle_icon_mapping) │
           └────────────────────────┘
```

---

## ✅ Checklist Final

- [ ] 3 Edge Functions creadas y testeadas
- [ ] Secrets configurados en Supabase
- [ ] URLs actualizadas en replays.html
- [ ] URLs actualizadas en script.html
- [ ] Tests manuales pasados (curl o browser console)
- [ ] Worker eliminado de GitHub
- [ ] Worker eliminado de Cloudflare Dashboard
- [ ] Logs de Supabase verificados sin errores
- [ ] LIVE map funcionando
- [ ] Replay map funcionando
- [ ] Vehicle mapping UI funcionando

---

**Estado actual:** Worker activo pero listo para migrar  
**Próximo paso:** Ejecutar FASE 1-5 en nueva sesión  
**Estimado:** 2-3 horas de implementación + testing
