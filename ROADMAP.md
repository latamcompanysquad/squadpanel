# ROADMAP.md — SquadPanel Development Phases

## 🎯 Objetivo General

Crear un **minimapa táctico en tiempo real** sincronizado con servidor Squad, que muestre jugadores, vehículos, FOBs y eventos en vivo.

---

## 📍 Fases de Desarrollo

### FASE 1: Corrección de bugs & validación básica ✅ COMPLETADA

**Objetivo:** Asegurar que el mapa renderiza posiciones correctas

#### Tareas

- [x] Clonar repo squadpanel
- [x] Revisar rutas de imágenes (./maps/*.webp)
- [x] Identificar inversión de corners (cornerZero/One)
- [x] Corregir transformación de coordenadas (Squad → Leaflet)
  - [x] Invertir eje X (Squad y Leaflet tienen direcciones opuestas)
  - [x] Mantener eje Y directo (ambos sistemas compatibles)
- [x] Validar posición de jugadores en 4 esquinas del mapa
- [x] Verificar círculos de FOB (exclusión/construcción)

---

### FASE 2: Sincronización Live & Backend ✅ COMPLETADA

**Pipeline operativo:** Plugin → Cloudflare Worker → Supabase → Frontend

#### 2.1 - Plugin SquadJS ✅

- [x] `SquadPanelBroadcast` corriendo en producción
- [x] Lee `CurrentMatchData.json` (UTF-16 LE + UTF-8, con BOM handling)
- [x] Parsea posiciones vía EOS ID (primario) y Steam ID (fallback)
- [x] Envía snapshot cada `intervalMs` (default 2000ms) al Worker vía POST con `X-Secret`
- [x] Incluye: jugadores, vehículos, FOBs, tickets, objectives, cornerZero/One

#### 2.2 - Cloudflare Worker ✅

- [x] Desplegado en `squadpanel-worker.latamcompanysquad.workers.dev`
- [x] `POST /api/match` — recibe snapshot del plugin (auth X-Secret)
- [x] `GET /api/match` — sirve snapshot al frontend
- [x] `POST /api/admin/command` — encola comando admin en Supabase
- [x] `GET /api/admin/pending` — plugin consulta comandos pendientes
- [x] `DELETE /api/admin/done/:id` — plugin confirma ejecución (PATCH status→done)
- [x] Persistencia en **Supabase** (tablas `match_state` y `admin_commands`)
- [x] KV de Cloudflare descartado para admin (límite 1000 writes/día en plan free)

#### 2.3 - Supabase ✅

- [x] Tabla `match_state` (id text PK, data jsonb, updated_at int8) — upsert on `id='latest'`
- [x] Tabla `admin_commands` (id text PK, action text, payload jsonb, status text, created_at int8, done_at int8)

#### 2.4 - Frontend ✅

- [x] Polling cada 2s a `/api/match`
- [x] HUD: mapa activo, tickets T1/T2 (barra proporcional), dot live/offline, timestamp
- [x] Marcadores SVG por equipo (azul T1 / rojo T2) diferenciados infantry/vehículo
- [x] Anillo dorado en marcador seleccionado
- [x] Panel lateral con tabs: **Jugadores** / **Admin**
- [x] 26 corners hardcodeados como fallback + corners dinámicos desde el plugin

#### 2.5 - Panel Admin ✅

- [x] Target selection: click en marcador → jugador seleccionado con anillo dorado
- [x] Acciones por jugador: Warn / Kick / Ban / Switch Team / Force Respawn
- [x] Campo de razón para warn/kick/ban
- [x] Broadcast global
- [x] Set Next Map / End Match
- [x] Pause / Unpause Match
- [x] Log de comandos en panel (últimos 30) + toast de feedback
- [x] Plugin: `pollAdminCommands()` en mismo loop de broadcast
- [x] Plugin: `executeAdminCommand()` dispatcher vía `rcon.execute()`

#### Pendiente (deuda técnica)

- [ ] Auditar comandos RCON reales del servidor (algunos pueden no existir: `AdminPauseMatch`, `AdminKillPlayer` vs `AdminSlaughter`)
- [ ] Limpiar comandos admin que no aplican al servidor actual

---

### FASE 3: Iconografía Avanzada & UX Mejorada 🎯 SIGUIENTE

**Objetivo:** Diferenciar visualmente rol, equipo, vehículo; agregar interactividad

#### 3.1 - Sistema de Iconos

- [ ] Crear spritesheet de iconos (SVG)
  - [ ] Por equipo: USA (azul), RUS (rojo), INSURGENCY (verde), MILITIA (naranja)
  - [ ] Por categoría: Infantry, Squad Leader, Officer, Medic, Engineer, etc.
  - [ ] Vehículos: Logi, APC, IFV, Tank, Heli
  - [ ] Especiales: HAB (spawn), FOB, Emplacement
- [ ] Iconos dinámicos basados en rol + equipo
- [ ] Badge de vehículo (mini-icono en esquina del marcador)

#### 3.2 - Interactividad

- [ ] Hover → tooltip mejorado (nombre + rol + squad)
- [ ] Click en lista de jugadores → centrar mapa en marcador
- [ ] Filter panel: toggle por equipo / rol / vehículos vs infantry

#### 3.3 - Visual Effects

- [ ] Trail de movimiento (últimos 30 segundos)
- [ ] Effect de muerte (fade out)
- [ ] Animate ingreso de spawn (fade in)
- [ ] Map grid overlay (toggle)

#### 3.4 - Objetivos en mapa

- [ ] Renderizar `objectives` del snapshot (flags, posición, equipo dueño)
- [ ] Color por equipo dueño / neutral

---

### FASE 4: Replay & Herramientas de Comando 🎥

**Objetivo:** Capacidad de replay de match + herramientas tácticas avanzadas

#### 4.1 - Replay System

- [ ] Guardar historial de snapshots en Supabase (tabla `match_snapshots`)
- [ ] Scrubber interactivo en timeline (play/pause, velocidad, jump to timestamp)
- [ ] Reconstitución de posiciones históricas

#### 4.2 - Commander Tools

- [ ] Dibujo en mapa (líneas, círculos, texto) — persistencia local
- [ ] Medida de distancia (línea + tooltip con metros)
- [ ] Marcadores tácticos (amigo/enemigo/objetivo/rally)
- [ ] Exportar screenshot del mapa actual

#### 4.3 - Analytics & Heatmaps

- [ ] Heatmap de actividad por zona
- [ ] Estadísticas por zona (muertes, spawns, vehículos)

---

## 🚀 Estimación de Tiempo

| Fase         | Duración Estimada  | Complejidad | Estado     |
| ------------ | ------------------- | ------------ | ---------- |
| 1 (Bugs)     | 1 sesión            | Baja         | ✅ Done    |
| 2 (Backend)  | 3 sesiones          | Media        | ✅ Done    |
| 3 (UX/Icons) | 2-3 sesiones        | Media        | 🎯 Siguiente |
| 4 (Replay)   | 4-5 sesiones        | Alta         | —          |

---

## 🔑 Decisiones Clave

### Tecnología

- ✅ **Leaflet.js** — Ligero, sin dependencias, perfecto para mapas no-geográficos
- ✅ **Polling 2s** — WebSocket descartado, latencia aceptable para uso táctico
- ✅ **Vanilla JS** — Sin frameworks frontend
- ✅ **Cloudflare Worker** — Edge, sin servidor Node.js propio
- ✅ **Supabase** — Persistencia de match state y admin commands
- ❌ **Cloudflare KV** — Descartado para admin (límite 1000 writes/día free tier)

### Datos

- ✅ **CurrentMatchData.json** como fuente de posiciones (mod del servidor)
- ✅ **EOS ID** como clave primaria de posición (Steam ID como fallback)
- ✅ **cornerZero/One** enviados por plugin + diccionario local de 26 mapas como fallback

### UX

- ✅ **Dark theme táctico** (military aesthetic)
- ✅ **Sin autenticación** en panel admin (red interna / Discord privado)
- ✅ **Tabs Jugadores/Admin** en panel lateral

---

## 📋 Sesiones

### Sesión — Fase 1 (Bugs & validación)
- [x] Corners corregidos, coordenadas validadas en 4 esquinas

### Sesión — Fase 2 (Backend + Live)
- [x] Plugin SquadPanelBroadcast operativo
- [x] Worker + Supabase operativos
- [x] Frontend con polling y marcadores en tiempo real

### Sesión — Panel Admin
- [x] Tab Admin en frontend con todos los botones
- [x] Worker: 3 endpoints admin (command/pending/done) vía Supabase
- [x] Plugin: pollAdminCommands() + executeAdminCommand()
- [x] Ciclo completo validado en producción: click → Supabase → plugin → RCON → Squad

### Próxima Sesión
- [ ] Auditar y limpiar comandos RCON que no existen en el servidor
- [ ] Fase 3: iconos por rol (SL, medic, engineer, etc.)
- [ ] Fase 3: tooltip mejorado
- [ ] Fase 3: filter panel por equipo/rol
- [ ] Fase 3: renderizar objectives (flags) en el mapa