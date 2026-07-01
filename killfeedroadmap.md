# 🎯 KILLFEED SYSTEM - ROADMAP (ESTADO REAL, actualizado)

## 📋 CHECKLIST IMPLEMENTACIÓN

- [x] **Fase 1**: Parser `SATKillfeed.js` + config SquadJS — en producción (`SAT_KILLFEED` event).
- [x] **Fase 2**: Event listener en bot SquadJS — activo.
- [x] **Fase 3**: Plugin SquadPanelBroadcast + `kill_snapshots` en Supabase — activo (`Squadpanelbroadcast.js`, guarda attacker/victim name+steam+eos+pos, weapon, teamkill, match_id, timestamp).
- [x] **Fase 4**: UI killfeed vivo (`script.js`, sidebar + panel histórico con polling/realtime a `kill_snapshots`) — funcional.
- [x] **Fase 5**: Panel histórico — funcional vía Supabase directo (no vía endpoint `/api/killfeed/history` del roadmap original, ese approach fue descartado).
- [~] **Fase 6**: Replay kill dedicado (`replays.html?kill_id=...`) — **funcional con pendiente** (detalle abajo).

---

## 🎬 ESTADO ACTUAL — Kill Replay (`replays.html`, modo `kill_replay`)

### ✅ Funcionando (confirmado por test real, Narva, kill_id=9709)
- Carga del mapa base correcto (`getMapKey(mapName)` en `loadKillReplayMap`, antes rota — fix aplicado y confirmado).
- Conversión de coordenadas UE → lat/lng vía `gameToLatLng(pos, corn)` con `rCurrentMapKey` (antes usaba coords crudas — fix aplicado y confirmado).
- Línea atacante→víctima estática (sin animación de progreso/fade).
- Pulso animado continuo (radar rings) alrededor de ambos puntos, en loop de 1.5s, vía `requestAnimationFrame`.
- Canvas (`#killTracerCanvas`) alineado con `#map` real usando `getBoundingClientRect()` (`resizeKillCanvas()`), fix del desfase que causaba que la línea no coincidiera con los círculos.
- Timer "Duración" infinito eliminado (se ocultó la fila, ya no tenía sentido sin la animación de progreso que la alimentaba).

### ⚠️ Pendiente — Iconos de rol no se muestran
Los markers de atacante/víctima siguen cayendo al fallback (círculo rojo/celeste simple) en vez de mostrar el icono de rol real. Esto significa que `rEnrichKillPlayers()` está devolviendo `null` (o `attackerP`/`victimP` null dentro del objeto).

**Función involucrada:** `rEnrichKillPlayers(kd)` en `replays.html` (justo antes de `resizeKillCanvas`).

**Lógica actual:**
1. `GET kill_snapshots?id=eq.{kill_id}&select=attacker_steam,victim_steam,timestamp` → obtiene steamIDs + timestamp del kill.
2. `GET match_snapshots?match_id=eq.{match_id}&timestamp=lte.{timestamp}&order=timestamp.desc&limit=1` (fallback a `gte`/`asc` si no hay resultado) → snapshot completo más cercano en el tiempo.
3. Busca en `snapData.players` un jugador con `steamID === attacker_steam` / `victim_steam`.
4. Si encuentra ambos → `makeIcon(p, false)` + `makeTooltipContent(p)` (rol, team, squad, hover). Si no → fallback a círculo simple (comportamiento actual observado).

**Hipótesis de la causa (a verificar en la próxima sesión, revisando la consola/Network):**
- No se ve ningún log de `⚠️ No se pudo enriquecer roles kill replay: ...` en la consola pegada por el usuario — pero tampoco se confirmó si el `console.log` de error se disparó o si simplemente `attackerP`/`victimP` quedaron `null` sin error (fetch OK pero sin match).
- Posible mismatch de tipo/formato en `steamID` entre `kill_snapshots.attacker_steam` (string) y `snap.players[].steamID` (podría venir como número o con espacios/otro formato).
- Posible que no exista ningún `match_snapshots` row con `timestamp` cercano al de `kill_snapshots` (desfase de reloj entre el momento en que se guarda el kill vs. el snapshot periódico de partida — si el intervalo entre snapshots es grande, el jugador podría no estar en el snapshot más cercano por estar muerto/fuera de rango en ese instante, aunque debería seguir apareciendo en la lista de players igual con `isAlive:false`).
- Policy RLS de Supabase en `kill_snapshots` o `match_snapshots`: falta de SELECT policy causaría 400/vacío silencioso (mismo patrón de bug ya visto antes en `staff_sessions`).

**Próximo paso sugerido:** agregar un `console.log` temporal dentro de `rEnrichKillPlayers` justo después de cada fetch (status HTTP + body) para ver en qué paso se corta la cadena, en vez of asumir. No genera patch hasta confirmar la causa real con esos logs.

---

## 🗂️ Archivos y funciones clave (kill replay)
- `replays.html`:
  - `killReplayMode` / `killData` — parseo de query params (`kill_id, attacker, victim, weapon, ax, ay, vx, vy, match_id`).
  - `loadKillReplayMap(matchId)` — carga mapa base desde `match_metadata`.
  - `initKillReplay()` / `continuInitKillReplay()` — orquestación principal.
  - `rEnrichKillPlayers(kd)` — fetch de rol/team/squad reales (pendiente de debug).
  - `resizeKillCanvas()` — alineación del canvas overlay con `#map`.
  - `gameToLatLng(pos, corn)` / `getCorn(snap)` — conversión de coordenadas (compartida con el replay normal).
- `Squadpanelbroadcast.js`:
  - `onKillfeedEvent` (o equivalente real) — insert en `kill_snapshots` (ver campos: `attacker_steam`, `victim_steam`, `timestamp`, `match_id`, posiciones).
  - `saveToSupabaseAsync` — insert en `match_snapshots` (`match_id`, `snapshot_index`, `timestamp`, `data`).
- `script.js`:
  - `openKillReplay(...)` — arma la URL hacia `replays.html` con los params del kill.

## 🔧 Tablas Supabase relevantes
- `kill_snapshots`: `id`, `match_id`, `timestamp`, `attacker_name`, `attacker_steam`, `attacker_eos`, `attacker_pos_x/y/z`, `victim_name`, `victim_steam`, `victim_eos`, `victim_pos_x/y/z`, `weapon`, `teamkill`.
- `match_snapshots`: `match_id`, `snapshot_index`, `timestamp`, `data` (JSON con `players[]`, cada uno con `steamID`, `teamID`, `role`, `isLeader`, `squadID`, `isAlive`, `position`, `vehicle`, etc.).

---

## ⚡ Ideas descartadas del roadmap original (no se implementaron así)
- Endpoint HTTP propio `/api/killfeed/history` en el Worker — se reemplazó por queries directas del frontend a Supabase (realtime + polling fallback).
- Conexión MariaDB/`DBLog_Deaths` desde el plugin para histórico — existe como fallback (`INSERT INTO DBLog_Deaths`) pero el frontend no lo consulta; la fuente de verdad real es `kill_snapshots` en Supabase.
