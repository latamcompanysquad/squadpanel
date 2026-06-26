/**
 * Vehicle Icon Resolver for SquadPanel
 * 
 * Mapeo inteligente de vehículos a iconos basado en:
 * - Iconos nombrados específicos (BM-21Grad, MTLB_FAB500, etc.)
 * - Fallback por tipo de vehículo (TRAN, MRAP, IFV, MBT, etc.)
 * - Alternativas en SVG para mejor escalado
 * 
 * @module vehicle-icon-resolver
 */

// ─────────────────────────────────────────────────────────────────────────
// MAPEO DE VEHÍCULOS CON ICONOS ESPECÍFICOS (22 vehículos/armas)
// ─────────────────────────────────────────────────────────────────────────

export const VEHICLES_WITH_NAMED_ICONS = {
  'BM-21Grad': 'public__img__markers__weapons__BM-21Grad.webp',
  'BTR4-AGS': 'public__img__markers__weapons__BTR4-AGS.webp',
  'HIMARS': 'public__img__markers__weapons__HIMARS.webp',
  'HellCannon': 'public__img__markers__weapons__HellCannon.webp',
  'M1064M121': 'public__img__markers__weapons__M1064M121.webp',
  'M109': 'public__img__markers__weapons__M109.webp',
  'M777': 'public__img__markers__weapons__M777.webp',
  'MO120RTF1': 'public__img__markers__weapons__MO120RTF1.webp',
  'MTLB_FAB500': 'public__img__markers__weapons__MTLB_FAB500.webp',
  'Mk19': 'public__img__markers__weapons__Mk19.webp',
  'Mortar': 'public__img__markers__weapons__Mortar.webp',
  'PZL07': 'public__img__markers__weapons__PZL07.webp',
  'T62.DUMP.TRUCK': 'public__img__markers__weapons__T62.DUMP.TRUCK.webp',
  'TOS-1A': 'public__img__markers__weapons__TOS-1A.webp',
  'Tech.Mortar': 'public__img__markers__weapons__Tech.Mortar.webp',
  'Tech.UB-32': 'public__img__markers__weapons__Tech.UB-32.webp',
  'UB-32': 'public__img__markers__weapons__UB-32.webp',
  'Ural-HellCannon': 'public__img__markers__weapons__Ural-HellCannon.webp',
  'type_63': 'public__img__markers__weapons__type_63.webp',
  'Ural-375D BM-21 Grad': 'public__img__markers__weapons__BM-21Grad.webp',
  'Ural-375D ZU-23-2': 'public__img__markers__weapons__UB-32.webp',
  'MT-LB FAB500 Begemot': 'public__img__markers__weapons__MTLB_FAB500.webp',
};

// ─────────────────────────────────────────────────────────────────────────
// MAPEO POR TIPO DE VEHÍCULO (fallback cuando no hay icono específico)
// ─────────────────────────────────────────────────────────────────────────

export const VEHICLE_TYPE_ICONS = {
  'TRAN': 'public__img__vehicleSpawners__TRAN.webp',
  'MRAP': 'public__img__vehicleSpawners__MRAP.webp',
  'LOGI': 'public__img__vehicleSpawners__LOGI.webp',
  'LTV': 'public__img__vehicleSpawners__MRAP.webp',
  'ULTV': 'public__img__icons__default__vehicles__map_jeep.svg',
  'APC': 'public__img__vehicleSpawners__APC.webp',
  'IFV': 'public__img__vehicleSpawners__IFV.webp',
  'MBT': 'public__img__vehicleSpawners__MBT.webp',
  'TD': 'public__img__vehicleSpawners__MBT.webp',
  'MSV': 'public__img__vehicleSpawners__APC.webp',
  'SPA': 'public__img__markers__weapons__Mortar.webp',
  'SPAA': 'public__img__icons__default__vehicles__map_truck_antiair.svg',
  'AH': 'public__img__icons__default__vehicles__map_attackhelo.svg',
  'UH': 'public__img__icons__default__vehicles__map_transporthelo.svg',
};

// ─────────────────────────────────────────────────────────────────────────
// MAPEO DETALLADO: VEHÍCULO → TIPO (para resolver fallback)
// ─────────────────────────────────────────────────────────────────────────

export const VEHICLE_NAME_TO_TYPE = {
  // TRAN
  'M939 Transport': 'TRAN',
  'KamAZ 5350 Transport': 'TRAN',

  // MRAP
  'CPV Transport': 'MRAP',
  'CPV M134 Minigun': 'MRAP',
  'M1117': 'MRAP',
  'Tigr-M Kord': 'MRAP',

  // LOGI
  'M939 Logistics': 'LOGI',
  'Technical Logistics': 'LOGI',
  'KamAZ 5350 Logistics': 'LOGI',

  // LTV
  'M1151 M240': 'LTV',
  'M1151 M2': 'LTV',
  'Technical M2': 'LTV',
  'BRDM-2': 'LTV',

  // ULTV
  'Quad Bike': 'ULTV',
  'RHIB M134': 'ULTV',
  'RHIB Mk19': 'ULTV',
  'RHIB M2': 'ULTV',

  // APC
  'BTR-80A': 'APC',
  'BTR-82A': 'APC',
  'BTR-MDM': 'APC',

  // IFV
  'M2A3 Bradley': 'IFV',
  'BMP-1': 'IFV',
  'BMP-2': 'IFV',
  'BMP-3': 'IFV',
  'BMD-4M': 'IFV',

  // MBT
  'M1A1 Abrams': 'MBT',
  'M1A2 Abrams': 'MBT',
  'T-72B3': 'MBT',
  'T-80BVM': 'MBT',
  'T-90A': 'MBT',
  'M1150 Assault': 'MBT',

  // TD
  'M1151 TOW': 'TD',

  // MSV
  'M113A3 MSV': 'MSV',

  // SPA
  'Ural-375D BM-21 Grad': 'SPA',
  'MT-LB FAB500 Begemot': 'SPA',
  '2S1 Gvozdika': 'SPA',
  '2S3 Akatsiya': 'SPA',

  // SPAA
  'Ural-375D ZU-23-2': 'SPAA',
  'M1097 Avenger': 'SPAA',

  // AH
  'Loach CAS': 'AH',
  'Loach CAS Small': 'AH',
  'VDV Little Knyaz CAS': 'AH',
  'Ka-52 Alligator': 'AH',
  'AH-64D Longbow': 'AH',
  'Apache': 'AH',

  // UH
  'Raven Transport': 'UH',
  'Black Hawk Transport': 'UH',
  'Mi-8MT': 'UH',
  'Huey Transport': 'UH',
};

// ─────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: RESOLVER ICONO DE VEHÍCULO
// ─────────────────────────────────────────────────────────────────────────

/**
 * Resuelve el icono apropiado para un vehículo.
 * 
 * Estrategia:
 * 1. Si tiene icono específico nombrado → usarlo
 * 2. Si se proporciona vehicleType → usar fallback por tipo
 * 3. Si NO se proporciona tipo, intentar deducirlo del nombre
 * 4. Si todo falla → retornar icono por defecto "test.webp"
 * 
 * @param {string} vehicleName - Nombre exacto del vehículo (ej: "M939 Transport")
 * @param {string} [vehicleType] - Tipo de vehículo (ej: "TRAN", "MBT", "AH")
 * @param {string} [defaultIcon] - Icono de fallback si nada coincide
 * @returns {string} Ruta del icono (webp o svg)
 * 
 * @example
 * getVehicleIcon("M939 Transport")
 * // → "public__img__vehicleSpawners__TRAN.webp"
 * 
 * @example
 * getVehicleIcon("BM-21Grad")
 * // → "public__img__markers__weapons__BM-21Grad.webp"
 * 
 * @example
 * getVehicleIcon("Unknown Vehicle", "MBT")
 * // → "public__img__vehicleSpawners__MBT.webp"
 */
export function getVehicleIcon(vehicleName, vehicleType = null, defaultIcon = 'public__img__markers__weapons__test.webp') {
  if (!vehicleName) {
    return defaultIcon;
  }

  // PASO 1: Buscar icono específico nombrado
  if (VEHICLES_WITH_NAMED_ICONS[vehicleName]) {
    return VEHICLES_WITH_NAMED_ICONS[vehicleName];
  }

  // PASO 2: Usar vehicleType proporcionado
  if (vehicleType && VEHICLE_TYPE_ICONS[vehicleType]) {
    return VEHICLE_TYPE_ICONS[vehicleType];
  }

  // PASO 3: Intentar deducir tipo del nombre del vehículo
  const deducedType = VEHICLE_NAME_TO_TYPE[vehicleName];
  if (deducedType && VEHICLE_TYPE_ICONS[deducedType]) {
    return VEHICLE_TYPE_ICONS[deducedType];
  }

  // PASO 4: Heurística: buscar substring que coincida con tipos conocidos
  const nameLower = vehicleName.toLowerCase();
  for (const [type, icon] of Object.entries(VEHICLE_TYPE_ICONS)) {
    // Buscar coincidencias parciales sensatas
    if (
      (type === 'TRAN' && (nameLower.includes('transport') || nameLower.includes('truck'))) ||
      (type === 'MRAP' && (nameLower.includes('cpv') || nameLower.includes('tigr') || nameLower.includes('mwmik'))) ||
      (type === 'LOGI' && (nameLower.includes('logi') || nameLower.includes('kamaz'))) ||
      (type === 'MBT' && (nameLower.includes('abrams') || nameLower.includes('t-') || nameLower.includes('tank'))) ||
      (type === 'IFV' && (nameLower.includes('bradley') || nameLower.includes('bmp') || nameLower.includes('bmd'))) ||
      (type === 'APC' && (nameLower.includes('btr'))) ||
      (type === 'AH' && (nameLower.includes('apache') || nameLower.includes('loach') || nameLower.includes('ka-52') || nameLower.includes('knyaz'))) ||
      (type === 'UH' && (nameLower.includes('raven') || nameLower.includes('huey') || nameLower.includes('mi-8') || nameLower.includes('blackhawk')))
    ) {
      return icon;
    }
  }

  // PASO 5: Fallback final
  return defaultIcon;
}

// ─────────────────────────────────────────────────────────────────────────
// FUNCIÓN AUXILIAR: OBTENER ICONO CON ALTERNATIVAS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Retorna un objeto con el icono principal y alternativas (para UI con fallback)
 * 
 * @param {string} vehicleName 
 * @param {string} vehicleType 
 * @returns {object} { primary, alternatives }
 */
export function getVehicleIconWithAlternatives(vehicleName, vehicleType = null) {
  const primary = getVehicleIcon(vehicleName, vehicleType);
  
  // Alternativas según el tipo
  const alternatives = {
    'TRAN': [
      'public__img__icons__default__vehicles__map_truck_transport.svg',
      'public__img__icons__green__vehicles__map_truck_transport.svg'
    ],
    'MRAP': [
      'public__img__icons__default__vehicles__map_jeep.svg',
      'public__img__icons__green__vehicles__map_jeep.svg'
    ],
    'LOGI': [
      'public__img__icons__default__vehicles__map_truck_logistics.svg'
    ],
    'LTV': [
      'public__img__icons__default__vehicles__map_jeep_antitank.svg',
      'public__img__icons__default__vehicles__map_jeep.svg'
    ],
    'ULTV': [
      'public__img__icons__default__vehicles__map_jeep.svg'
    ],
    'APC': [
      'public__img__icons__default__vehicles__map_trackedapc.svg'
    ],
    'IFV': [
      'public__img__icons__default__vehicles__map_trackedifv.svg',
      'public__img__icons__default__vehicles__map_trackedheavyifv.svg'
    ],
    'MBT': [
      'public__img__icons__default__vehicles__map_tank.svg'
    ],
    'AH': [
      'public__img__icons__default__vehicles__map_attackhelo.svg'
    ],
    'UH': [
      'public__img__icons__default__vehicles__map_transporthelo.svg'
    ],
  };

  const type = vehicleType || VEHICLE_NAME_TO_TYPE[vehicleName];
  return {
    primary,
    alternatives: alternatives[type] || [],
    type: type || 'UNKNOWN'
  };
}

// ─────────────────────────────────────────────────────────────────────────
// VALIDACIÓN: Verificar si un vehículo tiene icono específico
// ─────────────────────────────────────────────────────────────────────────

export function hasNamedIcon(vehicleName) {
  return vehicleName in VEHICLES_WITH_NAMED_ICONS;
}

// ─────────────────────────────────────────────────────────────────────────
// ESTADÍSTICAS
// ─────────────────────────────────────────────────────────────────────────

export function getIconMappingStats() {
  return {
    namedIcons: Object.keys(VEHICLES_WITH_NAMED_ICONS).length,
    typeIcons: Object.keys(VEHICLE_TYPE_ICONS).length,
    vehicleNames: Object.keys(VEHICLE_NAME_TO_TYPE).length,
  };
}

