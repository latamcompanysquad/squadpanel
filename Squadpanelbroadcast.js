import BasePlugin from './base-plugin.js';
import { readFile } from 'fs/promises';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function normalizeKey(str) {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[\s\-_.]+/g, '');
}

function buildNormalizedIndex(dict) {
  const idx = {};
  for (const [key, value] of Object.entries(dict)) {
    idx[normalizeKey(key)] = value;
  }
  return idx;
}

function parseBlueprintName(rawName) {
  if (!rawName || !rawName.startsWith('BP_')) return rawName;
  return rawName
    .replace(/^BP_/, '')
    .replace(/_\d+$/, '')
    .replace(/_(Desert|Woodland|Snow|Arid|Green|Urban|Jungle)(_C)?$/i, '')
    .replace(/_C$/i, '');
}

function findByPrefix(norm, index) {
  if (!norm || norm.length < 5) return null;
  for (const [key, val] of Object.entries(index)) {
    if (key.length < 5) continue;
    if (norm.startsWith(key) || key.startsWith(norm)) return val;
  }
  return null;
}

// ─── CLASE PRINCIPAL ──────────────────────────────────────────────────────────

export default class SquadPanelBroadcast extends BasePlugin {
  static get description() {
    return 'Broadcasts live match data (players, vehicles with icons, FOBs) to the SquadPanel Cloudflare Worker.';
  }

  static get defaultEnabled() {
    return true;
  }

  static get optionsSpecification() {
    return {
      workerUrl: {
        required: false,
        description: 'URL base del Cloudflare Worker (sin trailing slash)',
        default: 'https://squadpanel-worker.latamcompanysquad.workers.dev',
        example: 'https://squadpanel-worker.latamcompanysquad.workers.dev',
      },
      writeSecret: {
        required: true,
        description: 'Valor de X-Secret configurado en el Worker (variable WRITE_SECRET)',
        default: '',
        example: 'squads3cr3t2024xLATAM',
      },
      intervalMs: {
        required: false,
        description: 'Intervalo de envío en milisegundos',
        default: 2000,
        example: 2000,
      },
      matchDataPath: {
        required: false,
        description: 'Ruta al CurrentMatchData.json generado por el mod del servidor',
        default: '/home/container/SquadGame/Saved/SquadAdminTools/ServerData/CurrentMatchData.json',
        example: '/home/container/SquadGame/Saved/SquadAdminTools/ServerData/CurrentMatchData.json',
      },
      iconMappingUrl: {
        required: false,
        description: 'URL del archivo vehicle_icon_mapping.json (desde GitHub u otro hosting)',
        default: 'https://raw.githubusercontent.com/latamcompanysquad/squadpanel/refs/heads/main/vehicle_icon_mapping.json',
        example: 'https://raw.githubusercontent.com/latamcompanysquad/squadpanel/refs/heads/main/vehicle_icon_mapping.json',
      },
      verbose: {
        required: false,
        description: 'Nivel de verbosidad (0=off, 1=normal, 2=detallado)',
        default: 1,
        example: 1,
      },
    };
  }

  constructor(server, options, connectors) {
    super(server, options, connectors);
    this.timer = null;
    this.adminsInCamera = new Set();
    this.modData = null;
    this.broadcastCount = 0;

    this.namedIcons = {};
    this.typeIcons = {};
    this.nameToType = {};
    this.namedIconsNorm = {};
    this.nameToTypeNorm = {};
    this._unmatchedVehicleNames = new Set();
  }

  async mount() {
    this.verbose(1, 'Montando SquadPanelBroadcast (modo centralizado vía GitHub)...');

    const secret = this.options.writeSecret;
    if (!secret || secret.trim() === '') {
      throw new Error('SquadPanelBroadcast: writeSecret está vacío o no definido.');
    }

    let url = this.options.workerUrl;
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
      this.options.workerUrl = url;
    }

    this.verbose(1, `🔑 writeSecret configurado (longitud: ${secret.length})`);
    this.verbose(1, `🌐 Worker URL: ${url}`);
    this.verbose(1, `📂 Match data path: ${this.options.matchDataPath}`);

    await this.loadIconMappings();

    this.server.on('POSSESSED_ADMIN_CAMERA', (info) => {
      if (info.player && info.player.steamID) {
        this.adminsInCamera.add(info.player.steamID);
        this.verbose(1, `📷 [CAMERA IN] ${info.player.name} (SteamID: ${info.player.steamID})`);
        this.verbose(1, `   → adminsInCamera: ${Array.from(this.adminsInCamera).join(', ')}`);
      } else {
        this.verbose(1, `📷 [CAMERA IN] Sin steamID válido`);
      }
    });
    this.server.on('UNPOSSESSED_ADMIN_CAMERA', (info) => {
      if (info.player && info.player.steamID) {
        this.adminsInCamera.delete(info.player.steamID);
        this.verbose(1, `📷 [CAMERA OUT] ${info.player.name} (SteamID: ${info.player.steamID})`);
        this.verbose(1, `   → adminsInCamera: ${Array.from(this.adminsInCamera).join(', ') || '(vacío)'}`);
      } else {
        this.verbose(1, `📷 [CAMERA OUT] Sin steamID válido`);
      }
    });
    this.verbose(1, `📷 Listeners de cámara registrados`);
    this.timer = setInterval(async () => {
      await this.broadcast();
      await this.pollAdminCommands();
    }, this.options.intervalMs);

    this.verbose(1, `⏱️  Broadcasteando cada ${this.options.intervalMs}ms → ${this.options.workerUrl}`);
  }

  async unmount() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.verbose(1, 'SquadPanelBroadcast detenido.');
  }

  // ─── CARGA DE MAPEOS DESDE URL ────────────────────────────────────────────

  async loadIconMappings() {
    const url = this.options.iconMappingUrl || 'https://raw.githubusercontent.com/latamcompanysquad/squadpanel/refs/heads/main/vehicle_icon_mapping.json';

    try {
      this.verbose(1, `⬇️ Descargando mapeo desde ${url} ...`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this._applyMappingData(data);
      this.verbose(1, `✅ Mapeo cargado desde GitHub (${Object.keys(this.namedIcons).length} iconos nombrados, ${Object.keys(this.typeIcons).length} tipos, ${Object.keys(this.nameToType).length} vehículos mapeados)`);
    } catch (err) {
      this.verbose(1, `❌ Error al cargar mapeo desde URL: ${err.message}`);
      this.verbose(1, '📋 Usando diccionarios de respaldo internos (mínimos).');
      this.loadFallbackMappings();
    }

    this.rebuildNormalizedIndices();
  }

  _applyMappingData(data) {
    this.namedIcons = data.vehicles_with_named_icons || {};
    this.typeIcons = this.buildTypeIconsFromMapping(data.vehicle_type_mapping || {});
    this.nameToType = this.buildNameToTypeFromDetailed(data.detailed_vehicle_mapping || {});
    if (data.vehicles && Array.isArray(data.vehicles)) {
      for (const item of data.vehicles) {
        if (item.name && item.icon) this.namedIcons[item.name] = item.icon;
        if (item.name && item.type) this.nameToType[item.name] = item.type;
      }
    }
  }

  rebuildNormalizedIndices() {
    this.namedIconsNorm = buildNormalizedIndex(this.namedIcons);
    this.nameToTypeNorm = buildNormalizedIndex(this.nameToType);
  }

  loadFallbackMappings() {
    this.namedIcons = {};
    this.typeIcons = {};
    this.nameToType = {};
  }

  buildTypeIconsFromMapping(typeMapping) {
    const result = {};
    for (const [type, info] of Object.entries(typeMapping)) {
      if (info.icon) result[type] = info.icon;
    }
    return result;
  }

  buildNameToTypeFromDetailed(detailedMapping) {
    const result = {};
    for (const [name, info] of Object.entries(detailedMapping)) {
      if (info.type) result[name] = info.type;
    }
    return result;
  }

  // ─── RESOLUCIÓN DE ICONOS CON PLURALIZACIÓN ──────────────────────────────

  getVehicleIcon(vehicleName, vehicleType = null) {
    if (!vehicleName) return 'public__img__markers__weapons__test.webp';

    if (this.namedIcons[vehicleName]) return this.namedIcons[vehicleName];

    const normName = normalizeKey(vehicleName);
    if (this.namedIconsNorm[normName]) return this.namedIconsNorm[normName];
    if (normName.endsWith('s')) {
      const withoutS = normName.slice(0, -1);
      if (this.namedIconsNorm[withoutS]) return this.namedIconsNorm[withoutS];
    } else {
      const withS = normName + 's';
      if (this.namedIconsNorm[withS]) return this.namedIconsNorm[withS];
    }

    const parsedName = parseBlueprintName(vehicleName);
    const normParsed = normalizeKey(parsedName);
    if (normParsed !== normName) {
      if (this.namedIconsNorm[normParsed]) return this.namedIconsNorm[normParsed];
      if (normParsed.endsWith('s')) {
        const withoutS = normParsed.slice(0, -1);
        if (this.namedIconsNorm[withoutS]) return this.namedIconsNorm[withoutS];
      } else {
        const withS = normParsed + 's';
        if (this.namedIconsNorm[withS]) return this.namedIconsNorm[withS];
      }
    }

    if (vehicleType && this.typeIcons[vehicleType]) return this.typeIcons[vehicleType];

    let deducedType = this.nameToType[vehicleName] ?? this.nameToTypeNorm[normName];
    if (!deducedType) {
      if (normName.endsWith('s')) {
        deducedType = this.nameToTypeNorm[normName.slice(0, -1)];
      } else {
        deducedType = this.nameToTypeNorm[normName + 's'];
      }
    }
    if (!deducedType && normParsed !== normName) {
      deducedType = this.nameToTypeNorm[normParsed];
      if (!deducedType) {
        if (normParsed.endsWith('s')) {
          deducedType = this.nameToTypeNorm[normParsed.slice(0, -1)];
        } else {
          deducedType = this.nameToTypeNorm[normParsed + 's'];
        }
      }
    }

    if (deducedType && this.typeIcons[deducedType]) {
      return this.typeIcons[deducedType];
    }

    if (!this._unmatchedVehicleNames.has(vehicleName)) {
      this._unmatchedVehicleNames.add(vehicleName);
      this.verbose(1, `🧩 Sin icono para "${vehicleName}" (parsed: "${parsedName}") → test.webp`);
    }
    return 'public__img__markers__weapons__test.webp';
  }

  // ─── LECTURA DEL JSON DEL MOD ──────────────────────────────────────────────

  async readModData() {
    try {
      const buffer = await readFile(this.options.matchDataPath);

      if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
        const raw = buffer.toString('utf16le');
        const clean = raw.replace(/^\uFEFF/, '');
        this.modData = JSON.parse(clean);
        this.verbose(1, '✅ CurrentMatchData.json leído correctamente (UTF-16 LE)');
        this.logVehicleCount();
        return this.modData;
      }

      let raw = buffer.toString('utf8');
      if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);

      const start = raw.search(/[{\[]/);
      if (start === -1) throw new Error('No se encontró inicio de JSON');

      let cleaned = raw.slice(start);
      cleaned = cleaned.replace(/^[\x00-\x1F\x7F-\x9F\u200B\uFEFF\u2060\uFFFE]+/, '').trim();

      this.modData = JSON.parse(cleaned);
      this.verbose(1, '✅ CurrentMatchData.json leído correctamente (UTF-8)');
      this.logVehicleCount();

    } catch (err) {
      this.verbose(1, `⚠️ No se pudo leer CurrentMatchData.json: ${err.message}`);
      this.modData = null;
    }
    return this.modData;
  }

  logVehicleCount() {
    if (!this.modData || !this.modData.teams_data) {
      this.verbose(1, '📊 No hay datos de vehículos en CurrentMatchData');
      return;
    }
    let total = 0;
    const teamCounts = {};
    for (const [teamKey, team] of Object.entries(this.modData.teams_data)) {
      if (Array.isArray(team.vehicles)) {
        total += team.vehicles.length;
        teamCounts[teamKey] = team.vehicles.length;
      }
    }
    const countsStr = Object.entries(teamCounts).map(([k, v]) => `T${k}: ${v}`).join(', ');
    this.verbose(1, `📊 Vehículos en CurrentMatchData: ${total} total (${countsStr})`);
  }

  // ─── CONSTRUCCIÓN DE MAPAS DE DATOS ──────────────────────────────────────

  buildPositionMaps(modData) {
    const eosMap = {};
    const steamMap = {};
    const vehicleMap = {};
    const aliveMap = {};

    if (!modData?.teams_data) return { eosMap, steamMap, vehicleMap, aliveMap };

    for (const team of Object.values(modData.teams_data)) {
      if (!Array.isArray(team.players)) continue;
      for (const player of team.players) {
        if (player.EOS && player.pos) {
          const parts = player.pos.split(',').map(Number);
          if (parts.length >= 3 && !parts.some(isNaN)) {
            eosMap[player.EOS.toLowerCase()] = { x: parts[0], y: parts[1], z: parts[2] };
          }
        }
        if (player.Steam && player.pos) {
          const parts = player.pos.split(',').map(Number);
          if (parts.length >= 3 && !parts.some(isNaN)) {
            steamMap[String(player.Steam)] = { x: parts[0], y: parts[1], z: parts[2] };
          }
        }
        if (player.EOS && player.current_vehicle) {
          vehicleMap[player.EOS.toLowerCase()] = {
            id:   player.current_vehicle,
            name: player.current_vehicle_name || player.current_vehicle,
            seat: player.current_seat ?? 0,
          };
        }
        if (player.Steam && player.current_vehicle) {
          vehicleMap[String(player.Steam)] = {
            id:   player.current_vehicle,
            name: player.current_vehicle_name || player.current_vehicle,
            seat: player.current_seat ?? 0,
          };
        }
        if (player.is_alive !== undefined) {
          if (player.EOS)   aliveMap[player.EOS.toLowerCase()] = player.is_alive;
          if (player.Steam) aliveMap[String(player.Steam)] = player.is_alive;
        }
      }
    }
    return { eosMap, steamMap, vehicleMap, aliveMap };
  }

  // ─── BROADCASTING ──────────────────────────────────────────────────────────

  async broadcast() {
    try {
      this.broadcastCount++;
      const modData = await this.readModData();
      const snapshot = this.buildSnapshot(modData);
      await this.postToWorker(snapshot);
    } catch (err) {
      this.verbose(1, `❌ Error en broadcast: ${err.message}`);
    }
  }

  buildSnapshot(modData) {
    const server = this.server;
    const isFirstBroadcast = this.broadcastCount === 1;
    const isPeriodicLog = this.broadcastCount % 30 === 0;

    const layer = server.currentLayer ?? {};
    const mapName = layer.map?.name ?? server.currentMap ?? 'Unknown';
    const layerName = layer.name ?? server.currentLayer ?? 'Unknown';

    let factions = { team1: null, team2: null };

    if (server.currentLayer?.teams) {
      factions.team1 = server.currentLayer.teams[0]?.faction ?? null;
      factions.team2 = server.currentLayer.teams[1]?.faction ?? null;
    }

    if (!factions.team1 && server.team1?.faction) factions.team1 = server.team1.faction;
    if (!factions.team2 && server.team2?.faction) factions.team2 = server.team2.faction;

    if ((!factions.team1 || !factions.team2) && modData?.teams_data) {
      factions.team1 = factions.team1 ?? modData.teams_data['1']?.faction ?? null;
      factions.team2 = factions.team2 ?? modData.teams_data['2']?.faction ?? null;
    }

    const { eosMap, steamMap, vehicleMap, aliveMap } = this.buildPositionMaps(modData);

    const squadNameMap = {};
    if (modData?.teams_data) {
      for (const [teamKey, team] of Object.entries(modData.teams_data)) {
        const teamID = parseInt(teamKey);
        if (!teamID || !Array.isArray(team.squads)) continue;
        for (const squad of team.squads) {
          const sid = squad.squad_id;
          if (sid != null) {
            if (!squadNameMap[teamID]) squadNameMap[teamID] = {};
            squadNameMap[teamID][sid] = squad.squad_name || `Squad ${sid}`;
          }
        }
      }
    }

    // ── VEHÍCULOS (SIEMPRE DESDE MODDATA) ──
    const vehicles = [];

    if (modData?.teams_data) {
      for (const [teamKey, team] of Object.entries(modData.teams_data)) {
        const teamID = parseInt(teamKey);
        if (!teamID || !Array.isArray(team.vehicles)) continue;
        for (const v of team.vehicles) {
          if (!v.pos) continue;
          const parts = v.pos.split(',').map(Number);
          if (parts.length < 3) continue;
          const vehicleName = v.vehicle_name ?? v.vehicle;
          const vehicleType = this.nameToType[vehicleName] || null;
          const icon = this.getVehicleIcon(vehicleName, vehicleType);
          vehicles.push({
            id:       v.vehicle,
            type:     vehicleName,
            teamID,
            icon,
            health:   v.health,
            position: { x: parts[0], y: parts[1], z: parts[2] },
          });
        }
      }
    }

    // Fallback a SquadJS si modData no tiene vehículos
    if (vehicles.length === 0) {
      for (const team of [server.team1, server.team2]) {
        if (!team?.vehicles) continue;
        for (const v of team.vehicles) {
          const vehicleName = v.typeName ?? v.type;
          const vehicleType = this.nameToType[vehicleName] || null;
          const icon = this.getVehicleIcon(vehicleName, vehicleType);
          vehicles.push({
            id:       v.id,
            type:     vehicleName,
            teamID:   team.teamID,
            icon,
            health:   v.health ? `${v.health}/${v.maxHealth}` : null,
            position: v.position ? { x: v.position.x, y: v.position.y, z: v.position.z } : null,
          });
        }
      }
    }

    // LOG de vehículos enviados
    this.verbose(1, `🚗 Vehículos enviados al worker: ${vehicles.length}`);
    this.verbose(1, `📋 Vehículos: ${vehicles.map(v => `${v.type}(T${v.teamID})`).join(', ')}`);

    if (isFirstBroadcast || isPeriodicLog) {
      this._validateVehicleIconCoverage(vehicles);
    }

    // ── JUGADORES ──
    const squadPlayers = server.players ?? [];
    const players = squadPlayers.map((player) => {
      const eosKey = (player.eosID ?? '').toLowerCase();
      let position = eosMap[eosKey] ?? steamMap[String(player.steamID)] ?? null;

      if (!position && player.position) {
        position = { x: player.position.x, y: player.position.y, z: player.position.z };
      }

      const vehicleInfo = vehicleMap[eosKey] ?? vehicleMap[String(player.steamID)] ?? null;
      let vehicle = null;
      let seat = null;

      if (vehicleInfo) {
        vehicle = { id: vehicleInfo.id, name: vehicleInfo.name };
        seat = vehicleInfo.seat;
      } else if (player.vehicle?.typeName) {
        vehicle = { id: player.vehicle.id, name: player.vehicle.typeName };
      } else if (player.vehicle) {
        vehicle = { id: player.vehicle, name: player.vehicle };
      }

      const squadName = squadNameMap[player.teamID]?.[player.squadID] ?? null;
      const isAliveFromMod = aliveMap[eosKey] ?? aliveMap[String(player.steamID)];
      const isAlive = isAliveFromMod !== undefined ? isAliveFromMod : (player.isAlive ?? true);


      const isSpectating = this.adminsInCamera.has(player.steamID);
      
      return {
        steamID:  player.steamID,
        eosID:    player.eosID ?? null,
        name:     player.name,
        teamID:   player.teamID,
        squadID:  player.squadID,
        squadName,
        playerID: player.playerID ?? player.index ?? null,
        isLeader: player.isLeader ?? false,
        role:     player.role ?? null,
        position: isSpectating ? null : position,
        vehicle,
        seat,
        isAlive,
        isSpectating,
      };
    });


    // DEBUG: Always log spectators every broadcast
    const withSpectating = players.filter(p => p.isSpectating).length;
    if (this.adminsInCamera.size > 0 || withSpectating > 0) {
      this.verbose(1, `📷 [DEBUG] adminsInCamera.size=${this.adminsInCamera.size}, withSpectating=${withSpectating}`);
      if (withSpectating > 0) {
        const spectDeets = players.filter(p => p.isSpectating).map(p => `${p.name}(${p.steamID})`).join(', ');
        this.verbose(1, `📷 [SPECTATORS FOUND] ${spectDeets}`);
        // Log detailed info
        players.filter(p => p.isSpectating).forEach(p => {
          this.verbose(1, `📷   → ${p.name}: position=${p.position ? 'YES' : 'NO'}, isAlive=${p.isAlive}, squad=${p.squadID ?? 'N/A'}`);
        });
      }
    }

    if (isFirstBroadcast || isPeriodicLog) {
      const total = players.length;
      const withPos = players.filter(p => p.position !== null).length;
      const withVeh = players.filter(p => p.vehicle !== null).length;
      const withSpectating = players.filter(p => p.isSpectating).length;
      if (withSpectating > 0) {
        const spectNames = players.filter(p => p.isSpectating).map(p => p.name).join(', ');
        this.verbose(1, `📷 [SPECTATORS] ${withSpectating} en cámara: ${spectNames}`);
      }
      this.verbose(1, `📊 Jugadores: ${total} total, ${withPos} con posición, ${withVeh} en vehículo`);
    }

    // ── FOBs ──
    const fobs = [];
    const serverFobs = (server.deployables ?? [])
      .filter(d => d.type === 'FOB' || d.type === 'HAB' || d.type === 'RadioTower')
      .map(d => ({
        pos: d.position ? { x: d.position.x, y: d.position.y } : null,
        teamID: d.teamID,
        habName: d.name || `FOB_${d.teamID}`,
        construct_radius: d.construct_radius || 15000,
        exclusion_radius: d.exclusion_radius || 30000,
      }))
      .filter(f => f.pos !== null);

    fobs.push(...serverFobs);

    if (modData?.teams_data) {
      const layerData = modData.LayerData || {};
      const defaultConstruct = layerData.fob_construction_radius || 15000;
      const defaultExclusion = layerData.fob_exclusion_radius || 40000;

      for (const [teamKey, team] of Object.entries(modData.teams_data)) {
        const teamID = parseInt(teamKey);
        if (!teamID || !Array.isArray(team.deployables)) continue;

        for (const d of team.deployables) {
          if (!d.deployable || !d.pos) continue;
          const parts = d.pos.split(',').map(Number);
          if (parts.length < 3) continue;

          const deployableLower = d.deployable.toLowerCase();
          const isHab = deployableLower.includes('hab');
          const isFobRadio = deployableLower.includes('fobradio');

          if (!isFobRadio && !isHab) continue;

          const owner = d.owner_eos || null;
          let habName = isHab ? `HAB_${teamID}` : `FOB_${teamID}`;

          if (owner) {
            for (const [, t] of Object.entries(modData.teams_data)) {
              for (const p of (t.players || [])) {
                if (p.EOS?.toLowerCase() === owner.toLowerCase()) {
                  habName = p.name || habName;
                  break;
                }
              }
            }
          }

          const fobEntry = {
            pos: { x: parts[0], y: parts[1] },
            teamID,
            habName,
            construct_radius: d.construct_radius || defaultConstruct,
            exclusion_radius: d.exclusion_radius || defaultExclusion,
            isHab,
          };

          if (isHab) fobEntry.isActive = d.is_active_spawn === true;

          fobs.push(fobEntry);
        }
      }
    }

    // ── TICKETS, OBJECTIVES, RALLIES, AMMOCRATES ──
    let tickets = { team1: server.team1?.tickets ?? null, team2: server.team2?.tickets ?? null };
    if ((tickets.team1 === null || tickets.team2 === null) && modData?.teams_data) {
      tickets = {
        team1: modData.teams_data['1']?.tickets ?? tickets.team1,
        team2: modData.teams_data['2']?.tickets ?? tickets.team2,
      };
    }

    const objectives = (modData?.objectives ?? []).map((o) => {
      const parts = o.pos?.split(',').map(Number) ?? [];
      return {
        name:       o.flag_name,
        owningTeam: parseInt(o.owning_team) || 0,
        position:   parts.length >= 3 ? { x: parts[0], y: parts[1], z: parts[2] } : null,
      };
    });

    const rallyPoints = [];
    if (modData?.teams_data) {
      for (const [teamKey, team] of Object.entries(modData.teams_data)) {
        const teamID = parseInt(teamKey);
        if (!teamID || !Array.isArray(team.squads)) continue;
        for (const squad of team.squads) {
          if (!squad.rally_pos) continue;
          const parts = squad.rally_pos.split(',').map(Number);
          if (parts.length < 3) continue;
          rallyPoints.push({ pos: { x: parts[0], y: parts[1] }, teamID, squadID: squad.squad_id });
        }
      }
    }

    const ammocrates = [];
    if (modData?.teams_data) {
      for (const [teamKey, team] of Object.entries(modData.teams_data)) {
        const teamID = parseInt(teamKey);
        if (!teamID || !Array.isArray(team.deployables)) continue;
        for (const d of team.deployables) {
          if (!d.deployable || !d.deployable.includes('Ammocrate') || !d.pos) continue;
          const parts = d.pos.split(',').map(Number);
          if (parts.length < 3) continue;
          ammocrates.push({ pos: { x: parts[0], y: parts[1] }, teamID, state: d.state || 'Unknown' });
        }
      }
    }

    // ── TIEMPO RESTANTE ──
      let matchRemainingTime = null;
      if (modData?.match_remaining_time != null) {
        matchRemainingTime = modData.match_remaining_time; // segundos
      }

    return {
      serverName: server.serverName ?? '',
      map: mapName,
      layer: layerName,
      factions,
      players,
      vehicles,
      fobs,
      tickets,
      objectives,
      rallyPoints,
      ammocrates,
      matchRemainingTime, 
      ts: Date.now(),
      live: true,
    };
  }

  // ─── VALIDACIÓN Y LOGGING ──────────────────────────────────────────────────

  _validateVehicleIconCoverage(vehicles) {
    const total = vehicles.length;
    const withIcon = vehicles.filter(v => v.icon && !v.icon.includes('test.webp')).length;
    const coverage = total > 0 ? ((withIcon / total) * 100).toFixed(1) : 0;
    const emoji = coverage >= 90 ? '✅' : coverage >= 70 ? '⚠️' : '❌';
    this.verbose(1, `${emoji} Icon coverage: ${withIcon}/${total} vehicles (${coverage}%)`);

    if (withIcon < total) {
      const missing = vehicles
        .filter(v => !v.icon || v.icon.includes('test.webp'))
        .map(v => `${v.type}(T${v.teamID})`)
        .join(', ')
        .substring(0, 200);
      this.verbose(2, `   Sin icono: ${missing}`);
    }
  }

  // ─── ADMIN COMMANDS ──────────────────────────────────────────────────────────

  async pollAdminCommands() {
    const workerUrl = this.options.workerUrl;
    if (!workerUrl) return;

    let commands;
    try {
      const res = await fetch(`${workerUrl}/api/admin/pending`);
      if (!res.ok) return;
      const data = await res.json();
      commands = data.commands ?? [];
    } catch (e) {
      return;
    }

    if (!commands.length) return;

    for (const cmd of commands) {
      try {
        await this.executeAdminCommand(cmd);
        await fetch(`${workerUrl}/api/admin/done/${cmd.id}`, { method: 'DELETE' });
        this.verbose(1, `[AdminCmd] ✓ ${cmd.action} (${cmd.id})`);
      } catch (e) {
        this.verbose(1, `[AdminCmd] ✗ ${cmd.action}: ${e.message}`);
        await fetch(`${workerUrl}/api/admin/done/${cmd.id}`, { method: 'DELETE' }).catch(() => {});
      }
    }
  }

  async executeAdminCommand(cmd) {
    const { action, payload } = cmd;
    const rcon = this.server.rcon;
    const targetId = payload.playerID ?? null;

    switch (action) {
      case 'warn': {
        const msg = payload.reason ?? 'Advertencia del administrador';
        if (targetId != null) {
          await rcon.execute(`AdminWarnById ${targetId} ${msg}`);
        } else {
          await rcon.execute(`AdminWarn "${payload.steamID}" ${msg}`);
        }
        break;
      }
      case 'kick': {
        const reason = payload.reason ?? 'Kicked by admin';
        if (targetId != null) {
          await rcon.execute(`AdminKickById ${targetId} ${reason}`);
        } else {
          await rcon.execute(`AdminKick "${payload.steamID}" ${reason}`);
        }
        break;
      }
      case 'ban': {
        const duration = payload.duration ?? 1440;
        const reason = payload.reason ?? 'Banned by admin';
        const banTarget = payload.eosID ?? payload.steamID;
        await rcon.execute(`AdminBan "${banTarget}" ${duration} ${reason}`);
        break;
      }
      case 'switchTeam': {
        if (targetId != null) {
          await rcon.execute(`AdminForceTeamChangeById ${targetId}`);
        } else {
          await rcon.execute(`AdminForceTeamChange "${payload.steamID}"`);
        }
        break;
      }
      case 'broadcast':
        await rcon.execute(`AdminBroadcast ${payload.message}`);
        break;
      case 'setNextMap':
        await rcon.execute(`AdminSetNextLayer ${payload.map}`);
        break;
      case 'endMatch':
        await rcon.execute(`AdminEndMatch`);
        break;
      case 'pauseMatch':
        await rcon.execute(`AdminPauseMatch`);
        break;
      case 'unpauseMatch':
        await rcon.execute(`AdminUnpauseMatch`);
        break;
      default:
        this.verbose(1, `[AdminCmd] Unknown action: ${action}`);
    }
  }

  async postToWorker(snapshot) {
    const url = `${this.options.workerUrl}/api/match`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret': this.options.writeSecret,
      },
      body: JSON.stringify(snapshot),
    });

    if (res.ok) {
      this.verbose(2, `✅ Data sent (${new Date().toISOString()})`);
    } else {
      const text = await res.text();
      throw new Error(`Worker responded ${res.status}: ${text}`);
    }
  }
}