// ─── CARGA DEL MAPEO DESDE GITHUB ──────────────────────────────────────────
const MAPPING_URL = 'https://raw.githubusercontent.com/latamcompanysquad/squadpanel/refs/heads/main/vehicle_icon_mapping.json';

let VEHICLES_WITH_NAMED_ICONS = {};
let VEHICLE_TYPE_ICONS = {};
let VEHICLE_NAME_TO_TYPE = {};
let VEHICLES_WITH_NAMED_ICONS_NORM = {};
let VEHICLE_NAME_TO_TYPE_NORM = {};

function normalizeVehicleKey(str) {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[\s\-_.]+/g, '');
}

function buildNormalizedIndex(dict) {
  const idx = {};
  for (const key in dict) idx[normalizeVehicleKey(key)] = dict[key];
  return idx;
}

async function loadVehicleMapping() {
  try {
    const resp = await fetch(MAPPING_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    VEHICLES_WITH_NAMED_ICONS = data.vehicles_with_named_icons || {};
    VEHICLES_WITH_NAMED_ICONS_NORM = buildNormalizedIndex(VEHICLES_WITH_NAMED_ICONS);

    const typeMap = data.vehicle_type_mapping || {};
    VEHICLE_TYPE_ICONS = {};
    for (const [type, info] of Object.entries(typeMap)) {
      if (info.icon) VEHICLE_TYPE_ICONS[type] = info.icon;
    }

    const detailMap = data.detailed_vehicle_mapping || {};
    VEHICLE_NAME_TO_TYPE = {};
    for (const [vehicle, info] of Object.entries(detailMap)) {
      if (info.type) VEHICLE_NAME_TO_TYPE[vehicle] = info.type;
    }
    VEHICLE_NAME_TO_TYPE_NORM = buildNormalizedIndex(VEHICLE_NAME_TO_TYPE);

    //console.log('✅ Mapeo de vehículos cargado desde GitHub');
  } catch (e) {
    console.warn('❌ No se pudo cargar mapeo desde GitHub, usando fallback local:', e);
    // Fallback: intentar cargar localmente
    try {
      const resp = await fetch('vehicle_icon_mapping.json');
      if (resp.ok) {
        const data = await resp.json();
        VEHICLES_WITH_NAMED_ICONS = data.vehicles_with_named_icons || {};
        VEHICLES_WITH_NAMED_ICONS_NORM = buildNormalizedIndex(VEHICLES_WITH_NAMED_ICONS);
        const typeMap = data.vehicle_type_mapping || {};
        VEHICLE_TYPE_ICONS = {};
        for (const [type, info] of Object.entries(typeMap)) {
          if (info.icon) VEHICLE_TYPE_ICONS[type] = info.icon;
        }
        const detailMap = data.detailed_vehicle_mapping || {};
        VEHICLE_NAME_TO_TYPE = {};
        for (const [vehicle, info] of Object.entries(detailMap)) {
          if (info.type) VEHICLE_NAME_TO_TYPE[vehicle] = info.type;
        }
        VEHICLE_NAME_TO_TYPE_NORM = buildNormalizedIndex(VEHICLE_NAME_TO_TYPE);
        //console.log('✅ Mapeo cargado localmente como fallback');
      }
    } catch (e2) {
      console.warn('⚠️ No se pudo cargar mapeo local, usando fallbacks internos.');
    }
  }
}
// ─── RESOLUCIÓN DE ICONOS (usa los diccionarios cargados) ──────────────────
function getVehicleIcon(vehicleName, vehicleType = null) {
  if (!vehicleName) return 'public__img__markers__weapons__test.webp';

  // 1. Exacto en named icons
  if (VEHICLES_WITH_NAMED_ICONS[vehicleName]) {
    return VEHICLES_WITH_NAMED_ICONS[vehicleName];
  }

  // 2. Normalizado (sin espacios, guiones, etc.)
  const norm = normalizeVehicleKey(vehicleName);
  if (VEHICLES_WITH_NAMED_ICONS_NORM[norm]) {
    return VEHICLES_WITH_NAMED_ICONS_NORM[norm];
  }

  // 3. Si se proporciona un tipo, usar el icono por tipo
  if (vehicleType && VEHICLE_TYPE_ICONS[vehicleType]) {
    return VEHICLE_TYPE_ICONS[vehicleType];
  }

  // 4. Deducir tipo del nombre y usar icono de tipo
  const deducedType = VEHICLE_NAME_TO_TYPE[vehicleName] || VEHICLE_NAME_TO_TYPE_NORM[norm];
  if (deducedType && VEHICLE_TYPE_ICONS[deducedType]) {
    return VEHICLE_TYPE_ICONS[deducedType];
  }

  // 5. Fallback
  return 'public__img__markers__weapons__test.webp';
}

// ─── ICONOS PARA DESPLEGABLES (FOB, HAB, AMMO, RALLY) ────────────────────
function getDeployableIcon(type, teamID, isActive = true) {
  //console.log('getDeployableIcon llamado con teamID:', teamID);
  const tid = parseInt(teamID, 10);
  //console.log('tid:', tid);
  let suffix = 'WHITE';
  if (tid === 1) suffix = 'BLUE';
  else if (tid === 2) suffix = 'RED';

  let baseName = '';
  if (type === 'fob') baseName = 'MAP_FOB';
  else if (type === 'hab') baseName = 'MAP_HAB';
  else if (type === 'ammo') baseName = 'MAP_AMMOCRATE';
  else if (type === 'rally') baseName = 'MAP_RALLY';
  else return '';

  const finalSuffix = isActive ? suffix : 'WHITE';
  return `./resources/${baseName}_${finalSuffix}.svg`;
}

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
const WORKER_URL = 'https://squadpanel-worker.latamcompanysquad.workers.dev';
const POLL_MS    = 2000;
const MAP_UNITS  = 1000;

// Agrega este mapeo FUERA de updateHUD, junto a las otras constantes arriba
const FACTION_CODE = {
  'United States Marine Corps': 'USMC',
  'United States Army': 'USA',
  'Australian Defence Force': 'ADF',
  'Canadian Army Forces': 'CAF',
  'British Armed Forces': 'BAF',
  'Russian Ground Forces': 'RGF',
  'Russian Airborne Forces': 'VDV',
  'Insurgent Forces': 'INS',
  'Middle Eastern Alliance': 'MEA',
  'Middle Eastern Insurgents': 'MEI',
  'Turkish Land Forces': 'TLF',
  'Irregular Militia Forces': 'IMF',
  'Global Freedom Incarnate': 'GFI',
  "People's Liberation Army": 'PLA',
  'PLA Air Ground Forces': 'PLAAGF',
  'PLA Naval Marine Corps': 'PLANMC',
  'Western PMC': 'WPMC',
  'Armed Forces of Ukraine': 'AFU',
  'Combined Russian Forces': 'CRF',
};

const MAP_CORNERS = {
  'albasrah':     { c0:[-200000,-200000], c1:[200000,200000] },
  'anvil':        { c0:[-204000,-204000], c1:[102000,102000] },
  'blackcoast':   { c0:[-229900,-212700], c1:[229900,247200] },
  'chora':        { c0:[-246400,-266400], c1:[160000,140000] },
  'fallujah':     { c0:[-131500,-154500], c1:[169000,146000] },
  'foolsroad':    { c0:[-132600,-132600], c1:[ 44800, 44800] },
  'goosebay':     { c0:[-201600,-201600], c1:[201500,201500] },
  'gorodok':      { c0:[-203200,-203200], c1:[203200,203200] },
  'harju':        { c0:[-201600,-201600], c1:[201600,201600] },
  'jensen':       { c0:[-200400,-200400], c1:[200400,200400] },
  'kamdesh':      { c0:[-201600,-201600], c1:[201600,201600] },
  'kohat':        { c0:[-230000,-230000], c1:[231700,231700] },
  'kokan':        { c0:[-107600,-107600], c1:[142000,142000] },
  'lashkar':      { c0:[-216700,-216700], c1:[216700,216700] },
  'logar':        { c0:[ -88100,-113200], c1:[ 88000, 62900] },
  'manicouagan':  { c0:[-201600,-201600], c1:[201500,201500] },
  'mestia':       { c0:[-120000,-110000], c1:[120000,130000] },
  'mutaha':       { c0:[ -93500,-114000], c1:[182000,161500] },
  'narva':        { c0:[-139000,-140200], c1:[141000,139800] },
  'pacific':      { c0:[-201600,-201600], c1:[201600,201600] },
  'sanxian':      { c0:[-230000,-205000], c1:[230000,255000] },
  'skorpo':       { c0:[-361100,-329300], c1:[323800,357600] },
  'sumari':       { c0:[ -64000, -44700], c1:[ 66000, 85300] },
  'tallil':       { c0:[-234000,-234000], c1:[234000,234000] },
  'yehorivka':    { c0:[-330200,-330200], c1:[304800,304800] },
};

function normalizeMapName(raw) {
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/[^a-z]/g, '');
  let best = null;
  for (const key of Object.keys(MAP_CORNERS)) {
    if (s.includes(key) && (!best || key.length > best.length)) best = key;
  }
  return best;
}

// ─── LEAFLET MAPA ─────────────────────────────────────────────────────────────
const map = L.map('map', {
  crs: L.CRS.Simple, minZoom: -2, maxZoom: 4, zoomSnap: 0.5,
  attributionControl: false, zoomControl: false,
});
const bounds = [[0,0],[MAP_UNITS,MAP_UNITS]];
map.fitBounds(bounds);

let basemapLayer = null;
let currentMapKey = null;
let imageLoaded = false;
let rallyLayer = null;
let ammoLayer = null;

function loadBasemap(mapKey, force = false) {
  if (!force && mapKey === currentMapKey && imageLoaded) return;
  const url = `./maps/${mapKey}.webp`;
  if (basemapLayer) { map.removeLayer(basemapLayer); basemapLayer = null; }
  basemapLayer = L.imageOverlay(url, bounds, { opacity: 0 }).addTo(map);
  basemapLayer.getElement()?.addEventListener('load', () => {
    basemapLayer.setOpacity(1); imageLoaded = true; currentMapKey = mapKey;
  });
  basemapLayer.getElement()?.addEventListener('error', () => {
    console.warn('No se pudo cargar imagen del mapa:', url);
    imageLoaded = false;
  });
}

function gameToLatLng(pos, corners) {
  const fracX = (pos.x - corners.minX) / (corners.maxX - corners.minX);
  const fracY = (pos.y - corners.minY) / (corners.maxY - corners.minY);
  const px = fracX * MAP_UNITS;
  const py = (1 - fracY) * MAP_UNITS;
  return [py, px];
}

function metersToMapUnits(meters, corners) {
  if (!corners || !corners.minX || !corners.maxX) return 0;
  const xRange = Math.abs(corners.maxX - corners.minX);
  return Math.abs(meters / xRange) * MAP_UNITS;
}

function lerp(a, b, t) { return a + (b - a) * t; }

// ─── FACCIONES Y ROLES ────────────────────────────────────────────────────────
const KNOWN_FACTIONS = ['USA','USMC','ADF','CAF','BAF','RGF','VDV','INS','MEA','MEI','TLF','IMF','GFI','PLA','PLAAGF','PLANMC','WPMC','AFU','CRF'];
function factionFromRole(role) {
  if (!role) return null;
  const prefix = role.split('_')[0]?.toUpperCase();
  return KNOWN_FACTIONS.includes(prefix) ? prefix : null;
}

function roleIconName(p) {
  const r = (p.role || '').toLowerCase();
  if (p.isLeader) {
    if (r.includes('sl_crewman') || r.includes('slcrewman'))  return 'crewman_squadleader';
    if (r.includes('sl_pilot')   || r.includes('slpilot'))    return 'pilot_squadleader';
    return 'squadleader';
  }
  if (r.includes('automaticrifleman_optic')) return 'automaticrifleman_optic';
  if (r.includes('automaticrifleman') || r.includes('autorifleman') || r.includes('automatic_rifleman')) return 'automaticrifleman';
  if (r.includes('crewman'))            return 'crewman';
  if (r.includes('designatedmarksman') || r.includes('marksman')) return 'designatedmarksman';
  if (r.includes('heavyantitank') || r.includes('heavy_at') || r.includes('hat')) return 'heavyantitank';
  if (r.includes('lightantitank')  || r.includes('light_at') || r.includes('lat')) return 'lightantitank';
  if (r.includes('machinegunner') || r.includes('machinegunner')) return 'machinegunner';
  if (r.includes('medic'))              return 'medic';
  if (r.includes('pilot'))              return 'pilot';
  if (r.includes('raider'))             return 'raider';
  if (r.includes('recruit') || r.includes('plain') || r.includes('unarmed')) return 'recruit';
  if (r.includes('rifleman_scoped') || r.includes('rifleman2') || r.includes('rifleman_02') || r.includes('rifleman_03')) return 'rifleman_scoped';
  if (r.includes('rifleman'))           return 'rifleman';
  if (r.includes('sapper'))             return 'sapper';
  if (r.includes('scout'))              return 'scout';
  if (r.includes('sniper'))             return 'sniper';
  if (r.includes('grenadier'))          return 'grenadier';
  if (r.includes('engineer'))           return 'engineer';
  return 'rifleman';
}

function roleIconPath(p, variant) {
  const name = roleIconName(p);
  if (variant === 'white') {
    return `./resources/Role_Icons_Squad_White/T_role_${name}.webp`;
  }
  const teamFolder = p.teamID === 1 ? 'Role_Icons_Squad_Blue' : 'Role_Icons_Squad_Red';
  const teamSuffix = p.teamID === 1 ? 'blue' : 'red';
  return `./resources/${teamFolder}/T_role_${name}_${teamSuffix}.png`;
}

// ─── ICONOS ────────────────────────────────────────────────────────────────────
function makeIcon(p, selected) {
  const color = p.teamID === 1 ? '#4fa6e8' : '#e0584f';
  const ringStyle = selected ? 'box-shadow:0 0 0 2px #d9a441;border-radius:50%;' : '';

  if (!p.isAlive && p.position) {
    const iconName = roleIconName(p);
    const iconSrc = roleIconPath(p, 'team');
    const xColor = p.teamID === 1 ? '#4fa6e8' : '#e0584f';
    const iconHtml = `<div style="position:relative;width:28px;height:28px;${ringStyle}">
      <img src="${iconSrc}" alt="${iconName}" style="position:absolute;inset:1px;width:26px;height:26px;opacity:.45;filter:grayscale(.6) drop-shadow(0 0 1px #000a);"/>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:20px;color:${xColor};text-shadow:0 0 3px #000,0 0 3px #000;">✕</div>
    </div>`;
    return L.divIcon({ html: iconHtml, iconSize: [28, 28], iconAnchor: [14, 14], className: '' });
  }

  if (p.vehicle) {
    let vehicleEmoji = '🚚';
    const v = (p.vehicle.name || p.vehicle).toLowerCase();
    if (v.includes('tank') || v.includes('mbt')) vehicleEmoji = '🎯';
    else if (v.includes('helo') || v.includes('heli') || v.includes('ch-146') || v.includes('z-8')) vehicleEmoji = '🚁';
    else if (v.includes('logi') || v.includes('logistics')) vehicleEmoji = '🚚';
    else if (v.includes('mrap') || v.includes('tigr') || v.includes('tapv')) vehicleEmoji = '🚙';
    else if (v.includes('ifv') || v.includes('apc')) vehicleEmoji = '🚌';

    const iconHtml = `<div style="
      width:28px;height:28px;
      background:${color};
      border-radius:50%;
      border:2px solid #000;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;
      box-shadow:0 0 4px rgba(0,0,0,0.8);
      ${ringStyle}
    ">${vehicleEmoji}</div>`;
    return L.divIcon({ html: iconHtml, iconSize: [28, 28], iconAnchor: [14, 14], className: '' });
  }

  const iconName = roleIconName(p);
  const iconSrc = roleIconPath(p, 'team');
  const roleImg = `<img src="${iconSrc}" alt="${iconName}" style="position:absolute;inset:1px;width:26px;height:26px;image-rendering:auto;filter:drop-shadow(0 0 1px #000a);"/>`;
  const vehicleBadge = p.vehicle ? `<div style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;border-radius:2px;background:#d9a441;border:1px solid #000;display:flex;align-items:center;justify-content:center;font-size:6px;">🚗</div>` : '';
  const html = `<div style="position:relative;width:28px;height:28px;${ringStyle}">${roleImg}${vehicleBadge}</div>`;
  return L.divIcon({ html, iconSize: [28, 28], iconAnchor: [14, 14], className: '' });
}

function objectiveColor(owningTeam) {
  const t = parseInt(owningTeam, 10);
  return t === 1 ? '#4fa6e8' : t === 2 ? '#e0584f' : '#9aa092';
}
function isMainObjective(o) {
  return o.name && o.name.toLowerCase().includes('main');
}

function makeObjectiveIcon(owningTeam, isMain) {
  const color = objectiveColor(owningTeam);
  let svg;
  if (isMain) {
    // Ícono distinto para main: círculo con base
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <line x1="14" y1="4" x2="14" y2="33" stroke="#1a1a1a" stroke-width="2"/>
      <circle cx="14" cy="13" r="9" fill="${color}" stroke="#000" stroke-width="1.5" opacity=".95"/>
      <text x="14" y="17" text-anchor="middle" font-size="8" fill="#fff" font-family="sans-serif" font-weight="bold">M</text>
      <circle cx="14" cy="33" r="2.5" fill="#000"/>
    </svg>`;
    return L.divIcon({ html: svg, iconSize:[28,36], iconAnchor:[14,33], className:'' });
  }
  svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="32" viewBox="0 0 26 32">
      <line x1="4" y1="2" x2="4" y2="29" stroke="#1a1a1a" stroke-width="2"/>
      <path d="M4 3 L22 7.5 L4 13 Z" fill="${color}" stroke="#000" stroke-width="1" opacity=".95"/>
      <circle cx="4" cy="29" r="2.5" fill="#000"/>
     </svg>`;
  return L.divIcon({ html: svg, iconSize:[26,32], iconAnchor:[4,29], className:'' });
}

// ─── FILTROS Y FOLLOW ────────────────────────────────────────────────────────
const filters = { t1: true, t2: true, veh: true, dead: false, empty: true, flags: true };
let lastSnapshot = null;
let followSelected = false;

function toggleFilter(key) {
  filters[key] = !filters[key];
  document.getElementById('f' + key).classList.toggle('active', filters[key]);
  if (lastSnapshot) {
    const { players, vehicles, corners, objectives } = lastSnapshot;
    updateMarkers(players, vehicles, corners);
    updatePlayerList(players);
    if (objectives) updateObjectives(objectives, corners);
  }
}

function toggleFollowSelected() {
  followSelected = !followSelected;
  const btn = document.getElementById('btnFollowSel');
  btn.style.color = followSelected ? 'var(--amber)' : 'var(--text-dim)';
  btn.title = followSelected ? 'Seguir: ON (click para OFF)' : 'Seguir jugador seleccionado';
}

// ─── MARCADORES ────────────────────────────────────────────────────────────────
let objectivesPaneReady = false;
function ensureObjectivesPane() {
  if (objectivesPaneReady) return;
  map.createPane('objectivesPane');
  map.getPane('objectivesPane').style.zIndex = 450;
  objectivesPaneReady = true;
}

const markers = {};
let vehicleIconMap = {};
let selectedSteamID = null;
const expandedSquads = {}; // Track squad collapse/expand state per teamID_squadID

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function makeTooltipContent(p) {
  const tc   = p.teamID === 1 ? 'tip-t1' : 'tip-t2';
  const tl   = `T${p.teamID}`;
  const icon = roleIconName(p);
  const role = icon.replace(/_/g,' ');
  const veh  = p.vehicle ? `<div class="tip-vehicle">🚗 ${esc(p.vehicle.name || p.vehicle)}</div>` : '';
  const squad = p.squadID ? `<div class="tip-squad-info">Squad <span class="squad-num">${p.squadID}</span></div>` : '';
  const leader = p.isLeader ? '<div class="tip-leader">★ Squad Leader</div>' : '';
  return `<div class="tip-container"><div class="tip-name"><span class="${tc}">[${tl}]</span> ${esc(p.name)}</div><div class="tip-role">${role}</div>${squad}${leader}${veh}</div>`;
}

function playerPassesFilter(p) {
  if (!p.position) return false;
  if (!filters.t1 && p.teamID === 1) return false;
  if (!filters.t2 && p.teamID === 2) return false;
  if (!filters.veh && p.vehicle) return false;
  if (!filters.dead && !p.isAlive) return false;
  return true;
}

function makeVehicleIcon(group, selected) {
  const color = group.teamID === 1 ? '#4fa6e8' : '#e0584f';
  const ringStyle = selected ? 'box-shadow:0 0 0 2px #d9a441;border-radius:50%;' : '';
  const count = group.occupants ? group.occupants.length : 0;
  let iconUrl = group.icon || 'public__img__markers__weapons__test.webp';
  if (!iconUrl.startsWith('resources/')) {
    iconUrl = 'resources/' + iconUrl;
  }
  const isEmpty = count === 0;
  const opacityStyle = isEmpty ? 'opacity:0.6;' : '';
  const html = `<div style="
    width:32px;height:32px;
    background:${color};
    border-radius:50%;
    border:2px solid #000;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 4px rgba(0,0,0,0.8);
    ${ringStyle};
    ${opacityStyle};
    position:relative;
    overflow:hidden;
  ">
    <img src="${iconUrl}" style="width:100%;height:100%;object-fit:contain;" />
    ${count > 0 ? `<span style="
      position:absolute;bottom:-2px;right:-2px;
      background:#1a1a1a;color:#fff;border-radius:50%;
      width:14px;height:14px;font-size:8px;font-weight:bold;
      display:flex;align-items:center;justify-content:center;
      border:1px solid #000;
    ">${count}</span>` : ''}
  </div>`;
  return L.divIcon({ html, iconSize: [32, 32], iconAnchor: [16, 16], className: '' });
}

function showVehicleCard(group) {
  const teamColor = group.teamID === 1 ? 'blue' : 'red';
  const teamLabel = group.teamID === 1 ? 'T1' : 'T2';
  const occ = group.occupants || [];
  const occupantsHtml = occ.map(p =>
    `<div style="display:flex;justify-content:space-between;font-size:10px;border-bottom:1px solid #1a1f18;padding:2px 0;">
      <span>${esc(p.name)}</span>
      <span style="color:var(--text-dim);">asiento ${p.seat ?? '?'}</span>
    </div>`
  ).join('');
  document.getElementById('playerPanel').innerHTML = `
    <div class="player-card">
      <div class="pname"><span class="ptag ${teamColor}">[${teamLabel}]</span> 🚗 ${esc(group.vehicleName)}</div>
      ${occ.length ? `<div style="margin-top:6px;font-size:11px;color:var(--text-dim);">Ocupantes (${occ.length})</div>
      ${occupantsHtml}` : `<div style="margin-top:6px;font-size:11px;color:var(--text-dim);">Vehículo vacío</div>`}
    </div>`;
}

function makeVehicleTooltip(group) {
  const teamLabel = group.teamID === 1 ? 'T1' : 'T2';
  const occ = group.occupants || [];
  const occupantsList = occ.map(p => {
    const statusEmoji = p.isAlive ? '🟢' : (p.position ? '🟡' : '🔴');
    return `  ${statusEmoji} ${p.name} (asiento ${p.seat ?? '?'})`;
  }).join('\n');
  return `<div style="font-weight:600;color:var(--amber);">🚗 ${group.vehicleName}</div>
<div style="color:var(--text-dim);">[${teamLabel}] · ${occ.length} ocupantes</div>
${occupantsList ? `<pre style="font-size:9px;margin:4px 0 0;color:var(--text);">${occupantsList}</pre>` : '<div style="font-size:9px;color:var(--text-dim);">Sin tripulación</div>'}`;
}

function groupPlayersByVehicle(players) {
  const groups = {};
  const withoutVehicle = [];
  for (const p of players) {
    if (!p.vehicle) {
      withoutVehicle.push(p);
      continue;
    }
    const key = p.vehicle.id ? `veh_${p.vehicle.id}` : `veh_${p.vehicle.name}_${p.teamID}`;
    if (!groups[key]) {
      groups[key] = {
        vehicleId: p.vehicle.id || key,
        vehicleName: p.vehicle.name || 'Vehículo',
        teamID: p.teamID,
        occupants: [],
        position: null,
        icon: vehicleIconMap[p.vehicle.id] || null,
      };
    }
    groups[key].occupants.push(p);
    if (!groups[key].position && p.position) {
      groups[key].position = p.position;
    }
  }
  for (const key of Object.keys(groups)) {
    groups[key].occupants.sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));
  }
  return { vehicleGroups: Object.values(groups), individualPlayers: withoutVehicle };
}

// ─── NUEVA FUNCIÓN: CREAR MARCADORES PARA VEHÍCULOS ESTÁTICOS ──────────────
function createStaticVehicleMarkers(vehicles, corners, seenVehicleIds) {
  if (!vehicles || !corners || !filters.empty) {
    // Eliminar todos los marcadores estáticos si el filtro está desactivado
    for (const id of Object.keys(markers)) {
      if (id.startsWith('static_veh_')) {
        map.removeLayer(markers[id]);
        delete markers[id];
      }
    }
    if (!vehicles || !corners || !filters.empty) return;
  }
  const seenStatic = new Set();
  for (const v of vehicles) {
    if (!v.position) continue;
    // Si ya está ocupado (su id aparece en seenVehicleIds), saltamos
    if (seenVehicleIds.has(v.id)) continue;
    // Aplicar filtros de equipo
    if (!filters.t1 && v.teamID === 1) continue;
    if (!filters.t2 && v.teamID === 2) continue;
    if (!filters.veh) continue;  // mismo filtro que vehículos ocupados

    const key = `static_veh_${v.id}`;
    seenStatic.add(key);
    const ll = gameToLatLng(v.position, corners);
    const group = {
      vehicleId: v.id,
      vehicleName: v.type || 'Vehículo',
      teamID: v.teamID,
      occupants: [],
      position: v.position,
      icon: v.icon || 'public__img__markers__weapons__test.webp',
    };
    const isSelected = false;  // no hay jugador asociado
    const icon = makeVehicleIcon(group, false);
    if (markers[key]) {
      markers[key].setLatLng(ll).setIcon(icon);
    } else {
      const m = L.marker(ll, { icon });
      markers[key] = m;
    }
    const m = markers[key];
    m._vehicleData = group;
    m.unbindTooltip();
    m.bindTooltip(makeVehicleTooltip(group), {
      permanent: false, direction: 'top', offset: [0,-14], className: 'squad-tip',
    });
    m.off('mouseover click');
    m.on('mouseover', () => showVehicleCard(group));
    m.on('click', () => selectStaticVehicle(group));
    if (!map.hasLayer(m)) map.addLayer(m);
  }
  // Limpiar estáticos que ya no existen
  for (const id of Object.keys(markers)) {
    if (id.startsWith('static_veh_') && !seenStatic.has(id)) {
      map.removeLayer(markers[id]);
      delete markers[id];
    }
  }
}

// ─── SELECCIÓN DE VEHÍCULO ESTÁTICO ─────────────────────────────────────────
function selectStaticVehicle(group) {
  // Limpiar selección previa de jugador
  selectedSteamID = null;
  // Actualizar panel de admin
  document.getElementById('adminNoTarget').style.display = 'none';
  document.getElementById('adminTargetInfo').style.display = 'block';
  document.getElementById('adminTargetName').textContent = `🚗 ${group.vehicleName}`;
  document.getElementById('adminTargetSteam').textContent = 'Vehículo sin tripulación';
  document.getElementById('adminTargetTeam').textContent = `Team ${group.teamID}`;
  document.getElementById('adminTargetSquad').textContent = '—';
  document.getElementById('adminTargetRole').textContent = 'Vehículo';
  document.getElementById('playerActionBtns').style.display = 'none';  // sin acciones
  cancelPendingCmd();
  showVehicleCard(group);
  // Refrescar selección en marcadores
  refreshMarkerSelection();
}

function updateMarkers(players, vehicles, corners) {
  // 1. Procesar vehículos ocupados (como antes)
  const { vehicleGroups, individualPlayers } = groupPlayersByVehicle(players);
  const seen = new Set(); // ahora almacenará claves completas

  for (const g of vehicleGroups) {
    if (!g.position) continue;
    if (!filters.veh) continue;
    if (!filters.t1 && g.teamID === 1) continue;
    if (!filters.t2 && g.teamID === 2) continue;
    const ll = gameToLatLng(g.position, corners);
    const key = `veh_${g.vehicleId}`;
    seen.add(key); // guardamos la clave completa

    g.icon = vehicleIconMap[g.vehicleId] || g.icon;
    const isSelected = g.occupants.some(p => p.steamID === selectedSteamID);
    const icon = makeVehicleIcon(g, isSelected);
    if (markers[key]) {
      markers[key].setLatLng(ll).setIcon(icon);
    } else {
      const m = L.marker(ll, { icon });
      markers[key] = m;
    }
    const m = markers[key];
    m._vehicleData = g;
    m.unbindTooltip();
    m.bindTooltip(makeVehicleTooltip(g), {
      permanent: false, direction: 'top', offset: [0,-14], className: 'squad-tip',
    });
    m.off('mouseover click');
    m.on('mouseover', () => showVehicleCard(g));
    m.on('click', () => selectVehicle(g));
    if (!map.hasLayer(m)) map.addLayer(m);
  }

  // 2. Procesar jugadores individuales (fuera de vehículo)
  for (const p of individualPlayers) {
    if (!p.position) continue;
    if (!playerPassesFilter(p)) continue;
    const key = `player_${p.steamID}`;
    seen.add(key); // guardamos la clave completa
    const ll = gameToLatLng(p.position, corners);
    const isSel = p.steamID === selectedSteamID;
    const icon = makeIcon(p, isSel);
    if (markers[key]) {
      markers[key].setLatLng(ll).setIcon(icon);
    } else {
      const m = L.marker(ll, { icon });
      markers[key] = m;
    }
    const m = markers[key];
    m._playerData = p;
    m.unbindTooltip();
    // Tooltip permanente solo para el seleccionado
    m.bindTooltip(makeTooltipContent(p), {
      permanent: isSel,
      direction: 'top',
      offset: [0,-14],
      className: 'squad-tip'
    });
    m.off('mouseover click');
    m.on('mouseover', () => showPlayerCard(p));
    m.on('click', () => selectPlayer(p));
    if (!map.hasLayer(m)) map.addLayer(m);
  }

  // 3. Crear marcadores para vehículos estáticos (no ocupados)
  if (vehicles && corners) {
    const occupiedIds = new Set();
    for (const g of vehicleGroups) {
      if (g.vehicleId) occupiedIds.add(g.vehicleId);
    }
    createStaticVehicleMarkers(vehicles, corners, occupiedIds);
  }

  // 4. Limpiar marcadores obsoletos
  for (const id of Object.keys(markers)) {
    if (!seen.has(id) && !id.startsWith('static_veh_')) {
      map.removeLayer(markers[id]);
      delete markers[id];
    }
  }

  // 5. Follow selected
  if (followSelected && selectedSteamID) {
    let targetMarker = null;
    for (const key of Object.keys(markers)) {
      const m = markers[key];
      if (m._vehicleData && m._vehicleData.occupants && m._vehicleData.occupants.some(p => p.steamID === selectedSteamID)) {
        targetMarker = m;
        break;
      }
      if (m._playerData && m._playerData.steamID === selectedSteamID) {
        targetMarker = m;
        break;
      }
    }
    if (targetMarker && map.hasLayer(targetMarker)) {
      map.panTo(targetMarker.getLatLng(), { animate: true, duration: 0.4 });
    }
  }
}

// ─── TIMER DE PARTIDA ──────────────────────────────────────────────────────
let matchEndEpoch = null;   // timestamp en ms cuando termina la partida
let timerInterval = null;

function setMatchTimer(remainingSeconds) {
  if (remainingSeconds == null || remainingSeconds <= 0) {
    document.getElementById('hudTimer').style.display = 'none';
    matchEndEpoch = null;
    return;
  }
  // Calculamos cuándo termina usando Date.now() + los segundos restantes
  matchEndEpoch = Date.now() + remainingSeconds * 1000;
  document.getElementById('hudTimer').style.display = 'inline-block';
  if (!timerInterval) {
    timerInterval = setInterval(tickTimer, 1000);
  }
}

function tickTimer() {
  if (!matchEndEpoch) return;
  const remaining = Math.max(0, Math.round((matchEndEpoch - Date.now()) / 1000));
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const val = h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  document.getElementById('timerVal').textContent = val;
  if (remaining === 0) {
    clearInterval(timerInterval);
    timerInterval = null;
    document.getElementById('timerVal').textContent = '00:00';
  }
}

// ─── OBJECTIVES ──────────────────────────────────────────────────────────────
const objectiveMarkers = {};

let objectiveLine = null;

function updateObjectives(objectives, corners) {
  ensureObjectivesPane();
  const seen = new Set();

  // Línea punteada solo entre flags (no mains), solo si flags visible
  const flagPoints = objectives.filter(o => o.position && !isMainObjective(o)).map(o => gameToLatLng(o.position, corners));
  if (filters.flags && flagPoints.length >= 2) {
    if (objectiveLine) {
      objectiveLine.setLatLngs(flagPoints);
      if (!map.hasLayer(objectiveLine)) map.addLayer(objectiveLine);
    } else {
      objectiveLine = L.polyline(flagPoints, {
        color: '#ffffff', weight: 1.5, opacity: 0.7, dashArray: '6, 6', pane: 'objectivesPane',
      }).addTo(map);
    }
  } else if (objectiveLine) {
    map.removeLayer(objectiveLine); objectiveLine = null;
  }

  for (const o of objectives) {
    if (!o.position || !o.name) continue;
    const main = isMainObjective(o);
    // Mains siempre visibles; flags respetan el filtro
    if (!main && !filters.flags) continue;
    const key = `${o.name}_t${parseInt(o.owningTeam, 10)}`;  // key única por nombre+equipo
    seen.add(key);
    const ll = gameToLatLng(o.position, corners);
    const icon = makeObjectiveIcon(o.owningTeam, main);
    if (objectiveMarkers[key]) {
      objectiveMarkers[key].setLatLng(ll).setIcon(icon);
      if (!map.hasLayer(objectiveMarkers[key])) map.addLayer(objectiveMarkers[key]);
    } else {
      const m = L.marker(ll, { icon, pane: 'objectivesPane' }).addTo(map);
      m.bindTooltip(esc(o.name), { permanent: true, direction: 'top', offset: [0, -30], className: 'obj-label' });
      objectiveMarkers[key] = m;
    }
  }
  // Limpiar los que ya no están — pero nunca remover mains aunque flags esté off
  for (const key of Object.keys(objectiveMarkers)) {
    if (!seen.has(key)) { map.removeLayer(objectiveMarkers[key]); delete objectiveMarkers[key]; }
  }
}

// ─── FOB / RALLY / AMMO ─────────────────────────────────────────────────────
let fobMarkersLayer = null;

function initRallyLayer() {
  if (!rallyLayer) { rallyLayer = L.featureGroup().addTo(map); } 
  else { rallyLayer.clearLayers(); }
}
function clearRallyMarkers() { if (rallyLayer) rallyLayer.clearLayers(); }

function initAmmoLayer() {
  if (!ammoLayer) { ammoLayer = L.featureGroup().addTo(map); } 
  else { ammoLayer.clearLayers(); }
}
function clearAmmoMarkers() { if (ammoLayer) ammoLayer.clearLayers(); }

function initFobLayer() {
  if (!fobMarkersLayer) {
    map.createPane('fobsPane');
    map.getPane('fobsPane').style.zIndex = 450;
    fobMarkersLayer = L.featureGroup({ pane: 'fobsPane' }).addTo(map);
  } else {
    fobMarkersLayer.clearLayers();
  }
}
function clearFobMarkers() { if (fobMarkersLayer) fobMarkersLayer.clearLayers(); }

function renderRallyMarker(rally, corners) {
  if (!rallyLayer) return;
  const pos = rally.pos || { x: 0, y: 0 };
  let teamID = parseInt(rally.teamID, 10);
  if (isNaN(teamID) || (teamID !== 1 && teamID !== 2)) teamID = 1;
  const squadID = rally.squadID || '?';
  const latLng = gameToLatLng(pos, corners);
  const iconUrl = getDeployableIcon('rally', teamID, true);
  const iconSize = 24;
  const iconHtml = `<img src="${iconUrl}" style="width:${iconSize}px;height:${iconSize}px;filter:drop-shadow(0 0 2px rgba(0,0,0,0.6));" />`;
  const icon = L.divIcon({ html: iconHtml, iconSize: [iconSize, iconSize], iconAnchor: [iconSize/2, iconSize/2], className: 'rally-icon' });
  const marker = L.marker(latLng, { icon }).addTo(rallyLayer);
  marker.bindTooltip(`Squad ${squadID} Rally (T${teamID})`, { className: "squad-tip", direction: "top" });
}

function updateRallies(rallyArray, corners) {
  if (!rallyArray || !Array.isArray(rallyArray) || rallyArray.length === 0) {
    if (rallyLayer) rallyLayer.clearLayers();
    return;
  }
  initRallyLayer();
  rallyArray.forEach(r => { try { renderRallyMarker(r, corners); } catch(e) { console.warn('Rally error:', e); } });
}

function renderAmmoMarker(ammo, corners) {
  if (!ammoLayer) return;
  const pos = ammo.pos || { x: 0, y: 0 };
  //console.log('=== renderAmmoMarker ===');
  //console.log('ammo.teamID original:', ammo.teamID);
  let teamID = parseInt(ammo.teamID, 10);
  //console.log('teamID after parseInt:', teamID);
  if (isNaN(teamID) || (teamID !== 1 && teamID !== 2)) {
    console.warn('teamID inválido, usando 1');
    teamID = 1;
  }
  const state = ammo.state || 'Completed';
  const latLng = gameToLatLng(pos, corners);
  const isBuilt = state === 'Completed';

  const iconUrl = getDeployableIcon('ammo', teamID, true);
  const iconSize = 24;
  const iconHtml = `<img src="${iconUrl}" style="width:${iconSize}px;height:${iconSize}px;filter:drop-shadow(0 0 2px rgba(0,0,0,0.6));${!isBuilt ? 'opacity:0.5;' : ''}" />`;
  const icon = L.divIcon({
    html: iconHtml,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize/2, iconSize/2],
    className: 'ammo-icon'
  });
  const marker = L.marker(latLng, { icon }).addTo(ammoLayer);
  const status = isBuilt ? '✅' : '🚧';
  marker.bindTooltip(`Ammo crate T${teamID} ${status}`, { className: "squad-tip", direction: "top" });
}

function updateAmmo(ammoArray, corners) {
  if (!ammoArray || !Array.isArray(ammoArray) || ammoArray.length === 0) {
    if (ammoLayer) ammoLayer.clearLayers();
    return;
  }
  initAmmoLayer();
  ammoArray.forEach(a => { try { renderAmmoMarker(a, corners); } catch(e) { console.warn('Ammo error:', e); } });
}

function renderFobMarker(fob, corners) {
  if (!fobMarkersLayer) return;
  const pos = fob.pos || { x: 0, y: 0 };
  //console.log('=== renderFobMarker ===');
  //console.log('fob.teamID original:', fob.teamID);
  //console.log('fob.habName:', fob.habName);
  //console.log('fob.isHab:', fob.isHab);
  let teamID = parseInt(fob.teamID, 10);
  //console.log('teamID after parseInt:', teamID);
  if (isNaN(teamID) || (teamID !== 1 && teamID !== 2)) {
    console.warn('teamID inválido, usando 1');
    teamID = 1;
  }

  const habName = fob.habName || (fob.isHab ? `HAB${teamID}` : `FOB${teamID}`);
  const constructRadius = fob.construct_radius || 15000;
  const exclusionRadius = fob.exclusion_radius || 30000;
  const isHab = fob.isHab === true;
  const isActive = fob.isActive !== false;
  const latLng = gameToLatLng(pos, corners);
  if (!latLng) { console.warn('FOB sin posición válida:', fob); return; }

  if (!isHab) {
    const colors = teamID === 1 ? { exclusion: '#2a7ab0', construct: '#4fa6e8' } : { exclusion: '#b33a30', construct: '#e0584f' };
    L.circle(latLng, { radius: metersToMapUnits(exclusionRadius, corners), color: colors.exclusion, weight: 2.5, fillOpacity: 0.03, dashArray: "4,5" }).addTo(fobMarkersLayer);
    L.circle(latLng, { radius: metersToMapUnits(constructRadius, corners), color: colors.construct, weight: 2.5, fillOpacity: 0.05 }).addTo(fobMarkersLayer);
  }

  const iconType = isHab ? 'hab' : 'fob';
  const iconUrl = getDeployableIcon(iconType, teamID, isActive);
  const iconSize = isHab ? 30 : 24;
  const overlayX = isHab && !isActive ? `<div style="position:absolute;top:-6px;right:-6px;font-size:16px;color:#ff0000;font-weight:bold;text-shadow:0 0 3px #000;line-height:1;">✕</div>` : '';
  const iconHtml = `<div style="position:relative;width:${iconSize}px;height:${iconSize}px;">
    <img src="${iconUrl}" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 2px rgba(0,0,0,0.6));" />
    ${overlayX}
  </div>`;
  const icon = L.divIcon({
    html: iconHtml,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize/2, iconSize/2],
    className: "fob-icon"
  });
  const marker = L.marker(latLng, { icon }).addTo(fobMarkersLayer);
  let statusText = '';
  if (isHab) statusText = isActive ? '🟢 Activo' : '🔴 Inactivo';
  marker.bindTooltip(`<strong>${habName}</strong><br/>Team ${teamID}${isHab ? '<br/>' + statusText : ''}`, { className: "squad-tip", direction: "top" });
}

function updateFobs(fobArray, corners) {
  if (!fobArray || !Array.isArray(fobArray) || fobArray.length === 0) {
    clearFobMarkers();
    return;
  }
  initFobLayer();
  fobArray.forEach(fob => { try { renderFobMarker(fob, corners); } catch(e) { console.warn('Error rendering FOB:', fob, e); } });
}

// ─── TABS ──────────────────────────────────────────────────────────────────────
function switchTab(tab) {
  const tabs = ['players', 'search', 'admin'];
  document.querySelectorAll('.side-tab').forEach((el, i) => {
    el.classList.toggle('active', tabs[i] === tab);
  });
  document.getElementById('tabPlayers').classList.toggle('show', tab === 'players');
  document.getElementById('tabSearch').classList.toggle('show', tab === 'search');
  document.getElementById('tabAdmin').classList.toggle('show', tab === 'admin');
  if (tab === 'search') renderSearchDropdown(document.getElementById('searchInput').value);
}

let allPlayersCache = [];

function onSearchInput(val) {
  renderSearchDropdown(val);
}

function renderSearchDropdown(val) {
  const dd = document.getElementById('searchDropdown');
  const q = val.trim().toLowerCase();
  const list = q
    ? allPlayersCache.filter(p => p.name.toLowerCase().includes(q) || String(p.steamID).includes(q))
    : allPlayersCache;
  if (!list.length) { dd.innerHTML = '<div class="search-item"><span class="si-name" style="color:var(--text-dim)">Sin resultados</span></div>'; return; }
  dd.innerHTML = list.slice(0, 50).map(p => {
    const tc = p.teamID === 1 ? 'blue' : 'red';
    const dead = !p.isAlive ? '<span class="si-dead">💀</span>' : '';
    return `<div class="search-item" onclick="searchSelectPlayer(${JSON.stringify(p).replace(/"/g,'&quot;')})">
      <span class="si-tag ${tc}">T${p.teamID} S${p.squadID ?? '?'}</span>
      <span class="si-name">${esc(p.name)}</span>${dead}
    </div>`;
  }).join('');
}

function searchSelectPlayer(p) {
  selectPlayer(p);
  // Zoom al jugador en el mapa
  for (const key of Object.keys(markers)) {
    const m = markers[key];
    const match = (m._playerData && m._playerData.steamID === p.steamID) ||
      (m._vehicleData && m._vehicleData.occupants && m._vehicleData.occupants.some(o => o.steamID === p.steamID));
    if (match) {
      map.setView(m.getLatLng(), Math.max(map.getZoom(), 1), { animate: true });
      break;
    }
  }
  switchTab('admin');
}

// ─── PLAYER CARD ──────────────────────────────────────────────────────────────
function showPlayerCard(p) {
  const teamColor = p.teamID === 1 ? 'blue' : 'red';
  const teamLabel = p.teamID === 1 ? 'T1' : 'T2';
  let status = 'Vivo';
  if (!p.isAlive) status = p.position ? 'Herido (wounded)' : 'Muerto (esperando respawn)';
  let vehicleLine = '';
  if (p.vehicle) {
    const seat = p.seat !== undefined ? ` (asiento ${p.seat})` : '';
    vehicleLine = `<div class="row"><span>Vehículo</span><span class="val">${esc(p.vehicle.name)}${seat}</span></div>`;
  }
  document.getElementById('playerPanel').innerHTML = `
    <div class="player-card">
      <div class="pname"><span class="ptag ${teamColor}">[${teamLabel}]</span> ${esc(p.name)}</div>
      <div class="row"><span>Estado</span><span class="val">${status}</span></div>
      <div class="row"><span>Rol</span><span class="val" style="display:flex;align-items:center;gap:5px;justify-content:flex-end;"><img src="${roleIconPath(p,'white')}" alt="" style="width:16px;height:16px;"/>${esc(p.role ?? '—')}</span></div>
      ${vehicleLine}
      <div class="row"><span>Squad</span><span class="val">${p.squadName ? esc(p.squadName) : (p.squadID ?? '—')}</span></div>
      <div class="row"><span>Steam</span><span class="val" style="font-size:9px">${esc(p.steamID)}</span></div>
    </div>`;
}

// ─── SELECT PLAYER / VEHICLE ─────────────────────────────────────────────────
let pendingCmd = null;

function selectPlayer(p) {
  selectedSteamID = p.steamID;
  followSelected = true;
  const btn = document.getElementById('btnFollowSel');
  if (btn) btn.style.color = 'var(--amber)';
  // Forzar actualización de tooltips para que el seleccionado tenga permanent: true
  if (lastSnapshot) {
    const { players, vehicles, corners } = lastSnapshot;
    updateMarkers(players, vehicles, corners);
  }
  // Actualizar panel lateral
  document.getElementById('adminNoTarget').style.display = 'none';
  document.getElementById('adminTargetInfo').style.display = 'block';
  document.getElementById('adminTargetName').textContent = p.name;
  document.getElementById('adminTargetSteam').textContent = p.steamID;
  document.getElementById('adminTargetTeam').textContent = `Team ${p.teamID}`;
  document.getElementById('adminTargetSquad').textContent = p.squadID ?? '—';
  document.getElementById('adminTargetRole').textContent = p.role ?? '—';
  document.getElementById('playerActionBtns').style.display = 'grid';
  cancelPendingCmd();
  showPlayerCard(p);
}

function selectVehicle(group) {
  const primary = group.occupants.find(p => p.isLeader) || group.occupants[0];
  if (primary) selectPlayer(primary);
  else {
    // Vehículo ocupado pero sin jugadores (raro, pero por si acaso)
    selectStaticVehicle(group);
  }
}

function refreshMarkerSelection() {
  for (const key of Object.keys(markers)) {
    const m = markers[key];
    if (m._vehicleData) {
      const sel = m._vehicleData.occupants && m._vehicleData.occupants.some(p => p.steamID === selectedSteamID);
      m.setIcon(makeVehicleIcon(m._vehicleData, sel));
    } else if (m._playerData) {
      const sel = m._playerData.steamID === selectedSteamID;
      m.setIcon(makeIcon(m._playerData, sel));
    }
  }
}

function centerOnSelected() {
  if (!followSelected) return;
  for (const key of Object.keys(markers)) {
    const m = markers[key];
    if (m._vehicleData && m._vehicleData.occupants && m._vehicleData.occupants.some(p => p.steamID === selectedSteamID)) {
      map.panTo(m.getLatLng(), { animate: true, duration: 0.4 });
      return;
    }
    if (m._playerData && m._playerData.steamID === selectedSteamID) {
      map.panTo(m.getLatLng(), { animate: true, duration: 0.4 });
      return;
    }
  }
}

function updateAdminTarget(p) {
  document.getElementById('adminNoTarget').style.display = 'none';
  document.getElementById('adminTargetInfo').style.display = 'block';
  document.getElementById('adminTargetName').textContent = p.name;
  document.getElementById('adminTargetSteam').textContent = p.steamID;
  const teamLabel = p.teamID === 1 ? 'T1' : 'T2';
  const squadDisplay = p.squadName || (p.squadID != null ? `Squad ${p.squadID}` : '—');
  const status = p.isAlive ? 'Vivo' : (p.position ? 'Herido' : 'Muerto');
  document.getElementById('adminTargetTeam').textContent = `Team ${p.teamID} (${teamLabel})`;
  document.getElementById('adminTargetSquad').textContent = squadDisplay;
  document.getElementById('adminTargetRole').textContent = `${p.role ?? '—'} · ${status}`;
  document.getElementById('playerActionBtns').style.display = 'grid';
  cancelPendingCmd();
}

// ─── ADMIN COMMANDS ──────────────────────────────────────────────────────────
const CMD_LABELS = { warn: 'Advertencia', kick: 'Kick', ban: 'Ban (1d)', switchTeam: 'Cambiar equipo' };

function adminCmd(action) {
  if (!selectedSteamID) return toast('Selecciona un jugador primero', 'err');
  pendingCmd = action;
  if (['warn','kick','ban'].includes(action)) {
    document.getElementById('adminReasonWrap').style.display = 'block';
    document.getElementById('adminReason').focus();
  } else {
    sendPendingCmd();
  }
}

async function sendPendingCmd() {
  if (!pendingCmd || !selectedSteamID) return;
  const playerData = markers[`player_${selectedSteamID}`]?._playerData;
  const reason = document.getElementById('adminReason').value.trim() || 'Admin action';
  const payload = {
    action: pendingCmd,
    steamID: selectedSteamID,
    eosID: playerData?.eosID ?? null,
    playerID: playerData?.playerID ?? null,
    playerName: playerData?.name ?? selectedSteamID,
    reason,
    duration: pendingCmd === 'ban' ? 1440 : undefined,
  };
  cancelPendingCmd();
  await postCommand(payload);
}

function cancelPendingCmd() {
  pendingCmd = null;
  document.getElementById('adminReasonWrap').style.display = 'none';
  document.getElementById('adminReason').value = '';
}

async function sendBroadcast() {
  const msg = document.getElementById('broadcastMsg').value.trim();
  if (!msg) return toast('Escribe un mensaje primero', 'err');
  await postCommand({ action: 'broadcast', message: msg });
  document.getElementById('broadcastMsg').value = '';
}

async function sendSetNextMap() {
  const mapStr = document.getElementById('nextMapInput').value.trim();
  if (!mapStr) return toast('Escribe el nombre del mapa', 'err');
  await postCommand({ action: 'setNextMap', map: mapStr });
  document.getElementById('nextMapInput').value = '';
}

async function sendEndMatch() {
  if (!confirm('¿Terminar el match actual?')) return;
  await postCommand({ action: 'endMatch' });
}

async function sendGlobal(action) {
  await postCommand({ action });
}

async function postCommand(payload) {
  const label = payload.action;
  addLog(`[→] ${label}${payload.playerName ? ' · '+payload.playerName : ''}`, 'pending');
  try {
    const res = await fetch(`${WORKER_URL}/api/admin/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    addLog(`[✓] ${label} enviado (id:${data.id?.slice(-6) ?? '?'})`, 'ok');
    toast(`Comando enviado: ${CMD_LABELS[label] ?? label}`, 'ok');
  } catch(e) {
    addLog(`[✗] ${label} falló: ${e.message}`, 'err');
    toast(`Error: ${e.message}`, 'err');
  }
}

// ─── LOG ──────────────────────────────────────────────────────────────────────
const logEntries = [];
function addLog(text, type='ok') {
  logEntries.unshift({ text, type, ts: new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) });
  if (logEntries.length > 30) logEntries.pop();
  const el = document.getElementById('cmdLog');
  el.innerHTML = logEntries.map(e =>
    `<div class="log-entry log-${e.type}">${e.ts} ${esc(e.text)}</div>`
  ).join('');
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
let toastTimer = null;
function toast(msg, type='ok') {
  const el = document.getElementById('adminToast');
  el.textContent = msg;
  el.style.borderColor = type === 'err' ? 'var(--red)' : type === 'pending' ? 'var(--warn)' : 'var(--olive)';
  el.style.color       = type === 'err' ? 'var(--red)' : type === 'pending' ? 'var(--warn)' : 'var(--green)';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

function toggleSquadExpand(key) {
  expandedSquads[key] = !expandedSquads[key];
  if (lastSnapshot && lastSnapshot.players) updatePlayerList(lastSnapshot.players);
}

function centerMapOnPlayer(p) {
  if (!p || !p.position || !Array.isArray(p.position) || p.position.length < 2) return;
  map.invalidateSize();
  setTimeout(() => {
    const latlng = L.latLng(p.position[1], p.position[0]);
    map.flyTo(latlng, 4, { duration: 0.8 });
  }, 50);
}

function centerMapOnSquad(teamID, squadID) {
  if (!lastSnapshot || !lastSnapshot.players) return;
  const squadPlayers = lastSnapshot.players.filter(p =>
    p.teamID === teamID && p.squadID === squadID && p.position
  );
  if (squadPlayers.length === 0) return;
  const avgPos = [
    squadPlayers.reduce((s, p) => s + p.position[0], 0) / squadPlayers.length,
    squadPlayers.reduce((s, p) => s + p.position[1], 0) / squadPlayers.length
  ];
  map.invalidateSize();
  setTimeout(() => {
    const latlng = L.latLng(avgPos[1], avgPos[0]);
    map.flyTo(latlng, 3.5, { duration: 0.8 });
  }, 50);
}

// ─── PLAYER LIST ─────────────────────────────────────────────────────────────
function updatePlayerList(players) {
  // Actualizar caché para búsqueda (todos, sin filtros)
  allPlayersCache = [...players].sort((a,b) => {
    if (a.teamID !== b.teamID) return a.teamID - b.teamID;
    return a.name.localeCompare(b.name);
  });
  if (document.getElementById('tabSearch').classList.contains('show')) {
    renderSearchDropdown(document.getElementById('searchInput').value);
  }
  const list = document.getElementById('playerList');
  let visible = players.filter(p => {
    if (!filters.t1 && p.teamID === 1) return false;
    if (!filters.t2 && p.teamID === 2) return false;
    if (!filters.veh && p.vehicle) return false;
    if (!filters.spectators && p.isSpectating) return false;
    return true;
  });
  const sorted = [...visible].sort((a,b) => {
    if (a.teamID !== b.teamID) return a.teamID - b.teamID;
    const aSquad = a.squadID ?? 999;
    const bSquad = b.squadID ?? 999;
    if (aSquad !== bSquad) return aSquad - bSquad;
    if (a.isLeader !== b.isLeader) return a.isLeader ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  let html = '';
  let currentTeam = null;
  let currentSquad = null;
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const teamChanged = p.teamID !== currentTeam;
    const squadChanged = p.squadID !== currentSquad || teamChanged;
    if (teamChanged) {
      currentTeam = p.teamID;
      const teamColor = p.teamID === 1 ? 'blue' : 'red';
      html += `<div class="panel-title" style="margin-top:10px;color:var(--${teamColor});">Team ${p.teamID}</div>`;
      currentSquad = null;
    }
    if (squadChanged) {
      currentSquad = p.squadID;
      const squadName = p.squadName || `Squad ${p.squadID}`;
      if (p.squadID != null) {
        const squadKey = `${currentTeam}_${p.squadID}`;
        const isExpanded = expandedSquads[squadKey] === true;
        const chevron = isExpanded ? '▼' : '▶';
        const squadCount = sorted.filter(x => x.teamID === currentTeam && x.squadID === p.squadID).length;
        html += `<div class="squad-header" onclick="event.stopPropagation(); toggleSquadExpand('${squadKey}')" style="cursor:pointer;"><span class="squad-chevron">${chevron}</span><span class="squad-name">${esc(squadName)}</span><span class="squad-count">${squadCount}</span><span class="squad-center-btn" onclick="event.stopPropagation(); centerMapOnSquad(${currentTeam}, ${p.squadID})" title="Centrar squad en mapa">🎯</span></div>`;
        if (!isExpanded) {
          html += `<div class="squad-collapsed"></div>`;
          // Saltar todos los jugadores de esta escuadra colapsada
          while (i + 1 < sorted.length && sorted[i + 1].teamID === currentTeam && sorted[i + 1].squadID === currentSquad) {
            i++;
          }
          continue;
        }
      } else {
        html += `<div style="font-family:'Oswald',sans-serif;font-size:12px;color:var(--text-dim);margin:6px 0 4px;">Sin escuadra</div>`;
      }
    }
    const c = p.teamID === 1 ? 'blue' : 'red';
    const sel = p.steamID === selectedSteamID ? 'border-color:var(--amber);' : '';
    let statusEmoji = '🟢';
    let statusText = 'Vivo';
    if (!p.isAlive) {
      if (p.position) { statusEmoji = '🟡'; statusText = 'Herido'; } 
      else { statusEmoji = '🔴'; statusText = 'Muerto'; }
    }
    const role = roleIconName(p).replace(/_/g,' ');
    const roleIcon = roleIconPath(p, 'white');
    const veh = p.vehicle ? ` <span style="color:var(--amber);font-size:9px;">🚗 ${esc(p.vehicle.name)}</span>` : '';
    const sl = p.isLeader ? ' <span style="color:var(--amber)">★</span>' : '';
    const deadOpacity = (!p.isAlive && !p.position) ? 'opacity:.4;' : '';
    html += `<div class="player-card" style="cursor:pointer;margin-left:8px;${sel}${deadOpacity}" onclick="selectPlayer(${JSON.stringify(p).replace(/"/g,'&quot;')})">
      <div style="display:flex;align-items:center;gap:6px;">
        <img src="${roleIcon}" alt="" style="width:16px;height:16px;flex-shrink:0;"/>
        <div><span class="ptag ${c}">[S${p.squadID ?? '?'}]</span>${sl} ${esc(p.name)} ${statusEmoji}${veh}</div>
      </div>
      <div style="font-size:9px;color:var(--text-dim);margin-top:2px">${role} · ${statusText}</div>
    </div>`;
  }
  if (!html) html = '<div class="no-data">No hay jugadores para mostrar</div>';
  list.innerHTML = html;
  document.getElementById('playerCount').textContent = visible.length;
  document.getElementById('totalCount').textContent = players.length;
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function updateHUD(data) {
  const dot = document.getElementById('liveDot');
  const isLive = data.live && data.players !== undefined;
  dot.className = 'live-dot' + (isLive ? '' : ' offline');
  const rawLayer = data.layer && data.layer !== 'Unknown' ? data.layer : null;
  const layerDisplay = rawLayer
    ? (rawLayer.includes('/') ? rawLayer.split('/').filter(Boolean).pop().replace(/_/g, ' ') : rawLayer)
    : null;
  document.getElementById('hudMap').textContent = layerDisplay || data.map || '—';

  const t1 = data.tickets?.team1, t2 = data.tickets?.team2;
  const ticketsEl = document.getElementById('hudTickets');
  if (t1 != null && t2 != null) {
    ticketsEl.style.display = 'flex';

    // Normalizar faction: puede ser objeto, string nombre completo, o ruta /Game/Settings/FactionSetups/TLF/...
    const parseFaction = (raw) => {
      if (!raw) return null;
      const s = typeof raw === 'object' ? (raw.faction ?? raw.name ?? null) : raw;
      if (!s) return null;
      // Si es una ruta de path, extraer el código buscando segmentos que matcheen FACTION_CODE values
      if (s.includes('/')) {
        const segs = s.split('/').filter(Boolean);
        for (const seg of segs) {
          if (Object.values(FACTION_CODE).includes(seg)) return seg;
        }
        // fallback: tercer segmento después de FactionSetups suele ser el código
        const idx = segs.indexOf('FactionSetups');
        if (idx !== -1 && segs[idx + 1]) return segs[idx + 1];
      }
      return FACTION_CODE[s] ?? s;
    };
    const f1 = parseFaction(data.factions?.team1);
    const f2 = parseFaction(data.factions?.team2);
    document.getElementById('t1faction').textContent = f1 || '—';
    document.getElementById('t2faction').textContent = f2 || '—';

    const BASE = 'https://raw.githubusercontent.com/latamcompanysquad/squadpanel/main/resources';
    const flag1 = document.getElementById('t1flag');
    const flag2 = document.getElementById('t2flag');
    if (f1) { flag1.src = `${BASE}/public__img__flags__${f1}.webp`; flag1.style.display = 'inline-block'; }
    else { flag1.style.display = 'none'; }
    if (f2) { flag2.src = `${BASE}/public__img__flags__${f2}.webp`; flag2.style.display = 'inline-block'; }
    else { flag2.style.display = 'none'; }

    const total = t1 + t2 || 1;   // ← estaba faltando esto
    document.getElementById('t1num').textContent = t1;
    document.getElementById('t2num').textContent = t2;
    document.getElementById('t1bar').style.width = (t1 / total * 100) + '%';
    document.getElementById('t2bar').style.width = (t2 / total * 100) + '%';
  } else {
    ticketsEl.style.display = 'none';
  }

  const ago = data.ts ? Math.round((Date.now() - data.ts) / 1000) : null;
  document.getElementById('statusText').textContent = ago !== null ? `hace ${ago}s` : 'Sin datos';
  setMatchTimer(data.matchRemainingTime ?? null);
}
// ─── POLL ─────────────────────────────────────────────────────────────────────
async function poll() {
  try {
    const res = await fetch(`${WORKER_URL}/api/match`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    updateHUD(data);

    // ── Calcular corners ──
    let corners = null;
    if (data.cornerZero && data.cornerOne) {
      const xs = [data.cornerZero.x, data.cornerOne.x];
      const ys = [data.cornerZero.y, data.cornerOne.y];
      corners = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
    } else {
      const mapKey = normalizeMapName(data.layer && data.layer !== 'Unknown' ? data.layer : data.map);
      if (mapKey && MAP_CORNERS[mapKey]) {
        const { c0, c1 } = MAP_CORNERS[mapKey];
        corners = { minX: Math.min(c0[0], c1[0]), maxX: Math.max(c0[0], c1[0]), minY: Math.min(c0[1], c1[1]), maxY: Math.max(c0[1], c1[1]) };
      }
    }

    // ── Cargar mapa base ──
    const mapKey = normalizeMapName(data.layer && data.layer !== 'Unknown' ? data.layer : data.map);
    if (mapKey) {
      const mapChanged = currentMapKey && mapKey !== currentMapKey;
      if (mapChanged) {
        // Limpiar todos los marcadores al cambiar de mapa
        for (const id of Object.keys(markers)) { map.removeLayer(markers[id]); delete markers[id]; }
        for (const id of Object.keys(objectiveMarkers)) { map.removeLayer(objectiveMarkers[id]); delete objectiveMarkers[id]; }
        if (objectiveLine) { map.removeLayer(objectiveLine); objectiveLine = null; }
        clearFobMarkers();
        clearRallyMarkers();
        clearAmmoMarkers();
        lastSnapshot = null;
      }
      loadBasemap(mapKey, !currentMapKey || mapKey !== currentMapKey || !imageLoaded);
    }

    // ── Llenar vehicleIconMap de forma segura ──
    vehicleIconMap = {};
    if (data.vehicles && Array.isArray(data.vehicles)) {
      data.vehicles.forEach(v => {
        vehicleIconMap[v.id] = v.icon || 'public__img__markers__weapons__test.webp';
      });
    }

    // ── Actualizar marcadores de jugadores, vehículos ocupados y estáticos ──
    if (corners && data.players && data.players.length > 0) {
      lastSnapshot = { players: data.players, vehicles: data.vehicles, corners, objectives: data.objectives };
      updateMarkers(data.players, data.vehicles, corners);
    } else if (!data.players || data.players.length === 0) {
      lastSnapshot = null;
      // Eliminar todos los marcadores
      for (const id of Object.keys(markers)) {
        map.removeLayer(markers[id]);
        delete markers[id];
      }
    }

    // ── Actualizar objetivos ──
    if (corners && data.objectives && data.objectives.length > 0) {
      updateObjectives(data.objectives, corners);
    } else {
      for (const name of Object.keys(objectiveMarkers)) {
        map.removeLayer(objectiveMarkers[name]);
        delete objectiveMarkers[name];
      }
    }

    // ── FOBs ──
    if (corners && data.fobs && data.fobs.length > 0) {
      updateFobs(data.fobs, corners);
    } else {
      clearFobMarkers();
    }

    // ── Rally Points ──
    if (corners && data.rallyPoints && data.rallyPoints.length > 0) {
      updateRallies(data.rallyPoints, corners);
    } else {
      clearRallyMarkers();
    }

    // ── Ammo Crates ──
    if (corners && data.ammocrates && data.ammocrates.length > 0) {
      updateAmmo(data.ammocrates, corners);
    } else {
      clearAmmoMarkers();
    }

    // ── Lista de jugadores en el panel ──
    updatePlayerList(data.players ?? []);

  } catch (e) {
    console.error('Error en poll:', e);
    document.getElementById('statusText').textContent = 'Error de conexión';
    document.getElementById('liveDot').className = 'live-dot offline';
  }
}

// ─── INICIALIZACIÓN ──────────────────────────────────────────────────────────
(async function init() {
  await loadVehicleMapping();
  poll();
  setInterval(poll, POLL_MS);

  // Zoom centrado en seleccionado
  map.on('zoom', function() {
    if (!selectedSteamID) return;
    for (const key of Object.keys(markers)) {
      const m = markers[key];
      const match = (m._playerData && m._playerData.steamID === selectedSteamID) ||
        (m._vehicleData && m._vehicleData.occupants && m._vehicleData.occupants.some(p => p.steamID === selectedSteamID));
      if (match) { map.panTo(m.getLatLng(), { animate: false }); return; }
    }
  });

  // Click en mapa para deseleccionar
  map.on('click', function() {
    if (selectedSteamID !== null) {
      selectedSteamID = null;
      if (lastSnapshot) {
        const { players, vehicles, corners } = lastSnapshot;
        updateMarkers(players, vehicles, corners);
      }
      document.getElementById('adminNoTarget').style.display = 'block';
      document.getElementById('adminTargetInfo').style.display = 'none';
      document.getElementById('playerActionBtns').style.display = 'none';
      document.getElementById('playerPanel').innerHTML = '<div class="no-data">Hover sobre un marcador</div>';
      cancelPendingCmd();
    }
  });
})();