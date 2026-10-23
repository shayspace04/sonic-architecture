import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSceneSpec } from "../lib/scene-spec";
import { localFallbackPayload } from "../lib/fallback";

test("Test A — Japanese jazz listening room produces intimate acoustic space", () => {
  const prompt =
    "A Japanese jazz listening room at midnight. Intimate and quietly luxurious, with warm timber, considered acoustic treatments, analog audio equipment, comfortable listening seats, restrained Japanese-inspired detailing, layered low-level lighting, and a carefully composed listening focal point. Keep the space tactile and sophisticated, not stereotypically themed.";
  const vibe = localFallbackPayload(["Japanese jazz", "dark timber", "audiophile"], ["Test A"]);
  const spec = generateSceneSpec(prompt, vibe);

  assert.equal(spec.typology, "listening_room");
  assert.equal(spec.roomDimensions.height, 3.4);
  assert.equal(spec.ceilingStructure, "acoustic_coffered");
  assert.equal(spec.wallArchitecture, "timber_slats");
  assert.equal(spec.floorFinish, "warm_oak");
  assert.ok(spec.objects.length >= 8);
  assert.ok(spec.objects.some((o) => o.id.includes("turntable") || o.id.includes("console")));
  assert.ok(spec.objects.some((o) => o.id.includes("speaker")));
  assert.ok(spec.eventCapacity);
  assert.equal(spec.eventCapacity.layoutMode, "lounge");
});

test("Test B — Futuristic product launch produces high-ceiling presentation stage", () => {
  const prompt =
    "A premium futuristic launch venue for unveiling a next-generation electric vehicle. Create a spacious, high-ceilinged presentation environment with a central illuminated product plinth, a dramatic architectural backdrop, audience seating with clear sightlines, restrained metallic finishes, controlled architectural lighting, and organized guest circulation.";
  const vibe = localFallbackPayload(["futuristic vehicle launch", "monolith", "cyber"], ["Test B"]);
  const spec = generateSceneSpec(prompt, vibe);

  assert.equal(spec.typology, "futuristic_launch");
  assert.equal(spec.roomDimensions.height, 6.0);
  assert.equal(spec.ceilingStructure, "concrete_beams");
  assert.equal(spec.floorFinish, "glossy_concrete");
  assert.ok(spec.roomDimensions.width * spec.roomDimensions.depth > 300);
  assert.ok(spec.objects.some((o) => o.id.includes("plinth")));
  assert.ok(spec.objects.some((o) => o.id.includes("bench") || o.id.includes("canopy")));
  assert.ok(spec.eventCapacity);
  assert.equal(spec.eventCapacity.layoutMode, "theatre");
});

test("Test C — Cathedral-inspired banquet produces high-volume timber hall", () => {
  const prompt =
    "An elegant candlelit banquet in a cathedral-inspired hall. Create a high and ceremonially proportioned interior, with appropriate arches or vertical architectural rhythms, warm stone, a refined banquet layout, carefully arranged tables and chairs, floral or candlelit centrepieces, and layered warm lighting. Maintain practical guest circulation and a restrained, sophisticated atmosphere.";
  const vibe = localFallbackPayload(["cathedral banquet", "wedding", "timber trusses"], ["Test C"]);
  const spec = generateSceneSpec(prompt, vibe);

  assert.equal(spec.typology, "grand_hall");
  assert.equal(spec.roomDimensions.height, 7.2);
  assert.equal(spec.ceilingStructure, "cathedral_truss");
  assert.equal(spec.wallArchitecture, "arched_colonnade");
  assert.equal(spec.floorFinish, "polished_stone");
  assert.ok(spec.objects.some((o) => o.id.includes("chandelier")));
  assert.ok(spec.objects.some((o) => o.id.includes("banquet-table") || o.id.includes("table")));
  assert.ok(spec.objects.some((o) => o.id.includes("arch") || o.id.includes("altar")));
  assert.ok(spec.eventCapacity);
  assert.equal(spec.eventCapacity.layoutMode, "banquet");
});

test("All three test typologies differ substantially in geometry, volume, and ceiling", () => {
  const vibe = localFallbackPayload(["test"], ["Neutral"]);
  const sA = generateSceneSpec("Japanese jazz listening room", vibe);
  const sB = generateSceneSpec("Futuristic product launch", vibe);
  const sC = generateSceneSpec("Cathedral banquet hall", vibe);

  // Volumes must differ substantially
  const volA = sA.roomDimensions.width * sA.roomDimensions.depth * sA.roomDimensions.height;
  const volB = sB.roomDimensions.width * sB.roomDimensions.depth * sB.roomDimensions.height;
  const volC = sC.roomDimensions.width * sC.roomDimensions.depth * sC.roomDimensions.height;

  assert.notEqual(volA, volB);
  assert.notEqual(volB, volC);
  assert.notEqual(sA.ceilingStructure, sB.ceilingStructure);
  assert.notEqual(sB.ceilingStructure, sC.ceilingStructure);
  assert.notEqual(sA.floorFinish, sB.floorFinish);
});

test("Dynamic Qloo flooring & seating fabric mutation infuses evidence into scene objects", () => {
  const vibe = localFallbackPayload(["lounge"], ["Neutral"]);
  vibe.fallback = false;
  vibe.flooringMaterial = "Herringbone Bog Oak Parquet";
  vibe.seatingFabric = "Crushed Mohair Velvet";

  const spec = generateSceneSpec("mid-century cocktail lounge", vibe);
  assert.equal(spec.qlooFlooring, "Herringbone Bog Oak Parquet");
  assert.equal(spec.floorFinish, "warm_oak");

  const seats = spec.objects.filter((o) => o.kind === "seat");
  assert.ok(seats.length > 0);
  for (const s of seats) {
    assert.ok(s.material.includes("Crushed Mohair Velvet"));
  }
});

test("Conversational design revisions and capacity overrides mutate specification accurately", () => {
  const vibe = localFallbackPayload(["test"], ["Neutral"]);
  const spec = generateSceneSpec("Japanese jazz listening room", vibe, {
    layoutMode: "theatre",
    guestCount: 150,
    ceilingHeightDelta: 1.5,
    wallFinishOverride: "gallery_white",
  });

  assert.equal(spec.roomDimensions.height, 4.9); // 3.4 + 1.5
  assert.equal(spec.wallFinish, "gallery_white");
  assert.equal(spec.eventCapacity?.layoutMode, "theatre");
  assert.equal(spec.eventCapacity?.guests, 150);
});
