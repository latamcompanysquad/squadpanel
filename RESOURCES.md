# SquadPanel Resources Audit

## Summary
- **Total resource files:** 446
- **Categorized by:** Asset type, faction, functional purpose
- **Formats:** WebP, PNG, SVG (optimized for web)

---

## Resource Categories

### 1. **ROLE ICONS** (63 files)
Squad infantry roles with color variants

#### Blue Team (21 files)
`T_role_{role_name}_blue.png`
- automaticrifleman, automaticrifleman_optic
- crewman, crewman_squadleader
- designatedmarksman, engineer, grenadier
- heavyantitank, lightantitank, machinegunner
- medic, pilot, pilot_squadleader
- raider, recruit, rifleman, rifleman_scoped
- sapper, scout, sniper, squadleader

#### Red Team (21 files)
`T_role_{role_name}_red.png` (same roles as blue)

#### White/Default (21 files)
`T_role_{role_name}.webp` (duplicates in root + Squad_White folder)

---

### 2. **FACTION FLAGS** (54 files)

#### Main Flags (24 factions)
`public__img__flags__{FACTION_CODE}.webp`

**Factions:**
- ADF, AFU, BAF, CAF, CRF, GFI
- IMF, INS, MEA, MEI, PLA, PLAAGF
- PLANMC, RGF, TLF, USA, USMC, VDV, WPMC
- (+ circles variant: same list)

#### Circle Variants (24 factions)
`public__img__flags__circles__{FACTION_CODE}.webp`

#### Meta Flags
- `public__img__flags__main.webp`
- `public__img__flags__circles__main.webp`
- `public__img__flags__unknown.webp`

---

### 3. **VEHICLE ICONS - Type Generic** (6 files)
Vehicle spawner generic icons by type:
- `public__img__vehicleSpawners__APC.webp`
- `public__img__vehicleSpawners__IFV.webp`
- `public__img__vehicleSpawners__LOGI.webp`
- `public__img__vehicleSpawners__MBT.webp`
- `public__img__vehicleSpawners__MRAP.webp`
- `public__img__vehicleSpawners__TRAN.webp`

---

### 4. **VEHICLE & WEAPON ICONS - Named** (2 x ~30 files)

#### Markers (Map Indicators)
`public__img__markers__weapons__{VEHICLE_NAME}.webp`

**Vehicles/Weapons with icons:**
- BM-21Grad, BTR4-AGS, HIMARS, HellCannon
- M1064M121, M109, M777, MO120RTF1
- MTLB_FAB500, Mk19, Mortar, PZL07
- T62.DUMP.TRUCK, TOS-1A, Tech.Mortar, Tech.UB-32
- UB-32, Ural-HellCannon, type_63
- **Special:** marker_mortar_1, marker_mortar_2, marker_shadow
- **Placeholder:** test.webp (THIS IS THE "TEST" ICON YOU MENTIONED)

#### Weapon/Vehicle Quick Icons
`public__img__weapons__{VEHICLE_NAME}.webp` (same list + default.png)

---

### 5. **MAP ICONS - Default Vehicles** (24 SVG files)
Color: default (gray/white outline)
`public__img__icons__default__vehicles__map_{vehicle_type}.svg`

**Vehicle types:**
- wheeledrecon, strategic_uav (2 variants)
- apc, ifv, tank, trackedapc, trackedheavyifv, trackedifv
- jeep, jeep_antitank, jeep_artillery, jeep_logistics
- motorcycle, transporthelo, attackhelo
- truck_transport, truck_transport_armed, truck_logistics, truck_antiair
- jet_a10, handhelddrone

---

### 6. **MAP ICONS - Colored (3 color variants)**
Same vehicle types in 3 color schemes:

#### Green Icons
`public__img__icons__green__vehicles__map_{vehicle_type}.svg` (24 files)
+ Additional: boat_logistics, boat_openturret, helicopter_lightcas, 3x tracked_apc variants, motorcycle

#### Orange/Tan Icons
`public__img__icons__orange__vehicles__map_{vehicle_type}.svg` (same set)

#### Red Icons
`public__img__icons__red__vehicles__map_{vehicle_type}.svg` (24 + 3x tracked_apc_msv, 2x strategic_uav variants)

---

### 7. **DEPLOYABLES ICONS** (3 colors x ~15 items = 45 files)
`public__img__icons__{COLOR}__deployables__deployable_{item}.svg`

**Items:**
- fob, fob_blue (FOB)
- hab, hab_activated (HAB)
- ammocrate, HMG, GMG
- anti_tank, anti_tank_gun
- AntiAirGun, mortars, helipad
- hellcannon, repairstation
- ub32rockets, rallypoint
- mine, T_strategic_uav (2 variants)

**Colors:** green, orange, red

---

### 8. **INFANTRY ICONS** (3 colors x ~6 items = 18 files)
`public__img__icons__{COLOR}__infantry__map_{role}.svg`

**Roles:**
- genericinfantry, hat
- infantiair, infmg
- lat, marksmansniper

**Colors:** green, orange, red

---

### 9. **COMMANDER ABILITY ICONS** (18 files)
Strategic and tactical commander actions
`public__img__icons__shared__commander__{ABILITY}.webp`

**Abilities:**
- T_strategic_uav, T_strategic_uav_pchela, T_strategic_handhelddrone
- T_tactical_artillery, T_tactical_mortarbarrage
- T_tactical_a10gunrun, T_tactical_f18gunrun, T_tactical_su25gunrun
- T_tactical_armeduav, T_JH7A_AbilityIcon
- T_tactical_support_actions, T_strategic_support_actions
- NoSpecial

---

### 10. **SPAWN GROUP FACTION ICONS** (20 files)
Large faction emblems for spawn screens
`public__img__spawnGroup__{FACTION_CODE}.webp`

All 20 factions: ADF, AFU, BAF, CAF, CRF, GFI, IMF, MEI, PLA, PLAAGF, PLANMC, RGF, TLF, Team1, Team2, USA, USMC, VDV, WPMC

---

### 11. **UNIT TYPE ICONS** (16 files)
Squad unit/company composition types
`public__img__units__T_UnitType_{unit_type}.webp`

**Types:**
- Amphibious, Amphibious_MGS
- Armored, ArmoredRecon_Wheeled
- CombinedArms, Infantry, Infantry_AirMobile
- Infantry_Light_Recon, Infantry_Mountain
- Mech_Wheeled_Amphib, Mechanized
- Mechanized_MGS, Mechanized_Wheeled, Mechanized_Wheeled_MGS
- Motorized, SpecialForces, Support, Support_MLRS
- + placeholder.webp

---

### 12. **SHARED UI ICONS** (23 files)
Miscellaneous UI elements
`public__img__icons__shared__{category}_{item}.webp/svg`

**Categories:**
- **characteristics:** Vehicle/squad ability modifiers (ATGM+, BM-21Grad+, HAB+, etc.)
- **ctx:** Drawing tools (arrow.svg, circle.svg, pen.svg, rectangle.svg, middleContext.svg)
- **Core:** ATGM.webp, amphibious.webp, camera.webp, deathCam.webp, passenger.webp

---

### 13. **MAP MARKERS - TARGETS** (6 files)
`public__img__markers__targets__marker_target_{state}.webp`

**States:**
- enabled, disabled (full size)
- mini (small map versions)
- session_enabled
- session_mini

---

### 14. **FAVICONS & META** (5 files)
`public__img__favicons__{size}.{png|webp}`

- icon_32x32.png, icon_192x192.png, icon_512x512.png
- apple-touch-icon.png, maskable_icon_x512.webp

---

### 15. **GITHUB / DOCS** (4 files)
`public__img__github__{item}.webp`

- borders, capzones
- desktop_ui_0, desktop_ui_1

---

### 16. **MISCELLANEOUS** (3 files)
- public__img__target.webp (generic target marker)
- public__img__weapons__120mm_white.webp (generic white ordnance icon)

---

## **VEHICLES FROM FactionsDump.json**

Extracted all unique vehicle names from your faction configuration file:

### Ground Vehicles by Type

#### **TRAN (Transport)**
- M939 Transport (WPMC)
- KamAZ 5350 Transport (RGF, VDV)

#### **MRAP (Protected Mobility)**
- CPV Transport (WPMC)
- CPV M134 Minigun (WPMC)
- M1117 (WPMC, RGF)
- Tigr-M Kord (RGF, VDV)

#### **LOGI (Logistics)**
- M939 Logistics (WPMC)
- Technical Logistics (WPMC, RGF)
- KamAZ 5350 Logistics (RGF, VDV)

#### **LTV (Light Tactical Vehicle)**
- M1151 M240 (WPMC)
- M1151 M2 (WPMC, RGF)
- Technical M2 (WPMC, RGF)
- BRDM-2 (RGF, VDV)

#### **ULTV (Ultra-Light Tactical Vehicle)**
- Quad Bike (WPMC, RGF)
- RHIB M134, RHIB Mk19, RHIB M2 (WPMC, RGF)

#### **APC (Armored Personnel Carrier)**
- BTR-80A (RGF)
- BTR-82A (RGF)
- BTR-MDM (VDV)

#### **IFV (Infantry Fighting Vehicle)**
- M2A3 Bradley (WPMC, RGF)
- BMP-1 (RGF)
- BMP-2 (RGF)
- BMP-3 (RGF)
- BMD-4M (VDV)

#### **MBT (Main Battle Tank)**
- M1A1 Abrams (WPMC)
- M1A2 Abrams (WPMC, RGF)
- T-72B3 (RGF)
- T-80BVM (RGF)
- T-90A (VDV, RGF)

#### **TD (Tank Destroyer)**
- M1151 TOW (WPMC)
- M1150 Assault (WPMC)

#### **MSV (Multi-role Support Vehicle)**
- M113A3 MSV (WPMC, RGF)

#### **SPA (Self-Propelled Artillery)**
- Ural-375D BM-21 Grad (WPMC, RGF, VDV)
- MT-LB FAB500 Begemot (WPMC, RGF, VDV)
- 2S1 Gvozdika (RGF)
- 2S3 Akatsiya (RGF)

#### **SPAA (Self-Propelled Anti-Aircraft)**
- Ural-375D ZU-23-2 (RGF, VDV)
- M1097 Avenger (WPMC)

### Aerial Vehicles

#### **AH (Attack Helicopter)**
- Loach CAS, Loach CAS Small (WPMC, RGF)
- VDV Little Knyaz CAS (VDV)
- Ka-52 Alligator (RGF, VDV)
- AH-64D Longbow (WPMC)
- Apache (WPMC)

#### **UH (Utility Helicopter)**
- Raven Transport (WPMC)
- Black Hawk Transport (WPMC)
- Mi-8MT (RGF, VDV)
- Huey Transport (WPMC)

---

## **Current Issue: Vehicle Icons**

### What You Mentioned
> "Reemplazar los iconos 'test' de los vehiculos por sus iconos reales"

The **test.webp** icon is located at:
```
public__img__markers__weapons__test.webp
```

### Current State
- ✅ Named weapon/vehicle icons exist in `markers/weapons/` and `weapons/` directories
- ✅ Generic type icons exist (`vehicleSpawners/` for APC, IFV, LOGI, MBT, MRAP, TRAN)
- ❌ **GAPS:** Not all vehicle names from your JSON have corresponding named icons

### Vehicles WITH Icons in Resources
- BM-21Grad ✓
- BTR4-AGS ✓
- HIMARS ✓
- HellCannon ✓
- M1064M121 ✓
- M109 ✓
- M777 ✓
- MO120RTF1 ✓
- MTLB_FAB500 ✓
- Mk19 ✓
- Mortar ✓
- PZL07 ✓
- T62.DUMP.TRUCK ✓
- TOS-1A ✓
- Tech.Mortar ✓
- Tech.UB-32 ✓
- UB-32 ✓
- Ural-HellCannon ✓
- type_63 ✓

### Vehicles WITHOUT Named Icons
Most of your vehicles from FactionsDump.json **are not in the resources yet**:
- M939 Transport, CPV Transport, M1117, M1151 variants
- BMP series, BTR-80A, BTR-82A, BTR-MDM
- Bradley M2A3, T-72B3, T-80BVM, M1A1, M1A2, T-90A
- Ka-52, AH-64D, Mi-8MT, Black Hawk, Raven
- And many others...

---

## **Recommendations for Vehicle Icon Mapping**

### Strategy 1: Use Generic Type Icons (Quick Fix)
Map vehicles to their generic type:
- `M939 Transport` → `vehicleSpawners/TRAN.webp`
- `M2A3 Bradley` → `vehicleSpawners/IFV.webp`
- `T-90A` → `vehicleSpawners/MBT.webp`
- `AH-64D` → Create a generic `vehicleSpawners/AH.webp`

### Strategy 2: Add Named Icons (Long Term)
You'll need to either:
1. Create SVG icons for each vehicle (drawing/design)
2. Extract from Squad game assets (likely extracted already in your SquadJS dump)
3. Use a community resource pack

### Strategy 3: Hybrid Mapping
- Use named icons where they exist
- Fall back to type-based icons for others
- Use SVG map icons from `icons/{color}/vehicles/` for specific vehicle behaviors

---

## File Organization Summary

| Category | Count | Path | Format |
|----------|-------|------|--------|
| Role Icons | 63 | `Role_Icons_Squad_*` | PNG/WebP |
| Flags | 54 | `public__img__flags__*` | WebP |
| Vehicle Type Icons | 6 | `public__img__vehicleSpawners__*` | WebP |
| Named Vehicle/Weapon Icons | 60 | `markers/weapons/`, `weapons/` | WebP |
| Map Icons (3 colors) | 192 | `icons/{color}/vehicles/` | SVG |
| Deployables (3 colors) | 45 | `icons/{color}/deployables/` | SVG |
| Infantry (3 colors) | 18 | `icons/{color}/infantry/` | SVG |
| Commander Abilities | 18 | `commander/` | WebP |
| Spawn Groups | 20 | `spawnGroup/` | WebP |
| Unit Types | 16 | `units/` | WebP |
| Shared UI | 23 | `icons/shared/` | WebP/SVG |
| Markers | 6 | `markers/targets/` | WebP |
| Favicons | 5 | `favicons/` | PNG/WebP |
| Miscellaneous | 7 | `icons/shared/`, root | WebP/PNG |

