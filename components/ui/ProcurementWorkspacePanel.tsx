"use client";

import React, { useMemo, useState } from "react";
import type {
  CurrencyCode,
  ObjectCategory,
  ProcurementLineItem,
  ProjectBudgetConfig,
  SceneSpec,
  SourcingMethod,
  SpatialObject,
} from "@/lib/types";
import {
  calculateProcurementSummary,
  convertFromUSD,
  deriveObjectProcurementMetadata,
  exportProcurementBriefMarkdown,
  exportProcurementCSV,
  exportProcurementJSON,
  formatCurrency,
  GLOBAL_LOCATION_PRESETS,
  matchRealWorldProductsForObject,
  parseLocationString,
  upsertProcurementLineItem,
} from "@/lib/procurement";

export interface ProcurementWorkspacePanelProps {
  sceneSpec: SceneSpec;
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  budgetConfig: ProjectBudgetConfig;
  onUpdateBudgetConfig: (next: ProjectBudgetConfig) => void;
  procurementList: ProcurementLineItem[];
  onUpdateProcurementList: (next: ProcurementLineItem[]) => void;
  onSwitchTo3D?: () => void;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type AssemblyCategoryFilter = "all" | ObjectCategory;

export default function ProcurementWorkspacePanel({
  sceneSpec,
  selectedObjectId,
  onSelectObject,
  budgetConfig,
  onUpdateBudgetConfig,
  procurementList,
  onUpdateProcurementList,
  onSwitchTo3D,
}: ProcurementWorkspacePanelProps) {
  const [activeMethod, setActiveMethod] = useState<SourcingMethod>("rent");
  const [categoryFilter, setCategoryFilter] = useState<AssemblyCategoryFilter>("all");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [customCity, setCustomCity] = useState("");
  const [customRegion, setCustomRegion] = useState("");
  const [customCountry, setCustomCountry] = useState("");

  // Clean, deduplicated scene objects suitable for real-world sourcing
  const sourceableObjects = useMemo(
    () => sceneSpec.objects.filter((o) => o && o.name),
    [sceneSpec.objects]
  );

  // Grouped objects by category for category filter pills
  const filteredObjects = useMemo(() => {
    if (categoryFilter === "all") return sourceableObjects;
    return sourceableObjects.filter((o) => o.category === categoryFilter);
  }, [sourceableObjects, categoryFilter]);

  const selectedObj = useMemo(
    () =>
      sourceableObjects.find((o) => o.id === selectedObjectId) ||
      filteredObjects[0] ||
      sourceableObjects[0] ||
      null,
    [sourceableObjects, filteredObjects, selectedObjectId]
  );

  const objectMeta = useMemo(
    () => (selectedObj ? deriveObjectProcurementMetadata(selectedObj, sceneSpec) : null),
    [selectedObj, sceneSpec]
  );

  const allMatches = useMemo(
    () =>
      selectedObj
        ? matchRealWorldProductsForObject(
            selectedObj,
            sceneSpec,
            budgetConfig,
            procurementList
          )
        : [],
    [selectedObj, sceneSpec, budgetConfig, procurementList]
  );

  const methodMatches = useMemo(
    () => allMatches.filter((m) => m.sourcingMethod === activeMethod),
    [allMatches, activeMethod]
  );

  const summary = useMemo(
    () => calculateProcurementSummary(procurementList, budgetConfig),
    [procurementList, budgetConfig]
  );

  const parsedLoc = useMemo(
    () => parseLocationString(budgetConfig.location),
    [budgetConfig.location]
  );

  const handlePresetLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "custom") {
      setIsEditingLocation(true);
      setCustomCity(parsedLoc.city);
      setCustomRegion(parsedLoc.region);
      setCustomCountry(parsedLoc.country);
      return;
    }
    const preset = GLOBAL_LOCATION_PRESETS.find((p) => p.id === val);
    if (preset) {
      setIsEditingLocation(false);
      onUpdateBudgetConfig({
        ...budgetConfig,
        location: preset.name,
        currency: preset.defaultCurrency,
      });
    }
  };

  const handleApplyCustomLocation = () => {
    const cleanCity = customCity.trim() || "Global";
    const cleanReg = customRegion.trim();
    const cleanCountry = customCountry.trim() || "International";
    const formatted = cleanReg ? `${cleanCity}, ${cleanReg}, ${cleanCountry}` : `${cleanCity}, ${cleanCountry}`;
    setIsEditingLocation(false);
    onUpdateBudgetConfig({
      ...budgetConfig,
      location: formatted,
    });
  };

  const handleUpdateLineQty = (objectId: string, delta: number) => {
    const existing = procurementList.find((i) => i.objectId === objectId);
    if (!existing) return;
    const nextQty = existing.quantity + delta;
    if (nextQty <= 0) {
      onUpdateProcurementList(procurementList.filter((i) => i.objectId !== objectId));
    } else {
      const dur = existing.pricingPeriod === "per_day" ? Math.max(1, budgetConfig.rentalDurationDays) : 1;
      const unit = existing.unitPriceInCurrency;
      onUpdateProcurementList(
        procurementList.map((i) =>
          i.objectId === objectId
            ? {
                ...i,
                quantity: nextQty,
                lineTotalInCurrency: unit * nextQty * dur,
              }
            : i
        )
      );
    }
  };

  const handleRemoveFromBOQ = (objectId: string) => {
    onUpdateProcurementList(procurementList.filter((i) => i.objectId !== objectId));
  };

  const handleCopyBrief = () => {
    const md = exportProcurementBriefMarkdown(summary, sceneSpec);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(md)
        .then(() => {
          setCopyFeedback("Markdown brief copied to clipboard!");
          setTimeout(() => setCopyFeedback(null), 3000);
        })
        .catch(() => {
          try {
            const ta = document.createElement("textarea");
            ta.value = md;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            setCopyFeedback("Markdown brief copied to clipboard!");
            setTimeout(() => setCopyFeedback(null), 3000);
          } catch {
            setCopyFeedback("Clipboard access denied");
            setTimeout(() => setCopyFeedback(null), 3000);
          }
        });
    }
  };

  const handleDownloadCSV = () => {
    const csv = exportProcurementCSV(summary);
    const cleanTitle = (sceneSpec.title || "sonic-architecture").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadFile(csv, `${cleanTitle}-procurement-boq.csv`, "text/csv;charset=utf-8;");
  };

  const handleDownloadJSON = () => {
    const json = exportProcurementJSON(summary);
    const cleanTitle = (sceneSpec.title || "sonic-architecture").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadFile(json, `${cleanTitle}-procurement-boq.json`, "application/json");
  };

  const handleDownloadMarkdown = () => {
    const md = exportProcurementBriefMarkdown(summary, sceneSpec);
    const cleanTitle = (sceneSpec.title || "sonic-architecture").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadFile(md, `${cleanTitle}-procurement-brief.md`, "text/markdown;charset=utf-8;");
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: sourceableObjects.length };
    for (const obj of sourceableObjects) {
      counts[obj.category] = (counts[obj.category] || 0) + 1;
    }
    return counts;
  }, [sourceableObjects]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans text-[#171A1F]">
      {/* =========================================================================
          SECTION A: PROJECT CONTEXT & LOCATION PARAMETERS
         ========================================================================= */}
      <section className="bg-[#FCFAF7] border border-[#171A1F]/15 rounded-lg p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#171A1F]/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-widest text-[#D9532B] font-bold">
                SECTION 01 / PROJECT CONTEXT
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#171A1F] text-[#EEE8DC]">
                {sceneSpec.typology.replace(/_/g, " ")}
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#171A1F] mt-1">
              Vendor Directory, Sourcing Workflows &amp; Bill of Quantities (BOQ)
            </h2>
            <p className="font-sans text-xs sm:text-sm text-[#5B5F66] mt-1 max-w-3xl">
              Active project: <strong>&ldquo;{sceneSpec.promptText || sceneSpec.title}&rdquo;</strong> · Footprint:{" "}
              {sceneSpec.roomDimensions?.width ?? 14}m × {sceneSpec.roomDimensions?.depth ?? 10}m ×{" "}
              {sceneSpec.roomDimensions?.height ?? 3.4}m · Target RT60:{" "}
              {sceneSpec.acousticTarget?.targetRT60Seconds ?? 0.42}s · Sabine:{" "}
              {sceneSpec.acousticTarget?.calculatedRT60Seconds ?? sceneSpec.acousticTarget?.targetRT60Seconds ?? 0.42}s
            </p>
          </div>

          <div className="font-mono text-xs text-right hidden lg:block">
            <div className="text-[10px] uppercase text-[#737882]">Sourcing Status</div>
            <div className="text-emerald-700 font-bold mt-0.5">
              ● Active Hub: {parsedLoc.city}, {parsedLoc.country}
            </div>
          </div>
        </div>

        {/* Global Controls Grid: Location, Currency, Rental Duration, Total Budget */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          {/* 1. Location Preset Dropdown */}
          <div className="flex flex-col gap-1.5 bg-white p-3 border border-[#171A1F]/15 rounded">
            <label htmlFor="procurement-location-select" className="text-[10px] uppercase text-[#737882] font-semibold">
              Project Location Hub
            </label>
            <select
              id="procurement-location-select"
              value={
                GLOBAL_LOCATION_PRESETS.some((p) => p.name === budgetConfig.location)
                  ? GLOBAL_LOCATION_PRESETS.find((p) => p.name === budgetConfig.location)?.id
                  : "custom"
              }
              onChange={handlePresetLocationChange}
              className="w-full px-2.5 py-1.5 bg-white border border-[#171A1F]/20 text-xs rounded focus:outline-none focus:border-[#D9532B]"
            >
              <optgroup label="International Hubs">
                {GLOBAL_LOCATION_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} ({preset.defaultCurrency})
                  </option>
                ))}
              </optgroup>
              <option value="custom">✏️ Custom Location...</option>
            </select>
            <span className="text-[10px] text-[#737882]">Updates regional vendor directory</span>
          </div>

          {/* 2. Currency Selector */}
          <div className="flex flex-col gap-1.5 bg-white p-3 border border-[#171A1F]/15 rounded">
            <label htmlFor="procurement-currency-select" className="text-[10px] uppercase text-[#737882] font-semibold">
              Project Currency
            </label>
            <select
              id="procurement-currency-select"
              value={budgetConfig.currency}
              onChange={(e) =>
                onUpdateBudgetConfig({
                  ...budgetConfig,
                  currency: e.target.value as CurrencyCode,
                })
              }
              className="w-full px-2.5 py-1.5 bg-white border border-[#171A1F]/20 text-xs rounded focus:outline-none focus:border-[#D9532B]"
            >
              <option value="INR">INR (₹) — Indian Rupee</option>
              <option value="USD">USD ($) — US Dollar</option>
              <option value="EUR">EUR (€) — Euro</option>
              <option value="GBP">GBP (£) — British Pound</option>
              <option value="JPY">JPY (¥) — Japanese Yen</option>
            </select>
            <span className="text-[10px] text-[#737882]">Fixed benchmark conversion</span>
          </div>

          {/* 3. Rental Duration (Days) */}
          <div className="flex flex-col gap-1.5 bg-white p-3 border border-[#171A1F]/15 rounded">
            <label htmlFor="procurement-duration-input" className="text-[10px] uppercase text-[#737882] font-semibold">
              Rental Duration Window
            </label>
            <div className="flex items-center gap-2">
              <input
                id="procurement-duration-input"
                type="number"
                min={1}
                max={60}
                value={budgetConfig.rentalDurationDays}
                onChange={(e) =>
                  onUpdateBudgetConfig({
                    ...budgetConfig,
                    rentalDurationDays: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
                className="w-full px-2.5 py-1.5 bg-white border border-[#171A1F]/20 text-xs rounded focus:outline-none focus:border-[#D9532B]"
              />
              <span className="text-xs text-[#5B5F66] font-medium">days</span>
            </div>
            <span className="text-[10px] text-[#737882]">Applies to AV &amp; staging rentals</span>
          </div>

          {/* 4. Total Project Budget */}
          <div className="flex flex-col gap-1.5 bg-white p-3 border border-[#171A1F]/15 rounded">
            <label htmlFor="procurement-budget-input" className="text-[10px] uppercase text-[#737882] font-semibold">
              Target Project Budget
            </label>
            <input
              id="procurement-budget-input"
              type="number"
              step={1000}
              min={1000}
              value={budgetConfig.totalBudget}
              onChange={(e) =>
                onUpdateBudgetConfig({
                  ...budgetConfig,
                  totalBudget: Math.max(1000, parseInt(e.target.value, 10) || 1000),
                })
              }
              className="w-full px-2.5 py-1.5 bg-white border border-[#171A1F]/20 text-xs rounded focus:outline-none focus:border-[#D9532B]"
            />
            <span className="text-[10px] text-[#737882]">
              Cap: {formatCurrency(budgetConfig.totalBudget, budgetConfig.currency)}
            </span>
          </div>
        </div>

        {/* Custom Location Drawer (revealed when user selects "custom") */}
        {isEditingLocation && (
          <div className="p-4 bg-white border border-[#D9532B]/40 rounded-lg flex flex-wrap items-center gap-3 text-xs font-mono shadow-sm">
            <span className="text-[#D9532B] font-bold uppercase text-[11px]">
              Specify Custom Geographic Dispatch:
            </span>
            <input
              type="text"
              placeholder="City / Municipality"
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
              className="px-2.5 py-1.5 border border-[#171A1F]/20 rounded text-xs"
            />
            <input
              type="text"
              placeholder="State / Province / Region"
              value={customRegion}
              onChange={(e) => setCustomRegion(e.target.value)}
              className="px-2.5 py-1.5 border border-[#171A1F]/20 rounded text-xs"
            />
            <input
              type="text"
              placeholder="Country"
              value={customCountry}
              onChange={(e) => setCustomCountry(e.target.value)}
              className="px-2.5 py-1.5 border border-[#171A1F]/20 rounded text-xs"
            />
            <button
              type="button"
              onClick={handleApplyCustomLocation}
              className="px-3.5 py-1.5 bg-[#2F5A4C] hover:bg-[#25483D] text-white rounded font-mono uppercase text-[11px] font-semibold"
            >
              Apply Location
            </button>
            <button
              type="button"
              onClick={() => setIsEditingLocation(false)}
              className="px-2.5 py-1.5 text-[#737882] hover:text-[#171A1F] text-[11px]"
            >
              Cancel
            </button>
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION B: SOURCING METHOD & WORKFLOW (BUY / RENT / CUSTOM)
         ========================================================================= */}
      <section className="bg-white border border-[#171A1F]/15 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#171A1F]/10 pb-3">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-widest text-[#D9532B] font-bold">
              SECTION 02 / SOURCING METHOD
            </span>
            <h3 className="font-serif text-xl sm:text-2xl text-[#171A1F] mt-0.5">
              Select Procurement Workflow
            </h3>
          </div>
          <div className="font-mono text-xs text-[#737882]">
            Active Method: <strong className="uppercase text-[#171A1F]">{activeMethod}</strong>
          </div>
        </div>

        {/* 3 Primary Sourcing Method Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(["buy", "rent", "custom"] as SourcingMethod[]).map((method) => {
            const isActive = activeMethod === method;
            return (
              <button
                key={method}
                type="button"
                onClick={() => setActiveMethod(method)}
                className={`p-3.5 rounded-lg border text-left font-mono transition-all flex flex-col justify-between gap-2 ${
                  isActive
                    ? "bg-[#D9532B] text-white border-[#D9532B] shadow-md ring-2 ring-[#D9532B]/30"
                    : "bg-[#FCFAF7] text-[#171A1F] border-[#171A1F]/15 hover:border-[#171A1F]/30 hover:bg-[#F2ECE1]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold tracking-wider">
                    {method === "buy"
                      ? "🛒 Purchase (Buy)"
                      : method === "rent"
                      ? "🎪 Equipment Rental"
                      : "🔨 Bespoke Fabrication"}
                  </span>
                  {isActive && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">Active</span>}
                </div>
                <p className={`text-[11px] leading-relaxed ${isActive ? "text-white/90" : "text-[#5B5F66]"}`}>
                  {method === "buy" && "Procure permanent commercial catalog inventory & materials."}
                  {method === "rent" && `Lease pro-AV staging & acoustic hardware for ${budgetConfig.rentalDurationDays} days.`}
                  {method === "custom" && "Commission custom millwork, joinery, and architectural fixtures."}
                </p>
              </button>
            );
          })}
        </div>

        {/* Mode-Specific Explanatory Guidance Banner */}
        <div className="p-3 bg-[#FCFAF7] border border-[#171A1F]/10 rounded font-mono text-xs text-[#5B5F66] flex items-center gap-2">
          <span className="text-[#D9532B] font-bold">ℹ</span>
          {activeMethod === "buy" && (
            <span>
              <strong>Purchase Mode:</strong> Evaluating commercial catalog options with freight lead time to{" "}
              <strong>{parsedLoc.city}</strong>. Product line totals reflect unit price × recommended quantity.
            </span>
          )}
          {activeMethod === "rent" && (
            <span>
              <strong>Rental Mode:</strong> Sourcing regional staging &amp; pro-audio inventory for a{" "}
              <strong>{budgetConfig.rentalDurationDays}-day</strong> event window near{" "}
              <strong>{parsedLoc.city}</strong>. Subtotals calculate: daily rate × quantity × {budgetConfig.rentalDurationDays} days.
            </span>
          )}
          {activeMethod === "custom" && (
            <span>
              <strong>Bespoke Fabrication Mode:</strong> Generating architectural shop drawing specs for local joinery/millwork workshops in{" "}
              <strong>{parsedLoc.region || parsedLoc.country}</strong>. Prices reflect benchmark craft estimates.
            </span>
          )}
        </div>
      </section>

      {/* =========================================================================
          SECTION C: SCENE ASSEMBLIES & AVAILABLE SOURCING TIERS
         ========================================================================= */}
      <section className="bg-white border border-[#171A1F]/15 rounded-lg p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#171A1F]/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-widest text-[#D9532B] font-bold">
                SECTION 03 / SCENE ASSEMBLIES &amp; SOURCING TIERS
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-900 text-emerald-200">
                {sourceableObjects.length} Generated Assemblies
              </span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl text-[#171A1F] mt-1">
              Select Assembly &amp; Review Available Sourcing Options
            </h3>
            <p className="font-sans text-xs text-[#5B5F66] mt-0.5">
              Choose an architectural assembly from the current scene to inspect its specification matches across Economy, Recommended, and Premium tiers.
            </p>
          </div>

          {/* Distinction Callout */}
          <div className="font-mono text-[11px] bg-[#FCFAF7] border border-[#171A1F]/15 px-3 py-1.5 rounded text-[#5B5F66]">
            <span>In Scene: <strong>{sourceableObjects.length}</strong></span>
            <span className="mx-2">·</span>
            <span>Committed in BOQ: <strong className="text-emerald-700">{procurementList.length}</strong></span>
          </div>
        </div>

        {/* Category Filter Pills for Scene Assemblies */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-[#737882] uppercase mr-1">Filter Assemblies:</span>
          {[
            { id: "all", label: "All Assemblies" },
            { id: "Furniture", label: "Furniture" },
            { id: "Lighting", label: "Lighting" },
            { id: "Architecture", label: "Architecture" },
            { id: "Structure", label: "Structure" },
            { id: "Decoration", label: "Decoration" },
            { id: "Planting", label: "Planting" },
            { id: "Event Installations", label: "Event Installations" },
          ].map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            if (cat.id !== "all" && count === 0) return null;
            const isSelected = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id as AssemblyCategoryFilter)}
                className={`font-mono text-[11px] px-3 py-1 rounded-full border transition-all ${
                  isSelected
                    ? "bg-[#171A1F] text-white border-[#171A1F] shadow-sm font-semibold"
                    : "bg-[#FCFAF7] text-[#5B5F66] border-[#171A1F]/15 hover:border-[#171A1F]/30"
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Scene Assemblies Selection Grid (Open, Unnested Layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredObjects.map((obj) => {
            const isSelected = selectedObj?.id === obj.id;
            const isInBOQ = procurementList.some((item) => item.objectId === obj.id);
            return (
              <div
                key={obj.id}
                onClick={() => onSelectObject(obj.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all border flex flex-col justify-between gap-2 ${
                  isSelected
                    ? "bg-[#2F5A4C] border-emerald-400 text-white shadow-md ring-2 ring-emerald-500/30"
                    : "bg-[#FCFAF7] border-[#171A1F]/15 hover:border-[#171A1F]/40 text-[#171A1F]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className={`uppercase tracking-wider ${isSelected ? "text-emerald-200" : "text-[#737882]"}`}>
                      {obj.category}
                    </span>
                    {isInBOQ && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        isSelected ? "bg-emerald-950 text-emerald-300 border border-emerald-700" : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      }`}>
                        ✓ In BOQ
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-xs mt-1 leading-snug">{obj.name}</div>
                </div>

                <div className={`font-mono text-[10px] flex items-center justify-between pt-1 border-t ${
                  isSelected ? "border-white/20 text-white/80" : "border-[#171A1F]/10 text-[#737882]"
                }`}>
                  <span>{obj.dimensions.map((d) => Number(d).toFixed(1)).join(" × ")}m</span>
                  <span className="capitalize truncate max-w-[100px]">{obj.materialId.replace(/_/g, " ")}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Currently Inspecting Assembly Bar */}
        {selectedObj && objectMeta && (
          <div className="p-4 bg-[#FCFAF7] border border-[#171A1F]/20 rounded-lg flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#D9532B] text-white rounded text-[10px] uppercase font-bold">
                  Inspecting Assembly
                </span>
                <strong className="text-sm text-[#171A1F]">{selectedObj.name}</strong>
              </div>
              <div className="text-[11px] text-[#5B5F66]">
                Dimensions: {objectMeta.dimensionsMeters.join("m × ")}m · Material: {objectMeta.materialName} ({objectMeta.finish}) · Rec. Qty: {objectMeta.quantity} unit(s)
              </div>
            </div>

            {onSwitchTo3D && (
              <button
                type="button"
                onClick={onSwitchTo3D}
                className="px-3 py-1.5 bg-[#171A1F] hover:bg-black text-[#EEE8DC] rounded font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <span>Focus in 3D</span>
                <span aria-hidden="true">↗</span>
              </button>
            )}
          </div>
        )}

        {/* 3 Sourcing Option Cards (Economy, Recommended, Premium) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between font-mono text-xs text-[#737882]">
            <span>Available Tiers for: <strong>{selectedObj?.name || "Selected Assembly"}</strong></span>
            <span>Location: <strong>{budgetConfig.location}</strong></span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {methodMatches.map((opt) => {
              const isInBOQ = procurementList.some(
                (item) => item.objectId === opt.objectId && item.selectedOption.id === opt.id
              );
              return (
                <div
                  key={opt.id}
                  className={`border rounded-lg p-5 flex flex-col justify-between space-y-4 transition-all ${
                    opt.tier === "recommended"
                      ? "bg-[#FCFAF7] border-[#2F5A4C]/60 shadow-md ring-1 ring-[#2F5A4C]/30"
                      : "bg-white border-[#171A1F]/15 hover:border-[#171A1F]/30 shadow-sm"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Tier + Match Score */}
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className={`uppercase px-2.5 py-0.5 rounded font-bold tracking-wider ${
                        opt.tier === "recommended"
                          ? "bg-[#2F5A4C] text-white"
                          : opt.tier === "premium"
                          ? "bg-[#171A1F] text-white"
                          : "bg-[#737882] text-white"
                      }`}>
                        {opt.tier} Tier
                      </span>
                      <span className="text-[#2F5A4C] font-bold text-xs">
                        {opt.matchScorePct}% Spec Match
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="font-semibold text-sm sm:text-base text-[#171A1F] leading-snug">
                      {opt.title}
                    </h4>

                    {/* Pricing Readout */}
                    <div className="font-mono bg-[#FCFAF7] p-3 rounded border border-[#171A1F]/10 space-y-1">
                      <div className="text-lg text-[#D9532B] font-bold">
                        {formatCurrency(opt.estimatedLineTotalInUserCurrency, budgetConfig.currency)}
                      </div>
                      <div className="text-[10px] text-[#737882] leading-tight">
                        Unit Rate: {formatCurrency(convertFromUSD(opt.unitPriceUSD, budgetConfig.currency), budgetConfig.currency)}
                        {opt.pricingPeriod === "per_day"
                          ? ` / day × ${budgetConfig.rentalDurationDays}d × ${opt.recommendedQuantity} units`
                          : ` (${opt.pricingPeriod}) × ${opt.recommendedQuantity} units`}
                      </div>
                    </div>

                    {/* Fit & Verification Status Note */}
                    <p className="text-xs text-[#5B5F66] leading-relaxed">
                      {opt.budgetFitExplanation}
                    </p>

                    {/* Vendor and Region Details */}
                    <div className="font-mono text-[10px] bg-neutral-100 p-2.5 rounded text-[#171A1F] space-y-1">
                      <div className="font-semibold truncate">Supplier: {opt.supplierName}</div>
                      <div className="text-[#737882] truncate">Region: {opt.supplierRegion}</div>
                      <div className="text-amber-900 font-medium">Status: {opt.priceStatus.replace(/_/g, " ")}</div>
                    </div>
                  </div>

                  {/* Action Buttons: Links & Save to BOQ */}
                  <div className="space-y-2 pt-3 border-t border-[#171A1F]/10">
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={opt.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-center py-2 bg-[#EEE8DC] hover:bg-[#E4DDD0] font-mono text-[10px] uppercase rounded font-semibold transition-colors truncate px-1"
                      >
                        Supplier Page ↗
                      </a>
                      <a
                        href={opt.supplierSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-center py-2 bg-[#EEE8DC] hover:bg-[#E4DDD0] font-mono text-[10px] uppercase rounded font-semibold transition-colors truncate px-1"
                      >
                        Search Local ↗
                      </a>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateProcurementList(
                          upsertProcurementLineItem(
                            procurementList,
                            opt,
                            selectedObj?.category || "furniture",
                            objectMeta?.quantity || 1,
                            budgetConfig.rentalDurationDays
                          )
                        )
                      }
                      className={`w-full py-2.5 font-mono text-xs uppercase rounded font-bold transition-all shadow-sm ${
                        isInBOQ
                          ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                          : "bg-[#2F5A4C] hover:bg-[#25483D] text-white"
                      }`}
                    >
                      {isInBOQ ? "✓ Update in Project BOQ" : "+ Save to Project BOQ"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION D: PROJECT BILL OF QUANTITIES (BOQ)
         ========================================================================= */}
      <section className="bg-white border border-[#171A1F]/20 rounded-lg p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#171A1F]/15 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-widest text-[#D9532B] font-bold">
                SECTION 04 / PROJECT BILL OF QUANTITIES (BOQ)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#171A1F] text-white font-mono text-[10px] font-bold">
                {summary.items.length} Committed Assemblies
              </span>
            </div>
            <h3 className="font-serif text-2xl text-[#171A1F] mt-1">
              Cost Allocation &amp; Project Procurement List
            </h3>
            <p className="font-sans text-xs text-[#5B5F66] mt-0.5">
              Scene contains <strong>{sourceableObjects.length}</strong> architectural assemblies. Currently{" "}
              <strong>{summary.items.length}</strong> items are committed to the project procurement budget.
            </p>
          </div>

          {/* Export Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {copyFeedback && (
              <span className="text-emerald-700 font-semibold text-[11px] animate-fade-in mr-2">
                ✓ {copyFeedback}
              </span>
            )}
            <button
              type="button"
              onClick={handleCopyBrief}
              className="px-3 py-1.5 bg-[#EEE8DC] hover:bg-[#E4DDD0] border border-[#171A1F]/20 rounded uppercase text-[10px] font-semibold transition-colors"
            >
              Copy Brief (MD)
            </button>
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 bg-[#EEE8DC] hover:bg-[#E4DDD0] border border-[#171A1F]/20 rounded uppercase text-[10px] font-semibold transition-colors"
            >
              Download CSV
            </button>
            <button
              type="button"
              onClick={handleDownloadJSON}
              className="px-3 py-1.5 bg-[#EEE8DC] hover:bg-[#E4DDD0] border border-[#171A1F]/20 rounded uppercase text-[10px] font-semibold transition-colors"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="px-3 py-1.5 bg-[#171A1F] hover:bg-black text-white rounded uppercase text-[10px] font-semibold transition-colors"
            >
              Download BOQ (.md)
            </button>
          </div>
        </div>

        {/* Dynamic Budget Utilization Bar & Breakdown Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-[#FCFAF7] p-5 rounded-lg border border-[#171A1F]/10 font-mono text-xs">
          <div>
            <div className="text-[10px] uppercase text-[#737882]">Purchase (Buy) Total</div>
            <div className="text-lg font-bold text-[#171A1F] mt-0.5">
              {formatCurrency(summary.buySubtotal, summary.currency)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-[#737882]">
              Rental Total ({summary.rentalDurationDays} Days)
            </div>
            <div className="text-lg font-bold text-[#171A1F] mt-0.5">
              {formatCurrency(summary.rentSubtotal, summary.currency)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-[#737882]">Custom Fabrication Total</div>
            <div className="text-lg font-bold text-[#171A1F] mt-0.5">
              {formatCurrency(summary.customSubtotal, summary.currency)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-[#737882]">
              Grand Estimated Total / Budget
            </div>
            <div className="text-lg font-bold text-[#D9532B] mt-0.5">
              {formatCurrency(summary.grandTotalEstimated, summary.currency)} / {formatCurrency(summary.totalBudget, summary.currency)}
            </div>
            <div className="text-[10px] text-[#737882] mt-1">
              Utilization: {summary.budgetUtilizationPct}% (
              {summary.remainingBudget >= 0
                ? `${formatCurrency(summary.remainingBudget, summary.currency)} remaining`
                : `Over budget by ${formatCurrency(Math.abs(summary.remainingBudget), summary.currency)}`}
              )
            </div>
          </div>
        </div>

        {/* Budget Utilization Visual Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between font-mono text-[10px] text-[#737882]">
            <span>Budget Utilization: {summary.budgetUtilizationPct}%</span>
            <span>Target: {formatCurrency(summary.totalBudget, summary.currency)}</span>
          </div>
          <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                summary.budgetUtilizationPct > 100
                  ? "bg-red-600"
                  : summary.budgetUtilizationPct > 85
                  ? "bg-amber-600"
                  : "bg-[#2F5A4C]"
              }`}
              style={{ width: `${Math.min(100, summary.budgetUtilizationPct)}%` }}
            />
          </div>
        </div>

        {/* Committed BOQ Items Table (Clear, Unnested Full-Width Display) */}
        {summary.items.length === 0 ? (
          <div className="p-8 text-center text-sm font-sans text-[#737882] italic bg-[#EEE8DC]/20 border border-dashed border-[#171A1F]/20 rounded-lg">
            No assemblies saved to your Project BOQ yet. Select an assembly above and click &ldquo;+ Save to Project BOQ&rdquo; to build your budget.
          </div>
        ) : (
          <div className="overflow-x-auto rounded border border-[#171A1F]/15">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#171A1F]/20 text-[10px] uppercase text-[#737882] tracking-wider bg-[#FCFAF7]">
                  <th className="py-3 px-3">Assembly &amp; Category</th>
                  <th className="py-3 px-3">Selected Match &amp; Tier</th>
                  <th className="py-3 px-3 text-center">Method</th>
                  <th className="py-3 px-3 text-center">Quantity</th>
                  <th className="py-3 px-3 text-right">Unit Price</th>
                  <th className="py-3 px-3 text-right">Line Total</th>
                  <th className="py-3 px-3">Supplier Link</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171A1F]/10">
                {summary.items.map((item) => (
                  <tr key={item.lineId} className="hover:bg-[#FCFAF7] transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-xs text-[#171A1F]">{item.sceneObjectName}</div>
                      <div className="text-[10px] text-[#737882]">{item.category}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-xs text-[#171A1F] font-medium">{item.selectedOption.title}</div>
                      <div className="text-[10px] text-[#2F5A4C]">{item.matchScorePct}% Spec Match · {item.tier}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="uppercase text-[9px] px-2 py-0.5 rounded font-bold bg-[#171A1F] text-white">
                        {item.sourcingMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 border border-[#171A1F]/20 rounded px-2 py-0.5 bg-white">
                        <button
                          type="button"
                          onClick={() => handleUpdateLineQty(item.objectId, -1)}
                          className="text-[#737882] hover:text-[#171A1F] px-1 font-bold text-sm"
                          title="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="font-bold min-w-[18px] text-center text-xs">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateLineQty(item.objectId, 1)}
                          className="text-[#737882] hover:text-[#171A1F] px-1 font-bold text-sm"
                          title="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {formatCurrency(item.unitPriceInCurrency, summary.currency)}
                      {item.pricingPeriod === "per_day" ? "/d" : ""}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#D9532B]">
                      {formatCurrency(item.lineTotalInCurrency, summary.currency)}
                    </td>
                    <td className="py-3 px-3">
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:text-emerald-900 underline truncate block max-w-[150px] text-[11px]"
                      >
                        {item.supplierName} ↗
                      </a>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveFromBOQ(item.objectId)}
                        className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded text-[11px] font-semibold transition-colors"
                        title="Remove from BOQ"
                      >
                        ✕ Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mandatory Transparency Disclaimer & Benchmark Disclosures */}
        <div className="border-t border-[#171A1F]/10 pt-4 space-y-1.5">
          <p className="font-mono text-[10px] text-[#737882] leading-relaxed">
            {summary.disclaimer}
          </p>
          <p className="font-mono text-[9px] text-[#737882]/80">
            FX Benchmark: Application-defined benchmark assumptions (Base: USD, dated Oct 2026) · Index Date:{" "}
            {summary.currencyConversionTimestamp?.slice(0, 10) || "2026-10-01"} · Verification Status: Preliminary Trade Reference (Non-Live Quotes / Non-Verified Stock)
          </p>
        </div>
      </section>
    </div>
  );
}
