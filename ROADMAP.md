# ROADMAP.md — SquadPanel Development Phases

## 🎯 Objetivo General

Crear un **minimapa táctico en tiempo real** sincronizado con servidor Squad, que muestre jugadores, vehículos, FOBs y eventos en vivo.

---

## 📍 Fases de Desarrollo

### FASE 1: Corrección de bugs & validación básica ✅ COMPLETADA

- [x] Corners corregidos (cornerZero/One), inversión de eje X
- [x] Transformación de coordenadas Squad → Leaflet validada en 4 esquinas
- [x] Rutas de imágenes confirmadas (./maps/*.webp)
- [x] FOB circles renderizando

---

### FASE 2: Sincronización Live & Backend ✅ COMPLETADA

**Pipeline:** Plugin (SquadJS) → Cloudflare Worker → Supabase → Frontend (polling 2s)

#### Plugin ✅
- [x] `SquadPanelBroadcast` en producción
- [x] Lee `CurrentMatchData.json` (UTF-16 LE + UTF-8, BOM handling)
- [x] Posiciones vía EOS ID (primario) / Steam ID (fallback)
- [x] Snapshot incluye: jugadores, vehículos, FOBs, tickets, objectives, cornerZero/One
- [x] `playerID` (índice en-partida) incluido en cada jugador para comandos `ById`
- [x] `pollAdminCommands()` en mismo loop de broadcast
- [x] `executeAdminCommand()` dispatcher con comandos RCON validados

#### Cloudflare Worker ✅
- [x] `POST /api/match` — recibe snapshot (auth X-Secret)
- [x] `GET /api/match` — sirve snapshot al frontend
- [x] `POST /api/admin/command` — encola comando en Supabase
- [x] `GET /api/admin/pending` — plugin consulta pendientes
- [x] `DELETE /api/admin/done/:id` — plugin confirma ejecución

#### Supabase ✅
- [x] `match_state` (id, data jsonb, updated_at) — upsert `id='latest'`
- [x] `admin_commands` (id, action, payload, status, created_at, done_at)
- [x] KV de Cloudflare descartado (límite 1000 writes/día free tier)

#### Frontend ✅
- [x] Polling 2s, HUD con mapa/tickets/dot live
- [x] Marcadores SVG equipo (azul T1/rojo T2), diferenciados infantry/vehículo
- [x] Anillo dorado en jugador seleccionado
- [x] Tabs: Jugadores / Admin

#### Panel Admin ✅ (auditado contra ListCommands real del servidor)
- [x] Warn / Kick / Ban — usan `ById` si playerID disponible, fallback steamID
- [x] Ban — usa EOS ID vía `AdminBan`
- [x] Switch Team — `AdminForceTeamChangeById` / fallback
- [x] Broadcast — `AdminBroadcast`
- [x] Set Next Map — `AdminSetNextLayer`
- [x] End Match — `AdminEndMatch`
- [x] Pause / Unpause — `AdminPauseMatch` / `AdminUnpauseMatch`
- [x] Force Respawn — **eliminado** (`AdminKillPlayer` no existe en este servidor)
- [x] Log de comandos (últimos 30) + toast de feedback

---

### FASE 3: Iconografía Avanzada & UX 🎯 ✅ COMPLETADA

#### 3.1 - Objectives/Flags en mapa ✅ COMPLETADA
- [x] Renderizar `objectives[]` del snapshot en el mapa
- [x] Ícono de bandera con color por equipo dueño (azul/rojo/gris neutral)
- [x] Tooltip con nombre del objetivo al hover
- [x] Actualización en tiempo real al cambiar de dueño

#### 3.2 - Iconos por rol ✅ COMPLETADA
- [x] SVG diferenciado por rol: Infantry, Squad Leader (isLeader), Medic, Engineer, Officer
- [x] Badge de vehículo en esquina del marcador
- [x] Color por facción (badge real con flags/circles__* existentes, vía prefijo de `role`)

#### 3.3 - Interactividad ✅ COMPLETADA
- [x] Click en jugador → centrar + seguimiento automático en mapa
- [x] Tooltip mejorado: nombre + rol + squad con estilos dedicados
- [x] Expand/collapse por escuadra (colapsadas por default)
- [x] Separación visual: colores por equipo (azul/rojo) + bordes en headers
- [x] Squad count badge en cada encabezado de escuadra
- [x] Botón 🎯 para centrar en squad (promedio de posiciones)

#### 3.4 - Visual Effects
- [ ] Trail de movimiento (últimos 30s)
- [ ] Fade out al morir, fade in al spawnear
- [ ] Map grid overlay (toggle)

---

### FASE 4: Replay & Herramientas de Comando 🎥

#### 4.1 - Replay System
- [ ] Tabla `match_snapshots` en Supabase (historial cada 2-5s)
- [ ] Scrubber interactivo (play/pause, velocidad, jump to timestamp)
- [ ] Reconstitución de posiciones históricas

#### 4.2 - Commander Tools
- [ ] Dibujo en mapa (líneas, círculos, texto) — local
- [ ] Medida de distancia con tooltip en metros
- [ ] Marcadores tácticos (amigo/enemigo/objetivo/rally)
- [ ] Export screenshot

#### 4.3 - Analytics
- [ ] Heatmap de actividad por zona
- [ ] Estadísticas de muertes/spawns por zona

---

### FASE 3.5: Control Panel & RCON Logging ✅ COMPLETADA
- [x] Control Panel v2 interfaz mejorada
- [x] Supabase `rcon_logs` table para auditoría de comandos
- [x] Logging automático de ejecuciones con timestamp/player

---

## 🚀 Estado General

| Fase         | Estado       |
| ------------ | ------------ |
| 1 (Bugs)     | ✅ Done      |
| 2 (Backend)  | ✅ Done      |
| 3 (UX/Icons) | ✅ Done      |
| 3.5 (RCON)   | ✅ Done      |
| 4 (Replay)   | —            |

---

## 🔑 Decisiones Clave

| Decisión | Elección |
|---|---|
| Map rendering | Leaflet.js (CRS.Simple) |
| Sync | Polling 2s (WebSocket descartado) |
| Frontend | Vanilla JS, sin frameworks |
| Edge | Cloudflare Worker |
| DB | Supabase (PostgreSQL) |
| KV Cloudflare | Solo match state backup, NO para admin |
| Posiciones | EOS ID primario, Steam ID fallback |
| Auth admin | Sin auth (red interna) |
| RCON target | `ById` con playerID, fallback steamID |

---

## 📋 Log de Sesiones

### Sesión 1 — Fase 1
- Corners corregidos, coordenadas validadas

### Sesión 2 — Fase 2 Backend
- Plugin + Worker + Supabase operativos, marcadores en tiempo real

### Sesión 3 — Panel Admin
- Tab Admin completo, ciclo validado en producción

### Sesión 4 — Deuda técnica Admin
- Auditado ListCommands real del servidor
- Eliminado Force Respawn (comando inexistente)
- Migrado a comandos `ById`, EOS ID en ban
- playerID agregado al snapshot

### Sesión 5 — Fase 3.1 Objectives en mapa
- Íconos de bandera renderizados desde `data.objectives[]` (pane dedicado, debajo de jugadores)
- Color por `owningTeam` (azul/rojo/gris neutral), recalculado cada poll → actualización en tiempo real
- Tooltip con `flag_name` al hover
- Limpieza de marcadores obsoletos al cambiar de mapa (igual patrón que jugadores)

### Sesión 6 — Fase 3.2 Iconos por rol
- `makeIcon(p, selected)` reescrito: ahora recibe el jugador completo (antes solo teamID/isVehicle)
- Categoría de rol: `isLeader` → Squad Leader (prioridad), luego match por keyword en `role` (medic/engineer/officer), default Infantry
- Overlay SVG por categoría: estrella (líder), cruz (medic), tuerca (engineer), chevron (officer), cruz fina (infantería, sin cambio visual)
- Badge de vehículo: ya no reemplaza el ícono completo por un rectángulo — ahora es un badge pequeño en la esquina superior derecha, manteniendo visible el rol
- Badge de facción: prefijo de `role` (ej. `USA_`, `RGF_`) matcheado contra los 19 `flags/circles__*.webp` ya en `resources/`, badge circular en esquina inferior derecha; si no matchea ninguna facción conocida, no se muestra badge (evita mostrar datos incorrectos)
- Tamaño de ícono subido de 22×22 a 28×28 para dar espacio a los 2 badges

### Sesión 7 — Fase 3.3 Interactividad (Completada)
- Tooltip mejorado: `.tip-container` con estructura HTML nueva, squad info con badge numerado, líder visible
- Expand/collapse de escuadras: `toggleSquadExpand()`, estado en `expandedSquads{}`, bucle indexado para saltar escuadra completa
- Centrado automático: `centerMapOnPlayer()` + `centerMapOnSquad()` integrados con follow mode existente
- Auto-follow: click en jugador activa `followSelected` automáticamente, mantiene centrado usando `panTo()` (ya funcional)
- Estilos mejorados: panel-title con colores por equipo (azul/rojo), squad-header con bordes y fondo oscuro, separación visual clara
- Squad count badge y botón 🎯 para centrar en squad
- Fixes: bucle `for` indexado para collapse correcto, `invalidateSize()` antes de `flyTo()` para centrado automático

### Próxima sesión
- [ ] Fase 3.4 Visual Effects (trails, fade in/out)

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

