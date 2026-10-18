import { NextResponse } from "next/server";

interface Track {
  title: string;
  artist: string;
}

interface DesignReasoning {
  source: "qloo" | "qloo-partial" | "local-fallback";
  evidence: string[];
  rules: Record<string, string>;
}

interface VibePayload {
  primaryColorHex: string;
  accentColorHex: string;
  lightingTemperatureK: number;
  flooringMaterial: string;
  seatingFabric: string;
  tracks: Track[];
  menu: string;
  fallback: boolean;
  reasoning: DesignReasoning;
}



function firstEntityId(data: Record<string, unknown>): string | null {
  const first =
    Array.isArray(data?.results) ? data.results[0] :
    Array.isArray(data?.data) ? data.data[0] :
    Array.isArray(data?.items) ? data.items[0] :
    Array.isArray(data?.entities) ? data.entities[0] :
    data?.result ?? data?.entity ?? null;
  if (!first || typeof first !== "object") return null;
  const f = first as Record<string, unknown>;
  if (typeof f.id === "string") return f.id;
  if (typeof f.entity_id === "string") return f.entity_id;
  if (typeof f.qloo_id === "string") return f.qloo_id;
  return null;
}

function firstEntityName(data: Record<string, unknown>): string | null {
  const first =
    Array.isArray(data?.results) ? data.results[0] :
    Array.isArray(data?.data) ? data.data[0] :
    Array.isArray(data?.items) ? data.items[0] :
    Array.isArray(data?.entities) ? data.entities[0] :
    data?.result ?? data?.entity ?? null;
  if (!first || typeof first !== "object") return null;
  const f = first as Record<string, unknown>;
  if (typeof f.name === "string") return f.name;
  if (typeof f.title === "string") return f.title;
  if (typeof f.label === "string") return f.label;
  return null;
}

function extractTracks(data: Record<string, unknown>): Track[] {
  const r = (typeof data.results === "object" && data.results !== null ? data.results : {}) as Record<string, unknown>;
  const arrays = [r.entities, data.entities, r, data.data, data.items];
  let list: unknown[] = [];
  for (const a of arrays) {
    if (Array.isArray(a) && a.length) {
      list = a;
      break;
    }
  }
  return list
    .filter((e) => e && typeof e === "object")
    .slice(0, 5)
    .map((e, i) => {
      const o = (e ?? {}) as Record<string, unknown>;
      return {
        title: typeof o.name === "string" ? o.name : typeof o.title === "string" ? o.title : `Insight ${i + 1}`,
        artist: typeof o.creator === "string" ? o.creator : typeof o.artist === "string" ? o.artist : "",
      };
    });
}

interface Evidence {
  genreTags: string[];
  styleTags: string[];
  themeTags: string[];
  adjectives: string[];
  characteristics: string[];
}

function collectEvidence(data: Record<string, unknown>): Evidence {
  const d = data as Record<string, unknown>;
  const results = (typeof d.results === "object" && d.results !== null ? d.results : {}) as Record<string, unknown>;
  const entities = Array.isArray(results.entities) ? results.entities : Array.isArray(d.entities) ? d.entities : [];
  const genreSet = new Set<string>();
  const styleSet = new Set<string>();
  const themeSet = new Set<string>();
  const adjSet = new Set<string>();
  const charSet = new Set<string>();
  for (const raw of entities) {
    const e = (raw ?? {}) as Record<string, unknown>;
    const tags = Array.isArray(e.tags) ? e.tags : [];
    for (const t of tags) {
      const o = (t ?? {}) as Record<string, unknown>;
      if (typeof o.name !== "string") continue;
      const name = o.name.toLowerCase();
      const type = typeof o.type === "string" ? o.type.toLowerCase() : "";
      if (type.includes("genre")) genreSet.add(name);
      else if (type.includes("style")) styleSet.add(name);
      else if (type.includes("theme")) themeSet.add(name);
    }
    const props = (e.properties ?? {}) as Record<string, unknown>;
    const adjs = Array.isArray(props.adjectives_for_music) ? props.adjectives_for_music : [];
    for (const a of adjs) {
      if (typeof a === "string") adjSet.add(a.toLowerCase());
    }
    const chars = Array.isArray(props.characteristics) ? props.characteristics : [];
    for (const c of chars) {
      if (typeof c === "string") charSet.add(c.toLowerCase());
    }
  }
  return {
    genreTags: [...genreSet],
    styleTags: [...styleSet],
    themeTags: [...themeSet],
    adjectives: [...adjSet],
    characteristics: [...charSet],
  };
}

// Deterministic cultural-to-spatial mapping table.
// Supported inputs are Qloo tag names (genre/style/theme) plus Qloo adjectives/characteristics.
// Genre family selects palette/material; mood/energy tags adjust lighting. Unrecognized input uses neutral defaults.
function mapFromEvidence(evidence: { genreTags: string[]; styleTags: string[]; themeTags: string[]; adjectives: string[]; characteristics: string[] }): {
  primaryColorHex: string;
  accentColorHex: string;
  lightingTemperatureK: number;
  flooringMaterial: string;
  seatingFabric: string;
  source: "qloo" | "qloo-partial";
  evidence: string[];
  rules: Record<string, string>;
} {
  const genreText = evidence.genreTags.join(" ");
  const moodText = [...evidence.styleTags, ...evidence.adjectives, ...evidence.characteristics].join(" ");
  const hasGenre = (words: string[]) => words.some((w) => genreText.includes(w));
  const hasMood = (words: string[]) => words.some((w) => moodText.includes(w));

  const isElectronic = hasGenre(["electronic", "house", "techno", "edm", "electro", "trance", "dubstep", "bass", "dance"]);
  const isHipHop = hasGenre(["hip hop", "rap", "trap", "crunk"]);
  const isPunkRock = hasGenre(["punk", "rock", "alternative", "hardcore", "grunge", "emo"]);
  const isAtmospheric = hasGenre(["ambient", "psychedelic", "indie", "atmospheric", "melodic"]);

  const isHighEnergy = hasMood(["energetic", "high-energy", "dynamic", "upbeat", "danceable"]);
  const isDark = hasMood(["dark", "gritty", "raw", "aggressive", "intense"]);

  const matchedEvidence: string[] = [];
  const genreEvidence = evidence.genreTags.filter((t) =>
    ["electronic", "house", "techno", "edm", "electro", "trance", "dubstep", "bass", "dance", "hip hop", "rap", "trap", "crunk", "punk", "rock", "alternative", "hardcore", "grunge", "emo", "ambient", "psychedelic", "indie", "atmospheric", "melodic"].some((w) => t.includes(w))
  );
  matchedEvidence.push(...genreEvidence);
  const moodEvidence = [...evidence.adjectives, ...evidence.characteristics].filter((t) =>
    ["energetic", "high-energy", "dynamic", "upbeat", "danceable", "dark", "gritty", "raw", "aggressive", "intense", "atmospheric", "melodic", "uplifting"].includes(t)
  );
  matchedEvidence.push(...moodEvidence);

  const rules: Record<string, string> = {};

  // Recognized genre family: use documented palette/material rules.
  if (isElectronic || isHipHop || isPunkRock || isAtmospheric) {
    let primaryColorHex = "";
    let accentColorHex = "";
    let lightingTemperatureK = 4500;
    let flooringMaterial = "";
    let seatingFabric = "";

    if (isElectronic) {
      primaryColorHex = "#00E5FF";
      accentColorHex = "#FF00AA";
      flooringMaterial = "High-Gloss Polyurethane Core";
      seatingFabric = "Technical Ribbed Neoprene";
      rules.primaryColorHex = "Matched Qloo genre tags (electronic/house/techno) to a cool neon palette.";
      rules.flooringMaterial = "Electronic/club genre tags -> High-Gloss Polyurethane Core.";
      rules.seatingFabric = "Electronic/club genre tags -> Technical Ribbed Neoprene.";
    } else if (isHipHop) {
      primaryColorHex = "#FF6B35";
      accentColorHex = "#FFD166";
      flooringMaterial = "Polished Black Basalt";
      seatingFabric = "Brushed Matte Canvas";
      rules.primaryColorHex = "Matched Qloo genre tags (hip hop/rap/trap) to a warm urban palette.";
      rules.flooringMaterial = "Hip-hop genre tags -> Polished Black Basalt.";
      rules.seatingFabric = "Hip-hop genre tags -> Brushed Matte Canvas.";
    } else if (isPunkRock) {
      primaryColorHex = "#FF3366";
      accentColorHex = "#FF99AA";
      flooringMaterial = "Industrial Micro-cement";
      seatingFabric = "Distressed Moss Velvet";
      rules.primaryColorHex = "Matched Qloo genre tags (punk/rock/alternative) to a high-contrast palette.";
      rules.flooringMaterial = "Punk/rock genre tags -> Industrial Micro-cement.";
      rules.seatingFabric = "Punk/rock genre tags -> Distressed Moss Velvet.";
    } else {
      primaryColorHex = "#7B68EE";
      accentColorHex = "#B39DDB";
      flooringMaterial = "Bleached Oak Planking";
      seatingFabric = "Raw Linen Twill";
      rules.primaryColorHex = "Matched Qloo genre tags (atmospheric/psychedelic/indie) to a soft palette.";
      rules.flooringMaterial = "Atmospheric genre tags -> Bleached Oak Planking.";
      rules.seatingFabric = "Atmospheric genre tags -> Raw Linen Twill.";
    }

    if (isHighEnergy) {
      lightingTemperatureK = 6000;
      rules.lightingTemperatureK = "High-energy Qloo style/adjective tags -> 6000K cool energetic lighting.";
    } else if (isDark) {
      lightingTemperatureK = 4500;
      rules.lightingTemperatureK = "Dark/gritty Qloo tags -> 4500K neutral lighting.";
    } else if (isAtmospheric) {
      lightingTemperatureK = 3500;
      rules.lightingTemperatureK = "Atmospheric Qloo tags -> 3500K soft warm lighting.";
    } else {
      lightingTemperatureK = 4500;
      rules.lightingTemperatureK = "No clear mood tags; 4500K default.";
    }

    rules.accentColorHex = "Complementary accent for the selected palette.";

    return {
      primaryColorHex,
      accentColorHex,
      lightingTemperatureK,
      flooringMaterial,
      seatingFabric,
      source: "qloo",
      evidence: [...new Set(matchedEvidence)].slice(0, 8),
      rules,
    };
  }

  // No recognized genre family: use a clearly identified neutral default.
  return {
    primaryColorHex: "#808080",
    accentColorHex: "#BFBFBF",
    lightingTemperatureK: 4500,
    flooringMaterial: "Micro-cement Screed Core",
    seatingFabric: "Brushed Matte Canvas",
    source: "qloo-partial",
    evidence: [...new Set(matchedEvidence)].slice(0, 8),
    rules: {
      primaryColorHex: "No recognized Qloo genre family; neutral default color.",
      accentColorHex: "No recognized Qloo genre family; neutral default accent.",
      lightingTemperatureK: "No recognized Qloo mood tags; 4500K default.",
      flooringMaterial: "No recognized Qloo material tags; neutral default flooring.",
      seatingFabric: "No recognized Qloo material tags; neutral default seating.",
    },
  };
}
function fallbackPayload(): VibePayload {
  return {
    primaryColorHex: "#808080",
    accentColorHex: "#BFBFBF",
    lightingTemperatureK: 4500,
    flooringMaterial: "Micro-cement Screed Core",
    seatingFabric: "Brushed Matte Canvas",
    tracks: [],
    menu: "Local fallback (Qloo unavailable).",
    fallback: true,
    reasoning: {
      source: "local-fallback",
      evidence: [],
      rules: {
        primaryColorHex: "Qloo unavailable; neutral default color.",
        accentColorHex: "Qloo unavailable; neutral default accent.",
        lightingTemperatureK: "Qloo unavailable; 4500K default.",
        flooringMaterial: "Qloo unavailable; neutral default flooring.",
        seatingFabric: "Qloo unavailable; neutral default seating.",
      },
    },
  };
}

export async function POST(request: Request) {
  let body: { userInput?: string; sliderVal?: number } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const userInput = typeof body.userInput === "string" ? body.userInput : "";
  const sliderVal = typeof body.sliderVal === "number" ? body.sliderVal : 50;
  const seed = userInput || "default";

  const qlooApiUrl = process.env.QLOO_API_URL || "https://hackathon.api.qloo.com";
  const qlooApiKey = process.env.QLOO_API_KEY;

  console.log("Qloo base URL:", qlooApiUrl);
  console.log("Qloo key present:", Boolean(qlooApiKey));

  if (!qlooApiKey) {
    console.error("QLOO_API_KEY is missing; using fallback.");
    return NextResponse.json(fallbackPayload());
  }

  let searchStatus: number | null = null;
  let searchData: Record<string, unknown> | null = null;

  try {
    const searchUrl = `${qlooApiUrl}/search?query=${encodeURIComponent(seed)}&types=urn:entity:artist&limit=5`;
    const searchRes = await fetch(searchUrl, {
      method: "GET",
      headers: { "X-Api-Key": qlooApiKey },
    });
    searchStatus = searchRes.status;
    console.log("Qloo /search status:", searchStatus);

    if (!searchRes.ok) {
      const text = await searchRes.text();
      console.error("Qloo /search non-2xx:", searchStatus, text.slice(0, 500));
      return NextResponse.json(fallbackPayload());
    }

    searchData = (await searchRes.json()) as Record<string, unknown>;
    const preview = JSON.stringify(searchData).slice(0, 500);
    console.log("Qloo /search preview:", preview);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Qloo /search threw:", err.message);
    const cause1 = (err as { cause?: unknown }).cause; if (cause1) console.error("Qloo /search cause:", cause1);
    return NextResponse.json(fallbackPayload());
  }

  const entityId = firstEntityId(searchData);
  const entityName = firstEntityName(searchData) || seed;

  if (!entityId) {
    console.error("Qloo /search returned no usable entity ID.");
    return NextResponse.json(fallbackPayload());
  }

  let insightsStatus: number | null = null;
  let insightsData: Record<string, unknown> | null = null;

  try {
    const insightsUrl =
      `${qlooApiUrl}/v2/insights` +
      `?filter.type=urn:entity:artist` +
      `&signal.interests.entities=${encodeURIComponent(entityId)}` +
      `&limit=5`;
    const insightsRes = await fetch(insightsUrl, {
      method: "GET",
      headers: { "X-Api-Key": qlooApiKey },
    });
    insightsStatus = insightsRes.status;
    console.log("Qloo /v2/insights status:", insightsStatus);

    if (!insightsRes.ok) {
      const text = await insightsRes.text();
      console.error("Qloo /v2/insights non-2xx:", insightsStatus, text.slice(0, 500));
      return NextResponse.json(fallbackPayload());
    }

    insightsData = (await insightsRes.json()) as Record<string, unknown>;
    const preview = JSON.stringify(insightsData).slice(0, 500);
    console.log("Qloo /v2/insights preview:", preview);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Qloo /v2/insights threw:", err.message);
    const cause2 = (err as { cause?: unknown }).cause; if (cause2) console.error("Qloo /v2/insights cause:", cause2);
    return NextResponse.json(fallbackPayload());
  }

  const tracks = extractTracks(insightsData);
  const evidence = collectEvidence(insightsData);
  const mapped = mapFromEvidence(evidence);

  const payload: VibePayload = {
    primaryColorHex: mapped.primaryColorHex,
    accentColorHex: mapped.accentColorHex,
    lightingTemperatureK: mapped.lightingTemperatureK,
    flooringMaterial: mapped.flooringMaterial,
    seatingFabric: mapped.seatingFabric,
    tracks,
    menu:
      tracks.length > 0
        ? `Qloo insights returned ${tracks.length} item(s) for "${entityName}".`
        : `Qloo insights returned no usable music entities for "${entityName}".`,
    fallback: false,
    reasoning: {
      source: mapped.source,
      evidence: mapped.evidence,
      rules: mapped.rules,
    },
  };

  void sliderVal;
  void searchStatus;
  void insightsStatus;

  return NextResponse.json(payload);
}
