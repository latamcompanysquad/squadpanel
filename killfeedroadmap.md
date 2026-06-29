# 🎯 KILLFEED SYSTEM - ROADMAP COMPLETO

## 📊 ARQUITECTURA GENERAL

```
SATKillFeedLog (Mod Unreal)
  ├─ killer: {name, eos, steam, pos[x,y,z]}
  ├─ victim: {name, eos, steam, pos[x,y,z]}
  └─ weapon: "BP_C7A2_Ironsights_C"

         ↓ (Parser SquadJS Core)

CUSTOM_KILLFEED Event
  ├─ timestamp
  ├─ attacker: {name, eosID, steamID, pos}
  ├─ victim: {name, eosID, steamID, pos}
  ├─ weapon
  ├─ teamkill: bool
  └─ server: ID

         ↓ (WebSocket Broadcast)

SquadPanelBroadcast.js
  ├─ Almacena snapshot (coords + player data)
  ├─ Inserta en DBLog_Deaths (histórico)
  └─ Emite KILLFEED_LIVE al frontend

         ↓

Frontend (index.html + replays.html)
  ├─ Feed vivo (mapa + sidebar derecho)
  ├─ Histórico (panel colapsible)
  └─ Click → replay dedicado con tracer 2D
```

---

## 🔧 FASE 1: SquadJS CORE PARSER

**Archivo:** `src/parsers/SATKillfeed.js`

```javascript
export default class SATKillfeedParser {
  constructor(options = {}) {
    this.options = options;
  }

  exec(input) {
    // Input: log line "SATKillFeedLog: {...}"
    try {
      const jsonMatch = input.match(/SATKillFeedLog: ({.*})/);
      if (!jsonMatch) return null;

      const data = JSON.parse(jsonMatch[1]);
      
      return {
        attacker: {
          name: data.killer.name,
          eosID: data.killer.eos,
          steamID: data.killer.steam,
          pos: { x: data.killer.damage_causer_loc.split(',')[0], ... }
        },
        victim: {
          name: data.victim.name,
          eosID: data.victim.eos,
          steamID: data.victim.steam,
          pos: { x: data.victim.hit_loc.split(',')[0], ... }
        },
        weapon: data.weapon,
        timestamp: Date.now()
      };
    } catch (e) {
      return null;
    }
  }
}
```

**Integración en SquadJS config:**
```json
{
  "plugins": [
    {
      "plugin": "raw-game-log-parser",
      "verbosity": "info",
      "logIgnoreList": [],
      "logParser": {
        "SATKillFeedLog": "SATKillfeedParser"
      }
    }
  ]
}
```

---

## 🔌 FASE 2: EVENT LISTENER EN SquadJS

**En tu bot SquadJS (`index.js` o similar):**

```javascript
squad.on('KILLFEED', (data) => {
  // Determinar teamkill consultando squadJS
  const isTeamkill = data.attacker.teamID === data.victim.teamID;
  
  // Emitir a SquadPanelBroadcast
  broadcastPlugin.broadcast('KILLFEED_LIVE', {
    ...data,
    teamkill: isTeamkill,
    server: squad.server.id
  });
});
```

---

## 📡 FASE 3: PLUGIN SquadPanelBroadcast MEJORADO

**Archivo:** `SquadPanelBroadcast.js` (ADD método)

```javascript
async onKillfeedEvent(data) {
  // 1. Almacenar snapshot con coords
  const snapshot = {
    kill_id: `${data.timestamp}_${data.attacker.steamID}`,
    attacker: data.attacker,
    victim: data.victim,
    weapon: data.weapon,
    teamkill: data.teamkill,
    timestamp: data.timestamp,
    match_id: this.currentMatchID,
    server: data.server
  };
  
  // Guardar en Supabase (igual que replay sistema actual)
  await supabase.from('kill_snapshots').insert([snapshot]);
  
  // 2. Insertar en DBLog_Deaths (para histórico)
  await this.dbLogConnection.query(
    `INSERT INTO DBLog_Deaths 
    (time, victimName, victimTeamID, attackerName, attackerTeamID, 
     weapon, teamkill, server, attacker, victim, match)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [new Date(), data.victim.name, data.victim.teamID, 
     data.attacker.name, data.attacker.teamID, data.weapon, 
     data.teamkill, data.server, data.attacker.steamID, 
     data.victim.steamID, this.currentMatchID]
  );
  
  // 3. Broadcast al frontend
  this.broadcast('KILLFEED_LIVE', snapshot);
}
```

**Conexión MariaDB (init plugin):**
```javascript
const mysql = require('mysql2/promise');
this.dbLogConnection = await mysql.createConnection({
  host: this.options.dbLog.host || 'localhost',
  user: this.options.dbLog.user,
  password: this.options.dbLog.password,
  database: 'squadjs',
  port: this.options.dbLog.port || 3306
});
```

**Config en bot (`config.json`):**
```json
{
  "plugins": [
    {
      "plugin": "SquadPanelBroadcast",
      "serverID": 1,
      "supabaseURL": "...",
      "supabaseKey": "...",
      "dbLog": {
        "host": "localhost",
        "port": 3306,
        "user": "root",
        "password": "tu_pass"
      }
    }
  ]
}
```

---

## 🎨 FASE 4: FRONTEND - KILLFEED VIVO (index.html)

**UI Sidebar Derecho (nuevo):**
```html
<div id="killfeed-container" class="killfeed-sidebar">
  <div class="killfeed-header">
    Killfeed
    <button id="killfeed-history-btn">📊 Histórico</button>
  </div>
  <div id="killfeed-feed" class="killfeed-feed">
    <!-- Kills van acá, max 5 visibles -->
  </div>
</div>
```

**CSS:**
```css
.killfeed-sidebar {
  position: fixed;
  right: 10px;
  top: 200px;
  width: 350px;
  background: rgba(0,0,0,0.8);
  border: 2px solid #00ff88;
  max-height: 500px;
  overflow-y: auto;
}

.killfeed-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #333;
  cursor: pointer;
}

.killfeed-item:hover {
  background: rgba(0,255,136,0.1);
}

.killer-name { color: #ff6b6b; font-weight: bold; }
.weapon-icon { width: 30px; margin: 0 5px; }
.victim-name { color: #4ecdc4; }
```

**JS (WebSocket listener):**
```javascript
socket.on('KILLFEED_LIVE', (kill) => {
  const item = document.createElement('div');
  item.className = 'killfeed-item';
  item.innerHTML = `
    <span class="killer-name">${kill.attacker.name}</span>
    <img class="weapon-icon" src="weapons/${kill.weapon}.png">
    <span class="victim-name">${kill.victim.name}</span>
  `;
  
  item.addEventListener('click', () => {
    // Abrir replay dedicado
    window.open(`replays.html?mode=kill_replay&kill_id=${kill.kill_id}`);
  });
  
  document.getElementById('killfeed-feed').prepend(item);
  
  // Mantener max 5 items visibles
  while (document.querySelectorAll('.killfeed-item').length > 5) {
    document.querySelectorAll('.killfeed-item')[5].remove();
  }
});
```

---

## 📜 FASE 5: PANEL HISTÓRICO (COLAPSIBLE)

**Modal en sidebar:**
```html
<div id="killfeed-modal" class="killfeed-modal hidden">
  <div class="modal-header">
    Histórico de Kills
    <input id="killfeed-search" placeholder="Buscar jugador...">
    <button id="killfeed-close">✕</button>
  </div>
  <div id="killfeed-history" class="killfeed-history">
    <!-- Cargado desde DBLog_Deaths -->
  </div>
</div>
```

**JS (Query DBLog_Deaths):**
```javascript
async function loadKillHistory() {
  // Endpoint en SquadPanelBroadcast (HTTP API)
  const res = await fetch('/api/killfeed/history?server=1&limit=100');
  const kills = await res.json();
  
  const container = document.getElementById('killfeed-history');
  kills.forEach(kill => {
    const row = document.createElement('div');
    row.className = 'killfeed-history-row';
    row.innerHTML = `
      <span>${kill.time}</span>
      <span class="killer">${kill.attackerName}</span>
      <span>${kill.weapon}</span>
      <span class="victim">${kill.victimName}</span>
      ${kill.teamkill ? '<span class="tk-badge">TK</span>' : ''}
    `;
    
    row.addEventListener('click', () => {
      // Si tiene snapshot → replay
      if (kill.kill_id) {
        window.open(`replays.html?kill_id=${kill.kill_id}`);
      }
    });
    
    container.appendChild(row);
  });
}
```

**Endpoint en SquadPanelBroadcast:**
```javascript
app.get('/api/killfeed/history', async (req, res) => {
  const { server, limit } = req.query;
  const rows = await this.dbLogConnection.query(
    `SELECT * FROM DBLog_Deaths WHERE server = ? ORDER BY time DESC LIMIT ?`,
    [server, parseInt(limit) || 100]
  );
  res.json(rows[0]);
});
```

---

## 🎬 FASE 6: REPLAY KILL DEDICADO (replays.html)

**URL:** `replays.html?mode=kill_replay&kill_id=1719165820123_76561199...`

**Script:**
```javascript
const params = new URLSearchParams(window.location.search);
if (params.get('mode') === 'kill_replay') {
  const killID = params.get('kill_id');
  
  fetch(`/api/kill-snapshot/${killID}`)
    .then(r => r.json())
    .then(snapshot => {
      // Renderizar mapa + tracer
      drawKillTracer(snapshot);
      // Aislar players
      dimOtherPlayers(snapshot.attacker.steamID, snapshot.victim.steamID);
    });
}

function drawKillTracer(snapshot) {
  // Canvas 2D overlay en mapa
  const canvas = document.createElement('canvas');
  canvas.id = 'kill-tracer';
  
  const killerPos = mapToScreenCoords(snapshot.attacker.pos);
  const victimPos = mapToScreenCoords(snapshot.victim.pos);
  
  // Animar línea: killer → victim (3 seg loop)
  let progress = 0;
  const animFrame = setInterval(() => {
    ctx.strokeStyle = `rgba(255, 0, 0, ${1 - progress})`;
    ctx.beginPath();
    ctx.moveTo(killerPos.x, killerPos.y);
    ctx.lineTo(
      killerPos.x + (victimPos.x - killerPos.x) * progress,
      killerPos.y + (victimPos.y - killerPos.y) * progress
    );
    ctx.stroke();
    
    progress += 0.05;
    if (progress > 1) progress = 0;
  }, 50);
}
```

---

## 📋 CHECKLIST IMPLEMENTACIÓN

- [ ] **Fase 1**: Parser `SATKillfeed.js` + config SquadJS
- [ ] **Fase 2**: Event listener en bot SquadJS
- [ ] **Fase 3**: Plugin SquadPanelBroadcast + conexión DBLog
- [ ] **Fase 4**: UI killfeed vivo + listener WebSocket
- [ ] **Fase 5**: Panel histórico + endpoint API
- [ ] **Fase 6**: Replay kill + tracer 2D
- [ ] **Testing**: Verificar coords, teamkill detection, BD queries

---

## ⚡ OPTIMIZACIONES

- **Cache kills**: LocalStorage últimas 20 kills (evita queries)
- **Pagination DBLog_Deaths**: 50 rows, lazy load al scroll
- **Batching snapshots**: Grupo kills c/10seg antes guardar
- **Índices DB**: `CREATE INDEX idx_server_time ON DBLog_Deaths(server, time DESC)`

---

¿Confirmas inicio con **Fase 1** o prefieres otro orden?
