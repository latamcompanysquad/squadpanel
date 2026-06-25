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

#### Deliverables

- `index.html` corregido
- Confirmación visual: jugador aparece en posición correcta

---

### FASE 2: Sincronización Live & Backend 🎯 SIGUIENTE

**Objetivo:** Pasar de snapshots estáticos a actualizaciones en vivo desde servidor Squad

#### 2.1 - Configuración Backend

- [ ] Crear estructura `backend/` (Node.js + Express)
- [ ] Setup de SquadJS integration
  - [ ] Escuchar evento `currentMatchData` (cada ~100ms)
  - [ ] Parsear posiciones de jugadores
  - [ ] Detectar cambios (join/leave/move/vehicle swap/death)
- [ ] Extraer coordenadas de todos los 25 mapas
  - [ ] Crear `backend/map-config.json` con cornerZero/One para cada mapa
  - [ ] Validar contra CurrentMatchData.json real

#### 2.2 - API REST + WebSocket

- [ ] Endpoint `GET /api/match/current` → JSON actual del servidor
- [ ] WebSocket `/ws/match` → broadcast de cambios
  - [ ] Evento: `player.move` → {playerId, pos, ts}
  - [ ] Evento: `player.vehicleSwap` → {playerId, vehicleId, currentSeat}
  - [ ] Evento: `player.death` → {playerId, killer}
  - [ ] Evento: `match.tickets` → {team1, team2}
- [ ] Heartbeat cada 100ms con posiciones actualizadas

#### 2.3 - Frontend Updates

- [ ] Conectar a WebSocket en `index.html`
- [ ] Listener de eventos
  - [ ] `player.move` → animate marker (smooth transition)
  - [ ] `player.vehicleSwap` → cambiar ícono
  - [ ] `player.death` → fade out + effect visual
- [ ] Actualizar panel lateral en tiempo real
- [ ] Mostrar estado de conexión (dot + texto)

#### 2.4 - Testing

- [ ] Mock data con 2-3 jugadores en movimiento
- [ ] Prueba de latencia (ms de delay desde evento a visualización)
- [ ] Prueba con dataset completo (64+ jugadores)

#### Deliverables

- `backend/server.js` operativo
- `backend/map-config.json` (25 mapas)
- WebSocket funcionando en frontend
- Jugadores actualizándose en tiempo real

---

### FASE 3: Iconografía Avanzada & UX Mejorada 🎨

**Objetivo:** Diferenciar visualmente rol, equipo, vehículo; agregar interactividad

#### 3.1 - Sistema de Iconos

- [ ] Crear spritesheet de iconos (128×128 SVG)
  - [ ] Por equipo: USA (azul), RUS (rojo), INSURGENCY (verde), MILITIA (naranja)
  - [ ] Por categoría: Infantry, Squad Leader, Officer, Medic, Engineer, etc.
  - [ ] Vehículos: Logi, APC, IFV, Tank, Heli, Loot crate
  - [ ] Especiales: HAB (spawn), FOB, Emplacement
- [ ] Generar iconos dinámicos basados en rol + equipo
- [ ] Agregar badge para vehículo (mini-icono en la esquina del marcador)

#### 3.2 - Interactividad

- [ ] Hover → tooltip mejorado (nombre + rol + squad + latencia)
- [ ] Click → panel lateral con detalles extendidos
  - [ ] Munición actual
  - [ ] Squad asignado
  - [ ] Última acción (movimento, vehículo, muerte)
  - [ ] Historial de movimiento (mini trail)
- [ ] Filter panel
  - [ ] Toggle por equipo
  - [ ] Toggle por rol
  - [ ] Toggle vehículos vs infantry

#### 3.3 - Visual Effects

- [ ] Pulse/glow alrededor de marcadores con reciente actividad
- [ ] Trail de movimiento (última 30 segundos)
- [ ] Effect al muerte (explosión / cross)
- [ ] Animate ingreso de spawn (fade in)
- [ ] Map grid overlay (toggle, para referencias)

#### 3.4 - Optimización de Leyenda

- [ ] Leyenda dinámica (mostrar solo lo que existe en match actual)
- [ ] Categorización por equipo
- [ ] Contador de jugadores por rol

#### Deliverables

- `assets/icons/` (SVG o PNG spritesheet)
- Iconos dinámicos en map
- Panel interactivo completo
- Filter & search funcionando

---

### FASE 4: Replay & Herramientas de Comando 🎥

**Objetivo:** Capacidad de replay de match + herramientas tácticas avanzadas

#### 4.1 - Replay System

- [ ] Guardar historial de snapshots (cada 1-5 seg)
  - [ ] Almacenar en IndexedDB (cliente) o base de datos (servidor)
  - [ ] Compresión de datos (delta encoding)
- [ ] Scrubber interactivo en timeline
  - [ ] Play/pause
  - [ ] Velocidad ajustable (0.5x - 2x)
  - [ ] Jump to timestamp
- [ ] Reconstitución de match
  - [ ] Reproducir eventos (deaths, vehicle spawns) con timestamps
  - [ ] Mostrar posición histórica de jugadores

#### 4.2 - Commander Tools

- [ ] Dibujo en mapa (líneas, círculos, texto)
  - [ ] Persistencia local (no se sincroniza con otros clientes, solo local)
  - [ ] Atajos (numpad para quickmarks)
- [ ] Medida de distancia (línea + tooltip con metros)
- [ ] Marcadores táctiles (amigo/enemigo/objetivo/rally)
- [ ] Exportar screenshot del mapa actual

#### 4.3 - Analytics & Heatmaps

- [ ] Heatmap de actividad (dónde pasó más tiempo el equipo)
- [ ] Estadísticas por zona (muertes, spawns, vehículos)
- [ ] Análisis de movimiento (path tracing)

#### 4.4 - Integration con Stream/Broadcast

- [ ] WebRTC para compartir view en vivo
- [ ] Overlay para Twitch/YouTube (OBS plugin)
- [ ] Exportar video de replay

#### Deliverables

- Timeline interactivo + replay funcional
- Dibujo en mapa
- Heatmaps
- Broadcast plugin

---

## 📋 Task Tracking Template

Para cada sesión, usar este formato:

```
## Sesión [FECHA]

### Tareas Completadas
- [x] Tarea 1
- [x] Tarea 2

### En Progreso
- [ ] Tarea 3 (50%)

### Bloqueadores
- Ninguno / Descripción

### Próxima Sesión
- [ ] Tarea 4
- [ ] Tarea 5
```

---

## 🚀 Estimación de Tiempo

| Fase         | Duración Estimada  | Complejidad |
| ------------ | ------------------- | ------------ |
| 1 (Bugs)     | 1 sesión            | Baja ✅      |
| 2 (Backend)  | 3-4 sesiones        | Media        |
| 3 (UX/Icons) | 2-3 sesiones        | Media        |
| 4 (Replay)   | 4-5 sesiones        | Alta         |
| **Total**    | **10-13 sesiones**  | —            |

---

## 🔑 Decisiones Clave

### Tecnología

- ✅ **Leaflet.js** — Ligero, sin dependencias, perfecto para mapas no-geográficos
- ✅ **WebSocket** — Baja latencia para actualizaciones en vivo
- ✅ **Vanilla JS** — Sin frameworks frontend (vanilla = máxima control)
- ✅ **Node.js + Express** — Ecosistema SquadJS maduro

### Datos

- ✅ **CurrentMatchData.json** como fuente de verdad única
- ✅ **Almacenar historiales** en servidor (para replay)
- ✅ **Compresión delta** para reducir ancho de banda

### UX

- ✅ **Dark theme táctico** (military aesthetic)
- ✅ **Interactividad limitada** en Fase 1 (focus en posición)
- ✅ **Escalado gradual** de features (fases iterativas)

---

## ✅ Checklist de Validación

### Fase 1 (Actual)

- [x] Posición de jugador correcta en 4 esquinas
- [x] Círculos de FOB renderean
- [x] Rutas de imágenes confirmadas
- [ ] **Siguiente:** Iniciar Phase 2 backend setup

### Fase 2 (Soon)

- [ ] Backend server arrancando sin errores
- [ ] SquadJS conectando a servidor
- [ ] WebSocket broadcasting cambios
- [ ] Frontend recibiendo y aplicando updates
- [ ] Latencia <200ms observable

### Fase 3 (Later)

- [ ] Iconos renderean correctamente
- [ ] Hover tooltips funcionan
- [ ] Filter panel interactive
- [ ] Trail de movimiento visible

### Fase 4 (Future)

- [ ] Replay scrubber funcional
- [ ] Dibujo en mapa persistente
- [ ] Heatmaps calculándose
- [ ] Export de screenshots

---

## 📚 Referencias

- **SquadJS Docs:** <https://docs.squadjs.co/>
- **Leaflet Docs:** <https://leafletjs.com/>
- **Squad Map Data:** Extraído de CurrentMatchData.json
- **Iconografía:** SVG + CSS variables para theming

---

## 🤝 Notas de Mantenimiento

Para mantener este roadmap actualizado:

1. Al iniciar una sesión nueva, copiar la sección de Task Tracking
2. Marcar tareas completadas con [x]
3. Actualizar secciones de bloqueadores
4. Pasar tareas incompletas a siguiente sesión
5. Mover tarea entre secciones (En Progreso → Completada)

Esto permite a futuros agentes contextualizarse rápidamente sin perder progreso.