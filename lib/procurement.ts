/**
 * Sonic Architecture — Real-World Sourcing, Product Matching & Budget-Aware Procurement Engine
 * Connects 3D scene objects & architectural finishes to Buy, Rent, and Custom Fabrication options
 * with attribute-based matching, location-aware supplier links, personalized budget scoring, and BOQ export.
 */

import type {
  CurrencyCode,
  ObjectCategory,
  ObjectProcurementMetadata,
  ProcurementLineItem,
  ProductOptionMatch,
  ProjectBudgetConfig,
  ProjectProcurementSummary,
  SceneSpec,
  SourcingMethod,
  SpatialObject,
} from "./types";

export const CURRENCY_RATES_FROM_USD: Record<CurrencyCode, number> = {
  USD: 1,
  INR: 84,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 152,
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

export const MANDATORY_PROCUREMENT_DISCLAIMER =
  "Preliminary Estimate Notice: Estimated totals exclude unknown delivery, freight, rigging/installation labor, local taxes (GST/VAT/Sales Tax), security deposits, damage waivers, and other supplier charges. Reference catalogue benchmarks are clearly labeled as mock estimates until confirmed via a verified vendor quote.";

export function convertFromUSD(amountUSD: number, currency: CurrencyCode): number {
  const rate = CURRENCY_RATES_FROM_USD[currency] || 1;
  return Math.round(amountUSD * rate);
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const sym = CURRENCY_SYMBOLS[currency] || "$";
  const rounded = Math.round(amount);
  if (currency === "INR") {
    return `${sym}${rounded.toLocaleString("en-IN")}`;
  }
  return `${sym}${rounded.toLocaleString("en-US")}`;
}

export function createDefaultBudgetConfig(
  overrides?: Partial<ProjectBudgetConfig>
): ProjectBudgetConfig {
  const currency: CurrencyCode = overrides?.currency || "INR";
  const defaultTotalUSD = 45000;
  const baseConfig: ProjectBudgetConfig = {
    currency,
    location: overrides?.location || "Bhubaneswar, Odisha, India",
    totalBudget:
      overrides?.totalBudget !== undefined
        ? overrides.totalBudget
        : convertFromUSD(defaultTotalUSD, currency),
    tierPreference: overrides?.tierPreference || "balanced",
    sourcingPreference: overrides?.sourcingPreference || "hybrid",
    eventDate: overrides?.eventDate || "2026-11-20",
    rentalDurationDays: overrides?.rentalDurationDays || 3,
    categoryAllocationsPct: {
      "Event Installations": 28,
      Furniture: 24,
      Structure: 16,
      Lighting: 12,
      Architecture: 10,
      Decoration: 6,
      Planting: 4,
      ...(overrides?.categoryAllocationsPct || {}),
    },
  };
  return baseConfig;
}

interface ArchetypeSourcingProfile {
  subtype: string;
  intendedFunction: string;
  defaultQuantity: number;
  essentialAttributes: string[];
  optionalAttributes: string[];
  suggestedMethods: SourcingMethod[];
  baseUnitBuyUSD: number;
  baseUnitRentPerDayUSD: number;
  baseCustomCommissionUSD: number;
  pricingUnitLabel: "per_unit" | "per_sqm" | "lump_sum";
  buyDescriptor: string;
  rentDescriptor: string;
  customDescriptor: string;
  installationRequirement: string;
  minimumOrderQuantity: number;
}

const ARCHETYPE_PROFILES: Record<string, ArchetypeSourcingProfile> = {
  horn_speaker_pair: {
    subtype: "dual_flare_horn_loudspeaker",
    intendedFunction: "Primary audiophile stereo dispersion & low-distortion acoustic projection",
    defaultQuantity: 1,
    essentialAttributes: [
      "Bi-radial sculpted hardwood horn flare",
      "15-inch high-sensitivity bass-reflex woofer enclosure",
      "Compression driver with cast-brass throat ring",
    ],
    optionalAttributes: ["Alnico magnet motor", "Solid walnut isolation plinth & spikes"],
    suggestedMethods: ["buy", "rent", "custom"],
    baseUnitBuyUSD: 6800,
    baseUnitRentPerDayUSD: 280,
    baseCustomCommissionUSD: 9400,
    pricingUnitLabel: "per_unit",
    buyDescriptor: "Coaxial & Bi-Radial Wood Horn Studio Loudspeaker Tower",
    rentDescriptor: "Pro-Audio Point-Source Horn & Bass Cabinet Rental Rig",
    customDescriptor: "Bespoke CNC-Turned Walnut Acoustic Horn & Alnico Cabinet",
    installationRequirement: "Requires 2 audio technicians + acoustic toe-in calibration",
    minimumOrderQuantity: 1,
  },
  horn_speaker: {
    subtype: "dual_flare_horn_loudspeaker",
    intendedFunction: "Primary audiophile stereo dispersion & low-distortion acoustic projection",
    defaultQuantity: 1,
    essentialAttributes: [
      "Bi-radial sculpted hardwood horn flare",
      "15-inch high-sensitivity bass-reflex woofer enclosure",
      "Compression driver with cast-brass throat ring",
    ],
    optionalAttributes: ["Alnico magnet motor", "Solid walnut isolation plinth & spikes"],
    suggestedMethods: ["buy", "rent", "custom"],
    baseUnitBuyUSD: 6800,
    baseUnitRentPerDayUSD: 280,
    baseCustomCommissionUSD: 9400,
    pricingUnitLabel: "per_unit",
    buyDescriptor: "Coaxial & Bi-Radial Wood Horn Studio Loudspeaker Tower",
    rentDescriptor: "Pro-Audio Point-Source Horn & Bass Cabinet Rental Rig",
    customDescriptor: "Bespoke CNC-Turned Walnut Acoustic Horn & Alnico Cabinet",
    installationRequirement: "Requires 2 audio technicians + acoustic toe-in calibration",
    minimumOrderQuantity: 1,
  },
  analog_turntable_console: {
    subtype: "vibration_isolated_dj_turntable_console",
    intendedFunction: "Vibration-isolated analog playback deck & tube amplification control center",
    defaultQuantity: 1,
    essentialAttributes: [
      "Honed slate vibration-isolation top plate",
      "Dual direct-drive turntable cutouts",
      "Ventilated tube amplifier bay & cable management",
    ],
    optionalAttributes: ["Hinoki/Oak slatted doors", "Integrated 2200K warm VU task strip"],
    suggestedMethods: ["buy", "rent", "custom"],
    baseUnitBuyUSD: 4200,
    baseUnitRentPerDayUSD: 220,
    baseCustomCommissionUSD: 5800,
    pricingUnitLabel: "per_unit",
    buyDescriptor: "Audiophile Hardwood & Slate Dual-Turntable Credenza Console",
    rentDescriptor: "Backline Dual Direct-Drive Vinyl Turntable & Rotary Mixer Booth",
    customDescriptor: "Custom Joinery Hinoki & Honed Slate Analog Audio Console",
    installationRequirement: "Level floor check + dedicated 20A isolated audio power circuit",
    minimumOrderQuantity: 1,
  },
  turntable_console: {
    subtype: "vibration_isolated_dj_turntable_console",
    intendedFunction: "Vibration-isolated analog playback deck & tube amplification control center",
    defaultQuantity: 1,
    essentialAttributes: [
      "Honed slate vibration-isolation top plate",
      "Dual direct-drive turntable cutouts",
      "Ventilated tube amplifier bay & cable management",
    ],
    optionalAttributes: ["Hinoki/Oak slatted doors", "Integrated 2200K warm VU task strip"],
    suggestedMethods: ["buy", "rent", "custom"],
    baseUnitBuyUSD: 4200,
    baseUnitRentPerDayUSD: 220,
    baseCustomCommissionUSD: 5800,
    pricingUnitLabel: "per_unit",
    buyDescriptor: "Audiophile Hardwood & Slate Dual-Turntable Credenza Console",
    rentDescriptor: "Backline Dual Direct-Drive Vinyl Turntable & Rotary Mixer Booth",
    customDescriptor: "Custom Joinery Hinoki & Honed Slate Analog Audio Console",
    installationRequirement: "Level floor check + dedicated 20A isolated audio power circuit",
    minimumOrderQuantity: 1,
  },
  vinyl_record_shelf: {
    subtype: "modular_lp_archive_shelving",
    intendedFunction: "High-load archival LP storage & rear-wall acoustic diffusion",
    defaultQuantity: 1,
    essentialAttributes: [
      "33cm vertical LP bay clearances",
      "Reinforced 38mm hardwood shelves (80kg/m load)",
      "Integrated 2200K LED shelf grazing channels",
    ],
    optionalAttributes: ["Solid cedar/oak dividers", "Flush wall-cleat anchoring"],
    suggestedMethods: ["buy", "custom", "rent"],
    baseUnitBuyUSD: 3400,
    baseUnitRentPerDayUSD: 165,
    baseCustomCommissionUSD: 4900,
    pricingUnitLabel: "per_unit",
    buyDescriptor: "Modular Solid Oak & Cedar Vinyl LP Library Shelving System",
    rentDescriptor: "Modular Exhibition Display Shelving Wall with Warm LED Strips",
    customDescriptor: "Floor-to-Ceiling Millwork Archival Vinyl Wall with LED Grazing",
    installationRequirement: "Wall stud anchoring required for full-height safety",
    minimumOrderQuantity: 1,
  },
  vinyl_shelf: {
    subtype: "modular_lp_archive_shelving",
    intendedFunction: "High-load archival LP storage & rear-wall acoustic diffusion",
    defaultQuantity: 1,
    essentialAttributes: [
      "33cm vertical LP bay clearances",
      "Reinforced 38mm hardwood shelves (80kg/m load)",
      "Integrated 2200K LED shelf grazing channels",
    ],
    optionalAttributes: ["Solid cedar/oak dividers", "Flush wall-cleat anchoring"],
    suggestedMethods: ["buy", "custom", "rent"],
    baseUnitBuyUSD: 3400,
    baseUnitRentPerDayUSD: 165,
    baseCustomCommissionUSD: 4900,
    pricingUnitLabel: "per_unit",
    buyDescriptor: "Modular Solid Oak & Cedar Vinyl LP Library Shelving System",
    rentDescriptor: "Modular Exhibition Display Shelving Wall with Warm LED Strips",
    customDescriptor: "Floor-to-Ceiling Millwork Archival Vinyl Wall with LED Grazing",
    installationRequirement: "Wall stud anchoring required for full-height safety",
    minimumOrderQuantity: 1,
  },
  low_lounge_chair: {
    subtype: "acoustic_low_back_lounge_chair",
    intendedFunction: "Primary sweet-spot seating below ear-height acoustic shadow plane",
    defaultQuantity: 1,
    essentialAttributes: [
      "Low 78cm backrest height to prevent HF acoustic shadowing",
      "Full-grain aniline cognac leather upholstery",
      "Solid hardwood frame with brass ferrules",
    ],
    optionalAttributes: ["Matching leather footrest ottoman", "High-density acoustic foam core"],
    suggestedMethods: ["buy", "rent", "custom"],
    baseUnitBuyUSD: 1650,
    baseUnitRentPerDayUSD: 85,
    baseCustomCommissionUSD: 2400,
    pricingUnitLabel: "per_unit",
    buyDescriptor: "Low-Slung Saddle Cognac Leather & Oak Lounge Armchair",
    rentDescriptor: "VIP Cognac Leather Lounge Club Chair & Ottoman Rental",
    customDescriptor: "Bespoke Upholstered Full-Grain Leather & Hinoki Lounge Chair",
    installationRequirement: "White-glove placement with felt floor glides",
    minimumOrderQuantity: 1,
  },
  lounge_chair: {
    subtype: "acoustic_low_back_lounge_chair",
    intendedFunction: "Primary sweet-spot seating below ear-height acoustic shadow plane",
    defaultQuantity: 1,
    essentialAttributes: [
      "Low 78cm backrest height to prevent HF acoustic shadowing",
      "Full-grain aniline cognac leather upholstery",
      "Solid hardwood frame with brass ferrules",
    ],
    optionalAttributes: ["Matching leather footrest ottoman", "High-density acoustic foam core"],
    suggestedMethods: ["buy", "rent", "custom"],
    baseUnitBuyUSD: 1650,
    baseUnitRentPerDayUSD: 85,
    baseCustomCommissionUSD: 2400,
    pricingUnitLabel: "per_unit",
    buyDescriptor: "Low-Slung Saddle Cognac Leather & Oak Lounge Armchair",
    rentDescriptor: "VIP Cognac Leather Lounge Club Chair & Ottoman Rental",
    customDescriptor: "Bespoke Upholstered Full-Grain Leather & Hinoki Lounge Chair",
    installationRequirement: "White-glove placement with felt floor glides",
    minimumOrderQuantity: 1,
  },
  listening_sofa: {
    subtype: "three_seater_architectural_sofa",
    intendedFunction: "Multi-guest lounge seating & low-frequency bass absorption",
    defaultQuantity: 1,
    essentialAttributes: [
      "2.5m–2.8m three-seater architectural span",
      "Porous acoustic textile or full-grain leather upholstery",
      "Kiln-dried hardwood plinth base",
    ],
    optionalAttributes: ["Channel quilting", "Contrast bolster cushions"],
    suggestedMethods: ["buy", "rent", "custom"],
    baseUnitBuyUSD: 3200,
    baseUnitRentPerDayUSD: 160,
    baseCustomCommissionUSD: 4600,
    pricingUnitLabel: "per_unit",
    buyDescriptor: "Architectural 3-Seater Lounge Sofa on Hardwood Plinth",
    rentDescriptor: "Event VIP Lounge Settee / Banquette Rental",
    customDescriptor: "Custom-Upholstered Acoustic Lounge Settee & Slate Divider",
    installationRequirement: "2-person delivery crew; fits standard 1.2m door clearance",
    minimumOrderQuantity: 1,
  },
  sofa: {
    subtype: "three_seater_architectural_sofa",
    intendedFunction: "Multi-guest lounge seating & low-frequency bass absorption",
    defaultQuantity: 1,
    essentialAttributes: [
      "2.5m–2.8m three-seater architectural span",
      "Porous acoustic textile or full-grain leather upholstery",
      "Kiln-dried hardwood plinth base",
    ],
    optionalAttributes: ["Channel quilting", "Contrast bolster cushions"],
    suggestedMethods: ["buy", "rent", "custom"],
    baseUnitBuyUSD: 3200,
    baseUnitRentPerDayUSD: 160,
    baseCustomCommissionUSD: 4600,
    pricingUnitLabel: "per_unit",
    buyDescriptor: "Architectural 3-Seater Lounge Sofa on Hardwood Plinth",
    rentDescriptor: "Event VIP Lounge Settee / Banquette Rental",
    customDescriptor: "Custom-Upholstered Acoustic Lounge Settee & Slate Divider",
    installationRequirement: "2-person delivery crew; fits standard 1.2m door clearance",
    minimumOrderQuantity: 1,
  },
  wedding_mandap_canopy: {
    subtype: "carved_sandstone_four_pillar_mandap",
    intendedFunction: "Primary sacred ceremonial wedding canopy, dais, and havan kund focal structure",
    defaultQuantity: 1,
    essentialAttributes: [
      "5.4m × 5.4m four-pillared ceremonial canopy footprint",
      "Stepped platform dais with 4 ceremonial bajot seats",
      "Central fire-safe sacred havan kund altar & floral cornice",
    ],
    optionalAttributes: [
      "Hand-carved Jaisalmer/Dholpur sandstone columns",
      "Fresh marigold & lotus shikhara dome dressing",
    ],
    suggestedMethods: ["rent", "custom", "buy"],
    baseUnitBuyUSD: 18500,
    baseUnitRentPerDayUSD: 1450,
    baseCustomCommissionUSD: 24000,
    pricingUnitLabel: "lump_sum",
    buyDescriptor: "Modular Carved Sandstone & Brass 4-Pillar Wedding Mandap Kit",
    rentDescriptor: "Full-Service Royal Mandap Stage, Floral Canopy & Havan Kund Rental",
    customDescriptor: "Bespoke Artisan-Carved Sandstone & Marigold Shikhara Mandap Commission",
    installationRequirement: "6-person decor & rigging crew; 8-hour pre-event setup window",
    minimumOrderQuantity: 1,
  },
  ev_product_plinth: {
    subtype: "heavy_duty_automotive_rotary_plinth",
    intendedFunction: "3,500kg-rated illuminated rotary vehicle reveal stage",
    defaultQuantity: 1,
    essentialAttributes: [
      "6.4m diameter structural steel & terrazzo deck (3.5t load rating)",
      "Integrated 360-degree DMX LED perimeter telemetry ring",
      "Whisper-quiet variable-speed rotary drive motor",
    ],
    optionalAttributes: ["Chamfered obsidian terrazzo cladding", "Slip-ring power feed"],
    suggestedMethods: ["rent", "custom", "buy"],
    baseUnitBuyUSD: 28000,
    baseUnitRentPerDayUSD: 2200,
    baseCustomCommissionUSD: 36000,
    pricingUnitLabel: "lump_sum",
    buyDescriptor: "6.4m Heavy-Duty Automotive Show Turntable & LED Stage Plinth",
    rentDescriptor: "Motorized Automotive Reveal Turntable Stage & LED Ring Rental",
    customDescriptor: "Custom Chamfered Obsidian Terrazzo & DMX Rotary Reveal Plinth",
    installationRequirement: "Forklift offloading + 3-phase 32A power + certified stage rigger",
    minimumOrderQuantity: 1,
  },
  ev_plinth: {
    subtype: "heavy_duty_automotive_rotary_plinth",
    intendedFunction: "3,500kg-rated illuminated rotary vehicle reveal stage",
    defaultQuantity: 1,
    essentialAttributes: [
      "6.4m diameter structural steel & terrazzo deck (3.5t load rating)",
      "Integrated 360-degree DMX LED perimeter telemetry ring",
      "Whisper-quiet variable-speed rotary drive motor",
    ],
    optionalAttributes: ["Chamfered obsidian terrazzo cladding", "Slip-ring power feed"],
    suggestedMethods: ["rent", "custom", "buy"],
    baseUnitBuyUSD: 28000,
    baseUnitRentPerDayUSD: 2200,
    baseCustomCommissionUSD: 36000,
    pricingUnitLabel: "lump_sum",
    buyDescriptor: "6.4m Heavy-Duty Automotive Show Turntable & LED Stage Plinth",
    rentDescriptor: "Motorized Automotive Reveal Turntable Stage & LED Ring Rental",
    customDescriptor: "Custom Chamfered Obsidian Terrazzo & DMX Rotary Reveal Plinth",
    installationRequirement: "Forklift offloading + 3-phase 32A power + certified stage rigger",
    minimumOrderQuantity: 1,
  },
  curved_led_backdrop: {
    subtype: "fine_pitch_curved_micro_led_wall",
    intendedFunction: "High-contrast 4K/8K keynote telemetry & visual presentation canvas",
    defaultQuantity: 1,
    essentialAttributes: [
      "1.9mm–2.6mm pixel pitch curved modular LED cabinets",
      "3840Hz+ broadcast refresh rate for camera-safe capture",
      "Ground-stack steel rear ballast truss frame",
    ],
    optionalAttributes: ["NovaStar redundant processor", "HDR10 1500-nit calibration"],
    suggestedMethods: ["rent", "buy", "custom"],
    baseUnitBuyUSD: 42000,
    baseUnitRentPerDayUSD: 3400,
    baseCustomCommissionUSD: 54000,
    pricingUnitLabel: "lump_sum",
    buyDescriptor: "14m Curved Fine-Pitch P2.6 Indoor Micro-LED Video Wall System",
    rentDescriptor: "Turnkey 14m Curved LED Wall Rental with Media Server & Engineer",
    customDescriptor: "Custom Architectural Recessed Curved Micro-LED Telemetry Canvas",
    installationRequirement: "Requires AV rigging crew + 63A 3-phase power distribution",
    minimumOrderQuantity: 1,
  },
  led_backdrop: {
    subtype: "fine_pitch_curved_micro_led_wall",
    intendedFunction: "High-contrast 4K/8K keynote telemetry & visual presentation canvas",
    defaultQuantity: 1,
    essentialAttributes: [
      "1.9mm–2.6mm pixel pitch curved modular LED cabinets",
      "3840Hz+ broadcast refresh rate for camera-safe capture",
      "Ground-stack steel rear ballast truss frame",
    ],
    optionalAttributes: ["NovaStar redundant processor", "HDR10 1500-nit calibration"],
    suggestedMethods: ["rent", "buy", "custom"],
    baseUnitBuyUSD: 42000,
    baseUnitRentPerDayUSD: 3400,
    baseCustomCommissionUSD: 54000,
    pricingUnitLabel: "lump_sum",
    buyDescriptor: "14m Curved Fine-Pitch P2.6 Indoor Micro-LED Video Wall System",
    rentDescriptor: "Turnkey 14m Curved LED Wall Rental with Media Server & Engineer",
    customDescriptor: "Custom Architectural Recessed Curved Micro-LED Telemetry Canvas",
    installationRequirement: "Requires AV rigging crew + 63A 3-phase power distribution",
    minimumOrderQuantity: 1,
  },
  techno_sound_stack: {
    subtype: "quad_point_folded_horn_club_stack",
    intendedFunction: "High-SPL subterranean sub-bass & phase-coherent dancefloor coverage",
    defaultQuantity: 1,
    essentialAttributes: [
      "Dual 21-inch folded-horn sub-bass enclosures",
      "Flown bi-radial mid-high waveguide array",
      "DSP speaker management & Class-D touring amplification",
    ],
    optionalAttributes: ["Custom matte-black polyurethane finish", "Steel isolation cradle"],
    suggestedMethods: ["rent", "buy", "custom"],
    baseUnitBuyUSD: 14500,
    baseUnitRentPerDayUSD: 680,
    baseCustomCommissionUSD: 19200,
    pricingUnitLabel: "per_unit",
    buyDescriptor: "Touring Folded-Horn Sub-Bass & Point-Source Club Array Stack",
    rentDescriptor: "Festival / Club Horn Sound System Stack Rental with Amp Rack",
    customDescriptor: "Bespoke Architectural Horn Enclosure & Tuned Bass Array",
    installationRequirement: "Certified audio rigger + acoustic limit calibration",
    minimumOrderQuantity: 1,
  },
  obsidian_runway_deck: {
    subtype: "modular_mirror_catwalk_platform",
    intendedFunction: "Elevated specular fashion runway spine with continuous edge illumination",
    defaultQuantity: 1,
    essentialAttributes: [
      "Heavy-duty modular stage deck (750kg/sq.m rating)",
      "High-gloss obsidian acrylic/terrazzo top laminate",
      "Recessed 4200K linear LED toe-kick grazing channel",
    ],
    optionalAttributes: ["Beveled aluminum edge trim", "Anti-slip backstage ramp"],
    suggestedMethods: ["rent", "custom", "buy"],
    baseUnitBuyUSD: 16800,
    baseUnitRentPerDayUSD: 1350,
    baseCustomCommissionUSD: 22500,
    pricingUnitLabel: "lump_sum",
    buyDescriptor: "20m Modular Mirror-Top Fashion Catwalk Stage Deck System",
    rentDescriptor: "Turnkey 20m High-Gloss Black Catwalk Runway & LED Edge Rental",
    customDescriptor: "Bespoke Cast-Obsidian Terrazzo & Brushed Steel Catwalk Spine",
    installationRequirement: "4-person stage crew; protective peel-coat removed prior to show",
    minimumOrderQuantity: 1,
  },
  runway_deck: {
    subtype: "modular_mirror_catwalk_platform",
    intendedFunction: "Elevated specular fashion runway spine with continuous edge illumination",
    defaultQuantity: 1,
    essentialAttributes: [
      "Heavy-duty modular stage deck (750kg/sq.m rating)",
      "High-gloss obsidian acrylic/terrazzo top laminate",
      "Recessed 4200K linear LED toe-kick grazing channel",
    ],
    optionalAttributes: ["Beveled aluminum edge trim", "Anti-slip backstage ramp"],
    suggestedMethods: ["rent", "custom", "buy"],
    baseUnitBuyUSD: 16800,
    baseUnitRentPerDayUSD: 1350,
    baseCustomCommissionUSD: 22500,
    pricingUnitLabel: "lump_sum",
    buyDescriptor: "20m Modular Mirror-Top Fashion Catwalk Stage Deck System",
    rentDescriptor: "Turnkey 20m High-Gloss Black Catwalk Runway & LED Edge Rental",
    customDescriptor: "Bespoke Cast-Obsidian Terrazzo & Brushed Steel Catwalk Spine",
    installationRequirement: "4-person stage crew; protective peel-coat removed prior to show",
    minimumOrderQuantity: 1,
  },
  banquet_long_table: {
    subtype: "refectory_banquet_table_with_chairs",
    intendedFunction: "Ceremonial group dining assembly with 8–10 chairs & table settings",
    defaultQuantity: 1,
    essentialAttributes: [
      "3.6m–4.0m solid hardwood refectory tabletop",
      "Includes 8–10 upholstered dining chairs & Belgian linen runner",
      "Complete porcelain charger & crystal stemware place settings",
    ],
    optionalAttributes: ["solid brass stretcher hardware", "Custom monogrammed napkins"],
    suggestedMethods: ["rent", "buy", "custom"],
    baseUnitBuyUSD: 3800,
    baseUnitRentPerDayUSD: 240,
    baseCustomCommissionUSD: 5400,
    pricingUnitLabel: "per_unit",
    buyDescriptor: "Solid Oak Refectory Banquet Table + 10 Velvet Chairs & Place Settings",
    rentDescriptor: "Complete 10-Guest Refectory Banquet Table, Chairs & Tableware Rental",
    customDescriptor: "Bespoke Hand-Planed Oak Refectory Table & Custom Upholstered Chairs",
    installationRequirement: "Event stewarding team for linen pressing & place setting layout",
    minimumOrderQuantity: 1,
  },
  banquet_table: {
    subtype: "refectory_banquet_table_with_chairs",
    intendedFunction: "Ceremonial group dining assembly with 8–10 chairs & table settings",
    defaultQuantity: 1,
    essentialAttributes: [
      "3.6m–4.0m solid hardwood refectory tabletop",
      "Includes 8–10 upholstered dining chairs & Belgian linen runner",
      "Complete porcelain charger & crystal stemware place settings",
    ],
    optionalAttributes: ["Solid brass stretcher hardware", "Custom monogrammed napkins"],
    suggestedMethods: ["rent", "buy", "custom"],
    baseUnitBuyUSD: 3800,
    baseUnitRentPerDayUSD: 240,
    baseCustomCommissionUSD: 5400,
    pricingUnitLabel: "per_unit",
    buyDescriptor: "Solid Oak Refectory Banquet Table + 10 Velvet Chairs & Place Settings",
    rentDescriptor: "Complete 10-Guest Refectory Banquet Table, Chairs & Tableware Rental",
    customDescriptor: "Bespoke Hand-Planed Oak Refectory Table & Custom Upholstered Chairs",
    installationRequirement: "Event stewarding team for linen pressing & place setting layout",
    minimumOrderQuantity: 1,
  },
  retreat_timber_pavilion: {
    subtype: "open_air_coastal_timber_pavilion",
    intendedFunction: "Weather-resistant open-air shade structure & keynote canopy",
    defaultQuantity: 1,
    essentialAttributes: [
      "Structural Burmese teak / treated glulam timber posts",
      "Angled brise-soleil sun-breaker roof louver blades",
      "Marine-grade stainless & brass base collars + linen drapes",
    ],
    optionalAttributes: ["Integrated warm LED rafters", "Motorized shade sail"],
    suggestedMethods: ["custom", "rent", "buy"],
    baseUnitBuyUSD: 22000,
    baseUnitRentPerDayUSD: 1650,
    baseCustomCommissionUSD: 29500,
    pricingUnitLabel: "lump_sum",
    buyDescriptor: "Prefabricated Architectural Teak & Louvered Pergola Pavilion Kit",
    rentDescriptor: "Luxury Open-Air Timber Frame Event Pavilion & Linen Drapery Rental",
    customDescriptor: "Custom-Engineered Burmese Teak & Marine Brass Coastal Pavilion",
    installationRequirement: "Ballasted deck footings + 4-person structural carpentry crew",
    minimumOrderQuantity: 1,
  },
};

export function deriveObjectProcurementMetadata(
  obj: SpatialObject,
  sceneSpec?: SceneSpec
): ObjectProcurementMetadata {
  if (obj.procurement) {
    return obj.procurement;
  }
  const profile = ARCHETYPE_PROFILES[obj.archetype] || {
    subtype: obj.archetype || "architectural_element",
    intendedFunction: obj.designNote || `${obj.category} assembly within ${sceneSpec?.title || "venue"}`,
    defaultQuantity: 1,
    essentialAttributes: [
      `Dimensions: ${obj.dimensions.map((n) => Number(n).toFixed(2)).join("m × ")}m`,
      `Primary Material: ${obj.materialId.replace(/_/g, " ")}`,
      `Category Role: ${obj.category}`,
    ],
    optionalAttributes: ["Custom finish color matching", "Commercial fire-retardant certification"],
    suggestedMethods:
      obj.category === "Architecture" || obj.category === "Structure"
        ? (["custom", "rent", "buy"] as SourcingMethod[])
        : (["rent", "buy", "custom"] as SourcingMethod[]),
    baseUnitBuyUSD: 1800,
    baseUnitRentPerDayUSD: 110,
    baseCustomCommissionUSD: 2600,
    pricingUnitLabel: "per_unit" as const,
    buyDescriptor: obj.name,
    rentDescriptor: `${obj.name} (Event Rental Equivalent)`,
    customDescriptor: `Custom Fabricated ${obj.name}`,
    installationRequirement: "Standard commercial delivery & on-site placement",
    minimumOrderQuantity: 1,
  };

  return {
    objectId: obj.id,
    category: obj.category,
    subtype: profile.subtype,
    dimensionsMeters: [obj.dimensions[0], obj.dimensions[1], obj.dimensions[2]],
    unit: "m",
    materialName: obj.materialId.replace(/_/g, " "),
    finish: obj.secondaryMaterialId ? obj.secondaryMaterialId.replace(/_/g, " ") : "Architectural Matte / Satin",
    colorHex: obj.colorHex,
    style: sceneSpec ? sceneSpec.typology.replace(/_/g, " ") : "contemporary architectural",
    quantity: profile.defaultQuantity,
    intendedFunction: profile.intendedFunction,
    essentialAttributes: profile.essentialAttributes,
    optionalAttributes: profile.optionalAttributes,
    suggestedMethods: profile.suggestedMethods,
  };
}

interface SupplierDirectoryEntry {
  name: string;
  region: string;
  isIndiaLocal: boolean;
  buildUrl: (query: string) => string;
}

function resolveSuppliersForCategoryAndLocation(
  category: ObjectCategory,
  archetype: string,
  method: SourcingMethod,
  location: string
): any {
  const locLower = (location || "").toLowerCase();
  const isIndia =
    locLower.includes("india") ||
    locLower.includes("bhubaneswar") ||
    locLower.includes("odisha") ||
    locLower.includes("mumbai") ||
    locLower.includes("delhi") ||
    locLower.includes("bengaluru") ||
    locLower.includes("kolkata");

  const isAudioOrTech =
    archetype.includes("speaker") ||
    archetype.includes("turntable") ||
    archetype.includes("console") ||
    archetype.includes("sound_stack") ||
    archetype.includes("dj") ||
    archetype.includes("led") ||
    archetype.includes("light") ||
    archetype.includes("truss");

  if (isIndia) {
    if (method === "rent") {
      return {
        primary: {
          name: isAudioOrTech
            ? "IndiaMART Pro-AV & Event Stage Rentals (Bhubaneswar / East India)"
            : "IndiaMART Event Tent, Mandap & Furniture Rentals (Odisha / Pan-India)",
          region: location || "Bhubaneswar, Odisha, India",
          isIndiaLocal: true,
          buildUrl: (q: string) =>
            `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(q + " rental " + (location.split(",")[0] || "India"))}`,
        },
        searchUrl: `https://www.google.com/search?q=${encodeURIComponent(archetype.replace(/_/g, " ") + " event rental supplier " + location)}`,
      };
    }
    if (method === "custom") {
      return {
        primary: {
          name: "IndiaMART Bespoke Architectural Millwork, Stone & Event Fabrication",
          region: location || "Bhubaneswar, Odisha, India",
          isIndiaLocal: true,
          buildUrl: (q: string) =>
            `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent("custom fabrication " + q)}`,
        },
        searchUrl: `https://www.google.com/search?q=${encodeURIComponent("custom architectural fabrication " + archetype.replace(/_/g, " ") + " " + location)}`,
      };
    }
    // Buy in India
    if (category === "Furniture" || category === "Decoration") {
      return {
        primary: {
          name: "Pepperfry Commercial & Hospitality Studio (India)",
          region: location || "India",
          isIndiaLocal: true,
          buildUrl: (q: string) =>
            `https://www.pepperfry.com/site_product/search?q=${encodeURIComponent(q)}`,
        },
        searchUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(archetype.replace(/_/g, " ") + " " + location)}`,
      };
    }
    return {
      primary: {
        name: "IndiaMART Commercial Architecture & Pro-Audio Catalogue",
        region: location || "Bhubaneswar, Odisha, India",
        isIndiaLocal: true,
        buildUrl: (q: string) => `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(q)}`,
      },
      searchUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(archetype.replace(/_/g, " ") + " " + location)}`,
    };
  }

  // Global / US / EU / UK Suppliers
  if (method === "rent") {
    return {
      primary: {
        name: isAudioOrTech
          ? "PRG / Solotech Pro-AV & Event Production Rentals"
          : "CORT Event Furnishings & Peak Event Services",
        region: location || "Global / North America & Europe",
        isIndiaLocal: false,
        buildUrl: (q: string) =>
          isAudioOrTech
            ? `https://www.prg.com/en/search?q=${encodeURIComponent(q)}`
            : `https://www.cortevents.com/search?q=${encodeURIComponent(q)}`,
      },
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(archetype.replace(/_/g, " ") + " event rental " + location)}`,
    };
  }

  if (method === "custom") {
    return {
      primary: {
        name: "Thomasnet & Archiproducts Custom Architectural Fabricators",
        region: location || "Global Custom Millwork & Metalwork Network",
        isIndiaLocal: false,
        buildUrl: (q: string) =>
          `https://www.thomasnet.com/search.html?cov=NA&what=${encodeURIComponent(q)}`,
      },
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent("custom architectural fabrication " + archetype.replace(/_/g, " ") + " " + location)}`,
    };
  }

  // Global Buy
  if (isAudioOrTech) {
    return {
      primary: {
        name: "Thomann International Pro-Audio & Lighting Catalogue",
        region: location || "Global / Europe & US Delivery",
        isIndiaLocal: false,
        buildUrl: (q: string) =>
          `https://www.thomann.de/intl/search_dir.html?sw=${encodeURIComponent(q)}`,
      },
      searchUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(archetype.replace(/_/g, " "))}`,
    };
  }

  return {
    primary: {
      name: "Archiproducts & 1stDibs Architectural Trade Catalogue",
      region: location || "Global Architectural Trade",
      isIndiaLocal: false,
      buildUrl: (q: string) =>
        `https://www.archiproducts.com/en/products/search?q=${encodeURIComponent(q)}`,
    },
    searchUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(archetype.replace(/_/g, " "))}`,
  };
}

export function matchRealWorldProductsForObject(
  obj: SpatialObject,
  sceneSpec: SceneSpec,
  budgetConfig: ProjectBudgetConfig,
  existingList: ProcurementLineItem[] = []
): ProductOptionMatch[] {
  const meta = deriveObjectProcurementMetadata(obj, sceneSpec);
  const profile = ARCHETYPE_PROFILES[obj.archetype] || {
    subtype: meta.subtype,
    intendedFunction: meta.intendedFunction,
    defaultQuantity: meta.quantity,
    essentialAttributes: meta.essentialAttributes,
    optionalAttributes: meta.optionalAttributes,
    suggestedMethods: meta.suggestedMethods,
    baseUnitBuyUSD: Math.max(450, Math.round(obj.dimensions[0] * obj.dimensions[2] * 380)),
    baseUnitRentPerDayUSD: Math.max(45, Math.round(obj.dimensions[0] * obj.dimensions[2] * 28)),
    baseCustomCommissionUSD: Math.max(750, Math.round(obj.dimensions[0] * obj.dimensions[2] * 540)),
    pricingUnitLabel: "per_unit" as const,
    buyDescriptor: obj.name,
    rentDescriptor: `${obj.name} — Event Rental Unit`,
    customDescriptor: `Bespoke Fabricated ${obj.name}`,
    installationRequirement: "Standard on-site delivery & placement",
    minimumOrderQuantity: 1,
  };

  const methods: SourcingMethod[] = ["buy", "rent", "custom"];
  const tiers: ("economy" | "recommended" | "premium")[] = ["economy", "recommended", "premium"];

  // Compute remaining project budget and category budget share
  const spentSoFar = existingList
    .filter((item) => item.objectId !== obj.id)
    .reduce((acc, item) => acc + item.lineTotalInCurrency, 0);
  const remainingProjectBudget = Math.max(0, budgetConfig.totalBudget - spentSoFar);
  const catPct = budgetConfig.categoryAllocationsPct[obj.category] || 15;
  const categoryBudgetInCurrency = budgetConfig.totalBudget * (catPct / 100);

  // Count how many objects share this category in the scene so we can gauge per-object fair share
  const objectsInCategory = Math.max(
    1,
    sceneSpec.objects.filter((o) => o.category === obj.category).length
  );
  const targetObjectBudgetInCurrency = categoryBudgetInCurrency / objectsInCategory;

  const results: ProductOptionMatch[] = [];
  const searchKeywords = `${meta.materialName} ${obj.name.replace(/\(.*?\)/g, "").trim()}`;

  methods.forEach((method) => {
    const supplierInfo = resolveSuppliersForCategoryAndLocation(
      obj.category,
      obj.archetype,
      method,
      budgetConfig.location
    );

    const baseUSD =
      method === "buy"
        ? profile.baseUnitBuyUSD
        : method === "rent"
        ? profile.baseUnitRentPerDayUSD
        : profile.baseCustomCommissionUSD;

    const pricingPeriod: ProductOptionMatch["pricingPeriod"] =
      method === "rent"
        ? "per_day"
        : profile.pricingUnitLabel === "lump_sum"
        ? "lump_sum"
        : "per_unit";

    tiers.forEach((tier) => {
      const tierMultiplier = tier === "economy" ? 0.68 : tier === "recommended" ? 1.0 : 1.48;
      const unitPriceUSD = Math.max(15, Math.round(baseUSD * tierMultiplier));
      const unitPriceInUserCurrency = convertFromUSD(unitPriceUSD, budgetConfig.currency);
      const qty = meta.quantity || 1;
      const durationFactor = pricingPeriod === "per_day" ? Math.max(1, budgetConfig.rentalDurationDays) : 1;
      const estimatedLineTotal = unitPriceInUserCurrency * qty * durationFactor;

      // Attribute-based match score (dimensions + material + style + function)
      const baseMatch =
        method === "custom"
          ? tier === "premium"
            ? 98
            : tier === "recommended"
            ? 95
            : 90
          : tier === "recommended"
          ? 92
          : tier === "premium"
          ? 94
          : 82;

      const dimensionFitNote =
        method === "custom"
          ? `Exact CAD fabrication to ${meta.dimensionsMeters.map((d) => d.toFixed(2)).join("m × ")}m (±2mm tolerance)`
          : tier === "economy"
          ? `Standard modular size within ±12% of ${meta.dimensionsMeters.map((d) => d.toFixed(2)).join("m × ")}m envelope`
          : `Close dimensional match within ±4% of ${meta.dimensionsMeters.map((d) => d.toFixed(2)).join("m × ")}m spec`;

      const materialFitNote =
        tier === "economy"
          ? `Commercial-grade engineered ${meta.materialName} finish equivalent`
          : tier === "recommended"
          ? `Architectural ${meta.materialName} with ${meta.finish} finish`
          : `Exhibition-grade solid ${meta.materialName} with hand-finished ${meta.finish} detailing`;

      // Dynamic Budget Fit Evaluation (responsive to user's totalBudget, tierPreference, sourcingPreference, quantity & rentalDurationDays)
      const preferredTierMap: Record<ProjectBudgetConfig["tierPreference"], "economy" | "recommended" | "premium"> = {
        economy: "economy",
        balanced: "recommended",
        premium: "premium",
        luxury: "premium",
      };
      const matchesUserTierPref = preferredTierMap[budgetConfig.tierPreference] === tier;
      const matchesUserMethodPref =
        budgetConfig.sourcingPreference === method ||
        (budgetConfig.sourcingPreference === "hybrid" &&
          ((obj.category === "Event Installations" || obj.category === "Lighting") ? method === "rent" : method !== "custom"));

      let budgetFitStatus: ProductOptionMatch["budgetFitStatus"] = "within_budget";
      let budgetFitExplanation = "";

      if (estimatedLineTotal > remainingProjectBudget) {
        budgetFitStatus = "over_allocation";
        budgetFitExplanation = `Line total (${formatCurrency(estimatedLineTotal, budgetConfig.currency)}) exceeds your remaining project budget (${formatCurrency(remainingProjectBudget, budgetConfig.currency)}). Consider switching to Rental or Economy tier.`;
      } else if (estimatedLineTotal <= targetObjectBudgetInCurrency * 1.15 && matchesUserTierPref && matchesUserMethodPref) {
        budgetFitStatus = "optimal_fit";
        budgetFitExplanation = `Optimal fit for your ${budgetConfig.tierPreference.toUpperCase()} tier & ${budgetConfig.sourcingPreference.toUpperCase()} preference in ${budgetConfig.location} — uses ${Math.round((estimatedLineTotal / Math.max(1, categoryBudgetInCurrency)) * 100)}% of your ${obj.category} allocation (${formatCurrency(categoryBudgetInCurrency, budgetConfig.currency)}).`;
      } else if (estimatedLineTotal <= categoryBudgetInCurrency * 0.65) {
        budgetFitStatus = matchesUserTierPref ? "optimal_fit" : "within_budget";
        budgetFitExplanation = `Fits comfortably within your ${obj.category} budget allocation (${formatCurrency(categoryBudgetInCurrency, budgetConfig.currency)}) for ${qty} unit(s)${pricingPeriod === "per_day" ? ` × ${budgetConfig.rentalDurationDays} rental days` : ""}.`;
      } else {
        budgetFitStatus = "stretch_tier";
        budgetFitExplanation = `Stretch option representing ${Math.round((estimatedLineTotal / Math.max(1, categoryBudgetInCurrency)) * 100)}% of your ${obj.category} allocation (${formatCurrency(categoryBudgetInCurrency, budgetConfig.currency)}), but within overall project budget.`;
      }

      const tierTitlePrefix =
        tier === "economy"
          ? "Economy Commercial"
          : tier === "recommended"
          ? "Recommended Architectural"
          : "Premium Bespoke / Flagship";

      const baseDescriptor =
        method === "buy"
          ? profile.buyDescriptor
          : method === "rent"
          ? profile.rentDescriptor
          : profile.customDescriptor;

      results.push({
        id: `opt-${obj.id}-${method}-${tier}`,
        objectId: obj.id,
        sceneObjectName: obj.name,
        title: `${tierTitlePrefix}: ${baseDescriptor}`,
        sourcingMethod: method,
        tier,
        matchClassification:
          method === "custom" ? "custom_commission_spec" : "similar_alternative",
        isMockReferenceData: true,
        dataSourceLabel:
          "Reference Catalogue Benchmark (Mock Estimate — Click Supplier Link for Live Quote)",
        matchScorePct: baseMatch,
        matchedAttributes: [
          ...meta.essentialAttributes.slice(0, 2),
          materialFitNote,
        ],
        dimensionFitNote,
        materialFitNote,
        unitPriceUSD,
        pricingPeriod,
        recommendedQuantity: qty,
        estimatedLineTotalInUserCurrency: estimatedLineTotal,
        currency: budgetConfig.currency,
        priceStatus: "estimated_cost",
        priceVerifiedTimestamp: null,
        availabilityStatus:
          method === "rent"
            ? `Availability Unverified for ${budgetConfig.eventDate} (${budgetConfig.rentalDurationDays}d) — Request Vendor Quote`
            : method === "custom"
            ? "Custom Commission — Est. Lead Time 3–5 Weeks"
            : "Catalogue Alternative — Verify Live Stock on Supplier Page",
        leadTimeOrDeliveryNote:
          method === "rent"
            ? `Local/Regional dispatch to ${budgetConfig.location} (Est. 150km delivery radius)`
            : method === "custom"
            ? `Shop drawings + 3–5 weeks fabrication & delivery to ${budgetConfig.location}`
            : `Standard freight shipping to ${budgetConfig.location} (5–14 business days)`,
        minimumOrderQuantity: profile.minimumOrderQuantity,
        deliveryRadiusKm: method === "rent" ? 250 : undefined,
        installationRequirement: profile.installationRequirement,
        supplierName: supplierInfo.primary.name,
        supplierRegion: supplierInfo.primary.region,
        isLocalVendorMatch: supplierInfo.primary.isIndiaLocal,
        productUrl: supplierInfo.primary.buildUrl(searchKeywords),
        supplierSearchUrl: supplierInfo.searchUrl,
        budgetFitStatus,
        budgetFitExplanation,
      });
    });
  });

  return results;
}

export function upsertProcurementLineItem(
  existingList: ProcurementLineItem[],
  option: ProductOptionMatch,
  category: ObjectCategory,
  quantity: number,
  rentalDurationDays: number
): ProcurementLineItem[] {
  const safeQty = Math.max(1, Math.round(quantity || 1));
  const safeDays = Math.max(1, Math.round(rentalDurationDays || 1));
  const unitPriceInCurrency = convertFromUSD(option.unitPriceUSD, option.currency);
  const durationMult = option.pricingPeriod === "per_day" ? safeDays : 1;
  const lineTotalInCurrency = unitPriceInCurrency * safeQty * durationMult;

  const newItem: ProcurementLineItem = {
    lineId: `boq-${option.objectId}`,
    objectId: option.objectId,
    sceneObjectName: option.sceneObjectName,
    category,
    selectedOption: {
      ...option,
      recommendedQuantity: safeQty,
      estimatedLineTotalInUserCurrency: lineTotalInCurrency,
    },
    sourcingMethod: option.sourcingMethod,
    tier: option.tier,
    quantity: safeQty,
    rentalDurationDays: safeDays,
    unitPriceInCurrency,
    pricingPeriod: option.pricingPeriod,
    lineTotalInCurrency,
    currency: option.currency,
    supplierName: option.supplierName,
    sourceUrl: option.productUrl,
    priceStatus: option.priceStatus,
    availabilityStatus: option.availabilityStatus,
    matchScorePct: option.matchScorePct,
    savedAtTimestamp: new Date().toISOString(),
  };

  // Replace existing entry for the same objectId so we never double-count the same scene object
  const idx = existingList.findIndex((item) => item.objectId === option.objectId);
  if (idx >= 0) {
    const copy = [...existingList];
    copy[idx] = newItem;
    return copy;
  }
  return [...existingList, newItem];
}

export function calculateProcurementSummary(
  items: ProcurementLineItem[],
  budgetConfig: ProjectBudgetConfig
): ProjectProcurementSummary {
  const categories: ObjectCategory[] = [
    "Architecture",
    "Structure",
    "Furniture",
    "Lighting",
    "Decoration",
    "Planting",
    "Event Installations",
  ];

  const categoryBreakdown = {} as ProjectProcurementSummary["categoryBreakdown"];
  categories.forEach((cat) => {
    const pct = budgetConfig.categoryAllocationsPct[cat] || 0;
    categoryBreakdown[cat] = {
      allocated: Math.round(budgetConfig.totalBudget * (pct / 100)),
      estimated: 0,
    };
  });

  let buySubtotal = 0;
  let rentSubtotal = 0;
  let customSubtotal = 0;

  const normalizedItems = items.map((item) => {
    const unitInCurr = convertFromUSD(item.selectedOption.unitPriceUSD, budgetConfig.currency);
    const dur = item.pricingPeriod === "per_day" ? Math.max(1, budgetConfig.rentalDurationDays) : 1;
    const lineTotal = unitInCurr * item.quantity * dur;

    if (item.sourcingMethod === "buy") buySubtotal += lineTotal;
    else if (item.sourcingMethod === "rent") rentSubtotal += lineTotal;
    else customSubtotal += lineTotal;

    if (categoryBreakdown[item.category]) {
      categoryBreakdown[item.category].estimated += lineTotal;
    }

    return {
      ...item,
      rentalDurationDays: budgetConfig.rentalDurationDays,
      unitPriceInCurrency: unitInCurr,
      lineTotalInCurrency: lineTotal,
      currency: budgetConfig.currency,
    };
  });

  const grandTotalEstimated = buySubtotal + rentSubtotal + customSubtotal;
  const remainingBudget = budgetConfig.totalBudget - grandTotalEstimated;
  const budgetUtilizationPct =
    budgetConfig.totalBudget > 0
      ? Number(((grandTotalEstimated / budgetConfig.totalBudget) * 100).toFixed(1))
      : 0;

  return {
    currency: budgetConfig.currency,
    location: budgetConfig.location,
    totalBudget: budgetConfig.totalBudget,
    rentalDurationDays: budgetConfig.rentalDurationDays,
    items: normalizedItems,
    buySubtotal,
    rentSubtotal,
    customSubtotal,
    grandTotalEstimated,
    remainingBudget,
    budgetUtilizationPct,
    categoryBreakdown,
    disclaimer: MANDATORY_PROCUREMENT_DISCLAIMER,
  };
}

export function exportProcurementBriefMarkdown(
  summary: ProjectProcurementSummary,
  sceneSpec: SceneSpec
): string {
  const lines: string[] = [
    `# Preliminary Procurement Brief & Bill of Quantities (BOQ)`,
    `**Project:** ${sceneSpec.title}`,
    `**Typology:** ${sceneSpec.typology} | **Dimensions:** ${sceneSpec.roomDimensions.width}m × ${sceneSpec.roomDimensions.depth}m × ${sceneSpec.roomDimensions.height}m`,
    `**Project Location:** ${summary.location} | **Currency:** ${summary.currency} | **Rental Duration:** ${summary.rentalDurationDays} Days`,
    `**Total Budget:** ${formatCurrency(summary.totalBudget, summary.currency)} | **Estimated Total:** ${formatCurrency(summary.grandTotalEstimated, summary.currency)} (${summary.budgetUtilizationPct}%) | **Remaining:** ${formatCurrency(summary.remainingBudget, summary.currency)}`,
    ``,
    `> **${summary.disclaimer}**`,
    ``,
    `## 1. Cost Breakdown by Sourcing Method`,
    `- **Purchase (Buy) Subtotal:** ${formatCurrency(summary.buySubtotal, summary.currency)}`,
    `- **Event Rental (${summary.rentalDurationDays} Days) Subtotal:** ${formatCurrency(summary.rentSubtotal, summary.currency)}`,
    `- **Custom Fabrication Subtotal:** ${formatCurrency(summary.customSubtotal, summary.currency)}`,
    `- **Grand Estimated Total:** ${formatCurrency(summary.grandTotalEstimated, summary.currency)}`,
    ``,
    `## 2. Line-Item Bill of Quantities (${summary.items.length} Assemblies)`,
    `| Object ID | Scene Assembly | Selected Option | Method & Tier | Qty | Unit Price | Period | Line Total | Supplier & Link | Status |`,
    `| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |`,
  ];

  summary.items.forEach((item) => {
    lines.push(
      `| \`${item.objectId}\` | ${item.sceneObjectName} | ${item.selectedOption.title} | ${item.sourcingMethod.toUpperCase()} (${item.tier}) | ${item.quantity} | ${formatCurrency(item.unitPriceInCurrency, summary.currency)} | ${item.pricingPeriod} | **${formatCurrency(item.lineTotalInCurrency, summary.currency)}** | [${item.supplierName}](${item.sourceUrl}) | ${item.priceStatus.replace(/_/g, " ")} (${item.matchScorePct}% match) |`
    );
  });

  return lines.join("\n");
}
