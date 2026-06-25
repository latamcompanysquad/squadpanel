# ARCHITECTURE.md — SquadPanel Live Map

## 📐 Visión General

**SquadPanel** es un minimapa táctico en tiempo real para Squad, que traduce datos de un servidor SquadJS a una visualización Leaflet con sincronización live de jugadores, vehículos, HABs y FOBs.

```
┌─────────────────────────────────────────────────────────────┐
│                    SquadJS Game Server                       │
│              (CurrentMatchData.json + eventos)               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    [WebSocket/API]
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Backend (Node.js + Express)                     │
│  • Parse CurrentMatchData.json                               │
│  • Calcular posiciones en tiempo real                        │
│  • Broadcast eventos (join/kill/vehicle)                     │
│  • Servir imágenes de mapas (25 webp)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    [JSON + SSE/WS]
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Frontend (HTML5 + Leaflet.js)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ HUD Panel (top):  Timer | Tickets | Match info       │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Map Container (center):  Leaflet CRS.Simple          │   │
│  │  • Basemap (25 webp tiles)                           │   │
│  │  • Jugadores (iconos dinámicos)                       │   │
│  │  • FOB radios (círculos exclusión/construcción)      │   │
│  │  • Líneas de caminos (roads)                          │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Side Panel (right):  Player detail | Legend          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Stack Técnico

### Frontend (Ya implementado)
- **Leaflet.js 1.9.4** — Mapas vectoriales sin proyección geográfica (CRS.Simple)
- **HTML5 Canvas** — Rendering de overlay dinámico (sweep animation)
- **CSS3** — Variables de tema (dark mode táctico)
- **Vanilla JavaScript** — Sin frameworks, máxima compatibilidad

### Backend (Planeado)
- **Node.js + Express** — API que expone CurrentMatchData.json
- **SquadJS** — Integración con servidor Squad para eventos en vivo
- **WebSocket o SSE** — Push de actualizaciones a clientes
- **Sharp/ImageMagick** — Procesamiento de mapas (opcional, para CDN local)

### Datos Clave
- **Mapa base:** 25 imágenes WebP (1024×1024 o variable)
- **Coordenadas:** Unreal Units → Leaflet pixels (interpolación lineal)
- **Jugadores:** Posición XY + rol + vehículo actual
- **FOBs:** Centro + radio de exclusión/construcción

---

## 📊 Flujo de Datos

### 1. CurrentMatchData.json (Fuente de verdad)
```json
{
  "server": { "name": "...", "mapName": "Kokan" },
  "teams": [
    {
      "name": "USA",
      "players": [
        {
          "name": "ileveN",
          "pos": [68765.565, 75071.845],
          "current_vehicle": null | "BP_US_Util_Desert_Logi_C_...",
          "current_pawn": "BP_Soldier_USA_Rifleman1_C_..." | "BP_US_Util_Desert_Logi_C_...",
          "role": "USA_Rifleman_02"
        }
      ],
      "vehicles": [
        { "id": "BP_US_Util_Desert_Logi_C_...", "pos": [...], "name": "M939Logistics" }
      ],
      "squads": [{ "name": "Inf", "members": [...] }]
    }
  ],
  "map": {
    "name": "Kokan",
    "texture": {
      "cornerZero": [142013.67, 142013.67],     // MAX (esquina positiva)
      "cornerOne": [-107634.94, -107566.75]     // MIN (esquina negativa)
    }
  }
}
```

### 2. Transformación de Coordenadas
```javascript
// Conversión: Unreal Units → Leaflet pixels
// cornerZero = MAX (superior-derecha)
// cornerOne = MIN (inferior-izquierda)

const MAP_UNITS = 1000; // espacio virtual en Leaflet

fracX = (pos[0] - cornerOne[0]) / (cornerZero[0] - cornerOne[0]);
fracY = (pos[1] - cornerOne[1]) / (cornerZero[1] - cornerOne[1]);

px = (1 - fracX) * MAP_UNITS;  // Invertir X
py = fracY * MAP_UNITS;         // Y directo

leafletLatLng = [py, px];       // [Y, X] format
```

**Explicación:**
- Squad: X negativo=izq, X positivo=der | Y negativo=arriba, Y positivo=abajo (matemático)
- Leaflet: X 0=izq, X 1000=der | Y 0=abajo, Y 1000=arriba
- Solo X necesita inversión; Y es idéntico en ambos sistemas

### 3. Actualización Live
```
[Servidor Squad] 
  → JSON snapshot cada ~100ms
  → [Backend Node] 
    → Detectar cambios (join, move, vehicle swap, kill)
    → [WebSocket broadcast]
      → [Frontend] 
        → Animar marcadores Leaflet
        → Actualizar panel lateral
        → Emitir eventos visuales (explosiones, respauns)
```

---

## 🗂️ Estructura de Carpetas

```
squadpanel/
├── index.html                    # SPA completo (HTML+CSS+JS)
├── ARCHITECTURE.md               # Este archivo
├── ROADMAP.md                    # Fases de desarrollo
├── maps/                         # Imágenes de mapa (25 webp)
│   ├── kokan.webp
│   ├── albasrah.webp
│   └── ... (23 más)
├── backend/                      # (Fase 2+)
│   ├── server.js                 # Express + WebSocket
│   ├── squadjs-adapter.js        # SquadJS event bridge
│   ├── coord-transform.js        # Lógica de transformación
│   └── map-config.json           # Coordenadas de los 25 mapas
├── assets/                       # (Fase 3+)
│   ├── icons/                    # Iconos por rol/vehículo/equipo
│   ├── sounds/                   # Efectos de audio
│   └── fonts/                    # Tipografías adicionales
└── tests/                        # (Fase 3+)
    ├── coord-transform.test.js
    └── integration.test.js
```

---

## 🎯 Componentes Principales

### 1. **Map Container (Leaflet)**
- `L.map('map', { crs: L.CRS.Simple })` — sin proyección
- `L.imageOverlay(basemapUrl, bounds)` — imagen del mapa
- Interactividad: zoom, pan (sin restricción geográfica)

### 2. **Player Markers**
```javascript
{
  icon: L.divIcon({
    html: `<svg ...>${ICON_SVG.infantry_blue}</svg>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]  // centro
  }),
  lat: ...,
  lng: ...
}
```
Dinámico: cambia icon si `current_vehicle` aparece

### 3. **FOB/HAB Radius Circles**
```javascript
L.circle(latLng, {
  radius: metersToMapUnits(exclusion_radius),
  color: "#e0584f",           // rojo exclusión
  weight: 1.5,
  fillOpacity: 0.03,
  dashArray: "4,5"
})
```

### 4. **HUD (Información del partido)**
- Tickets en vivo (barra visual)
- Timer dinámico
- Nombre del mapa
- Estado de conexión

### 5. **Side Panel (Detalles del jugador)**
Muestra al pasar cursor sobre un ícono:
```
[T1] PlayerName
Estado:  A pie | En vehículo
Rol:     USA_Rifleman_02
Vehículo: M939Logistics (si aplica)
Timestamp: 05:10:15 UTC
```

---

## 🔐 Coordenadas de los 25 Mapas

| Mapa | cornerZero | cornerOne |
|------|-----------|-----------|
| Kokan | [142013.67, 142013.67] | [-107634.94, -107566.75] |
| Albasrah | [TBD] | [TBD] |
| Anvil | [TBD] | [TBD] |
| ... | ... | ... |

**Fuente:** Extraer de `CurrentMatchData.json` para cada mapa, o importar desde SquadCalc/ruleset.json.

---

## 🚀 Performance & Escalabilidad

### Frontend
- Rendering: Leaflet crea <100 marcadores por match típico
- Update rate: 100ms (máx 10 actualizaciones/seg)
- Memory: ~5-10MB base (HTML+CSS+Leaflet), +1MB por cada 50 jugadores

### Backend (Phase 2+)
- WebSocket: 64-128 conexiones simultáneas sin problema
- JSON parsing: <5ms por snapshot
- Broadcast: <10ms delay desde evento a broadcast

### Mapas
- 25 imágenes WebP (totales ~60MB)
- Servir desde CDN o static folder
- Cache en cliente indefinido (assets inmutables)

---

## 🔗 Dependencias Externas

- **Leaflet.js** — CDN (cdnjs.cloudflare.com)
- **Google Fonts** — Oswald + JetBrains Mono
- **SquadJS** — npm (si se integra backend)
- **Express** — npm (si se integra backend)

---

## 🛠️ Próximos Pasos

1. **Fase 1 (Actual):** Corrección de bugs de posicionamiento ✅
2. **Fase 2:** Backend + sincronización live
3. **Fase 3:** Múltiples jugadores + iconografía avanzada
4. **Fase 4:** Interactividad (commander tools, map drawings, replay)

Ver **ROADMAP.md** para detalles.
