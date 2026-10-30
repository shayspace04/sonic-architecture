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

  const selectedObj = useMemo(
    () =>
      sourceableObjects.find((o) => o.id === selectedObjectId) ||
      sourceableObjects[0] ||
      null,
    [sourceableObjects, selectedObjectId]
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

  return (
    <section className="bg-[#EEE8DC] border-t border-[#171A1F]/15 p-6 space-y-6 text-[#171A1F]">
      {/* 1. HEADER: BRANDING, LOCATION SELECTOR, CURRENCY & BUDGET CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#171A1F]/15 pb-5">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#D9532B]">
            REAL-WORLD SOURCING &amp; BILL OF QUANTITIES (BOQ)
          </span>
          <h2 className="font-serif text-3xl font-normal text-[#171A1F] mt-1">
            Vendor Directory, Sourcing Workflows &amp; Budget Optimization
          </h2>
          <p className="font-sans text-xs text-[#5B5F66] mt-0.5">
            Transparent, attribute-matched procurement for 3D scene assemblies across Buy, Rent, and Bespoke Fabrication.
          </p>
        </div>

        {/* Global Location & Currency Configurator */}
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs bg-white/80 p-2.5 border border-[#171A1F]/15 rounded shadow-sm">
          {/* Location Preset Dropdown */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-[#737882] font-semibold">Project Location</span>
            <select
              id="procurement-location-select"
              value={
                GLOBAL_LOCATION_PRESETS.some((p) => p.name === budgetConfig.location)
                  ? GLOBAL_LOCATION_PRESETS.find((p) => p.name === budgetConfig.location)?.id
                  : "custom"
              }
              onChange={handlePresetLocationChange}
              className="px-2.5 py-1.5 bg-white border border-[#171A1F]/20 text-xs rounded focus:outline-none focus:border-[#D9532B]"
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
          </div>

          {/* Currency Selector */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-[#737882] font-semibold">Currency</span>
            <select
              id="procurement-currency-select"
              value={budgetConfig.currency}
              onChange={(e) =>
                onUpdateBudgetConfig({
                  ...budgetConfig,
                  currency: e.target.value as CurrencyCode,
                })
              }
              className="px-2.5 py-1.5 bg-white border border-[#171A1F]/20 text-xs rounded focus:outline-none focus:border-[#D9532B]"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>

          {/* Rental Duration Selector */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-[#737882] font-semibold">Rental Duration</span>
            <div className="flex items-center gap-1">
              <input
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
                className="w-16 px-2 py-1.5 bg-white border border-[#171A1F]/20 text-xs rounded focus:outline-none focus:border-[#D9532B]"
              />
              <span className="text-[11px] text-[#5B5F66]">days</span>
            </div>
          </div>

          {/* Total Budget Input */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-[#737882] font-semibold">Total Budget</span>
            <input
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
              className="w-28 px-2 py-1.5 bg-white border border-[#171A1F]/20 text-xs rounded focus:outline-none focus:border-[#D9532B]"
            />
          </div>
        </div>
      </div>

      {/* Custom Location Drawer if enabled */}
      {isEditingLocation && (
        <div className="p-3.5 bg-white border border-[#D9532B]/30 rounded flex flex-wrap items-center gap-3 text-xs font-mono">
          <span className="text-[#D9532B] font-semibold uppercase text-[11px]">Specify Location:</span>
          <input
            type="text"
            placeholder="City / Locality"
            value={customCity}
            onChange={(e) => setCustomCity(e.target.value)}
            className="px-2.5 py-1 border border-[#171A1F]/20 rounded"
          />
          <input
            type="text"
            placeholder="State / Region / Province"
            value={customRegion}
            onChange={(e) => setCustomRegion(e.target.value)}
            className="px-2.5 py-1 border border-[#171A1F]/20 rounded"
          />
          <input
            type="text"
            placeholder="Country"
            value={customCountry}
            onChange={(e) => setCustomCountry(e.target.value)}
            className="px-2.5 py-1 border border-[#171A1F]/20 rounded"
          />
          <button
            type="button"
            onClick={handleApplyCustomLocation}
            className="px-3 py-1 bg-[#2F5A4C] text-white rounded font-mono uppercase text-[11px]"
          >
            Apply Location
          </button>
          <button
            type="button"
            onClick={() => setIsEditingLocation(false)}
            className="px-2 py-1 text-[#737882] hover:text-[#171A1F] text-[11px]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* 2. MAIN WORKSPACE: SCENE OBJECT SELECTOR + SOURCING WORKFLOW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Scene Assemblies Directory */}
        <div className="lg:col-span-4 bg-[#171A1F] text-[#EEE8DC] p-4 rounded space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">
                Scene Assemblies ({sourceableObjects.length})
              </span>
              <span className="font-mono text-[10px] text-white/50">
                Location: {parsedLoc.city}, {parsedLoc.country}
              </span>
            </div>

            {/* Scrollable List of Scene Objects */}
            <div className="max-h-[360px] overflow-y-auto space-y-1.5 pr-1">
              {sourceableObjects.map((obj) => {
                const isSelected = selectedObj?.id === obj.id;
                const isInBOQ = procurementList.some((item) => item.objectId === obj.id);
                return (
                  <div
                    key={obj.id}
                    onClick={() => onSelectObject(obj.id)}
                    className={`p-2.5 rounded cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-[#2F5A4C] border-emerald-400 text-white"
                        : "bg-white/5 border-white/5 hover:bg-white/10 text-white/80"
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="uppercase tracking-wider opacity-80">{obj.category}</span>
                      {isInBOQ && (
                        <span className="px-1.5 py-0.2 bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 rounded text-[9px]">
                          ✓ In BOQ
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-xs mt-0.5">{obj.name}</div>
                    <div className="font-mono text-[10px] text-white/60 mt-1 flex items-center justify-between">
                      <span>{obj.dimensions.map((d) => Number(d).toFixed(1)).join(" × ")}m</span>
                      <span className="capitalize">{obj.materialId.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Selected Object Inspection Card */}
          {selectedObj && objectMeta && (
            <div className="pt-3 border-t border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-[#D9532B] text-white rounded">
                  Inspecting: {selectedObj.name.slice(0, 24)}...
                </span>
                {onSwitchTo3D && (
                  <button
                    type="button"
                    onClick={onSwitchTo3D}
                    className="font-mono text-[10px] underline text-emerald-300 hover:text-emerald-200"
                  >
                    Focus in 3D ↗
                  </button>
                )}
              </div>
              <div className="font-mono text-[11px] text-white/80 space-y-1 bg-black/30 p-2.5 rounded">
                <div>Dimensions: {objectMeta.dimensionsMeters.join("m × ")}m</div>
                <div>Primary Finish: {objectMeta.materialName} ({objectMeta.finish})</div>
                <div>Recommended Qty: {objectMeta.quantity} unit(s)</div>
                <div className="text-white/60 text-[10px] italic">Function: {objectMeta.intendedFunction}</div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (8 cols): BUY, RENT, CUSTOM SOURCING WORKFLOW */}
        <div className="lg:col-span-8 bg-white border border-[#171A1F]/15 rounded p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Sourcing Method Tabs: BUY, RENT, CUSTOM */}
            <div className="flex items-center justify-between border-b border-[#171A1F]/10 pb-3">
              <div className="flex gap-2">
                {(["buy", "rent", "custom"] as SourcingMethod[]).map((method) => {
                  const isActive = activeMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setActiveMethod(method)}
                      className={`px-4 py-1.5 font-mono text-xs uppercase tracking-wider rounded font-semibold border transition-all ${
                        isActive
                          ? "bg-[#D9532B] text-white border-[#D9532B] shadow-sm"
                          : "bg-[#EEE8DC]/50 text-[#171A1F]/70 border-[#171A1F]/15 hover:bg-[#EEE8DC]"
                      }`}
                    >
                      {method === "buy" ? "🛒 Purchase (Buy)" : method === "rent" ? "🎪 Equipment Rental" : "🔨 Bespoke Fabrication"}
                    </button>
                  );
                })}
              </div>

              <div className="font-mono text-[11px] text-[#5B5F66] hidden sm:block">
                Location: <strong>{budgetConfig.location}</strong>
              </div>
            </div>

            {/* Mode-Specific Explanatory Guidance Banner */}
            <div className="p-2.5 rounded bg-[#EEE8DC]/40 border border-[#171A1F]/10 font-mono text-[11px] text-[#5B5F66]">
              {activeMethod === "buy" && (
                <span>
                  <strong>Purchase Mode:</strong> Sourcing purchasable catalog items with freight lead time to {parsedLoc.city}. Product prices reflect benchmark estimates until verified via supplier quote.
                </span>
              )}
              {activeMethod === "rent" && (
                <span>
                  <strong>Rental Mode:</strong> Sourcing regional pro-AV and staging inventory for a <strong>{budgetConfig.rentalDurationDays}-day</strong> event window near {parsedLoc.city}. Subtotals include daily rate × quantity × days.
                </span>
              )}
              {activeMethod === "custom" && (
                <span>
                  <strong>Bespoke Fabrication Mode:</strong> Generating custom architectural CAD specifications for local joinery/millwork fabricators in {parsedLoc.region || parsedLoc.country}. Prices are indicative and await formal shop drawing sign-off.
                </span>
              )}
            </div>

            {/* 3 Tiered Cards (Economy, Recommended, Premium) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {methodMatches.map((opt) => {
                const isInBOQ = procurementList.some(
                  (item) => item.objectId === opt.objectId && item.selectedOption.id === opt.id
                );
                return (
                  <div
                    key={opt.id}
                    className={`border p-4 rounded flex flex-col justify-between space-y-3 transition-all ${
                      opt.tier === "recommended"
                        ? "bg-[#FCFAF7] border-[#2F5A4C]/40 shadow-sm ring-1 ring-[#2F5A4C]/20"
                        : "bg-white border-[#171A1F]/15 hover:border-[#171A1F]/30"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className={`uppercase px-2 py-0.5 rounded font-bold ${
                          opt.tier === "recommended"
                            ? "bg-[#2F5A4C] text-white"
                            : opt.tier === "premium"
                            ? "bg-[#171A1F] text-white"
                            : "bg-[#737882] text-white"
                        }`}>
                          {opt.tier} Tier
                        </span>
                        <span className="text-[#2F5A4C] font-semibold">
                          {opt.matchScorePct}% Spec Match
                        </span>
                      </div>

                      <h4 className="font-semibold text-sm text-[#171A1F] leading-tight line-clamp-2">
                        {opt.title}
                      </h4>

                      {/* Pricing Readout */}
                      <div className="font-mono space-y-0.5">
                        <div className="text-base text-[#D9532B] font-bold">
                          {formatCurrency(opt.estimatedLineTotalInUserCurrency, budgetConfig.currency)}
                        </div>
                        <div className="text-[10px] text-[#737882]">
                          Unit: {formatCurrency(convertFromUSD(opt.unitPriceUSD, budgetConfig.currency), budgetConfig.currency)}
                          {opt.pricingPeriod === "per_day" ? ` / day × ${budgetConfig.rentalDurationDays}d` : ` (${opt.pricingPeriod})`}
                          {" "}× {opt.recommendedQuantity} qty
                        </div>
                      </div>

                      {/* Fit & Verification Status Note */}
                      <p className="text-[11px] text-[#5B5F66] leading-relaxed">
                        {opt.budgetFitExplanation}
                      </p>

                      <div className="font-mono text-[10px] bg-neutral-100 p-2 rounded text-[#171A1F] space-y-0.5">
                        <div className="font-semibold truncate">Vendor: {opt.supplierName}</div>
                        <div className="text-[9px] text-[#737882] truncate">Region: {opt.supplierRegion}</div>
                        <div className="text-[9px] text-amber-800 font-medium">Status: {opt.priceStatus.replace(/_/g, " ")}</div>
                      </div>
                    </div>

                    {/* Action Buttons: Links & Save to BOQ */}
                    <div className="space-y-1.5 pt-3 border-t border-[#171A1F]/10">
                      <div className="flex gap-1.5">
                        <a
                          href={opt.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center py-1.5 bg-[#EEE8DC] hover:bg-[#E4DDD0] font-mono text-[10px] uppercase rounded transition-colors"
                        >
                          Supplier Page ↗
                        </a>
                        <a
                          href={opt.supplierSearchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center py-1.5 bg-[#EEE8DC] hover:bg-[#E4DDD0] font-mono text-[10px] uppercase rounded transition-colors"
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
                              selectedObj.category,
                              objectMeta?.quantity || 1,
                              budgetConfig.rentalDurationDays
                            )
                          )
                        }
                        className={`w-full py-2 font-mono text-[10px] uppercase rounded font-bold transition-all ${
                          isInBOQ
                            ? "bg-emerald-700 text-white"
                            : "bg-[#2F5A4C] hover:bg-[#25483D] text-white shadow-sm"
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
        </div>
      </div>

      {/* 3. INTERACTIVE PROJECT BOQ SHEET & PROCUREMENT SUMMARY */}
      <div className="bg-white border border-[#171A1F]/20 rounded p-5 space-y-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#171A1F]/15 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-[#D9532B] font-bold">
                Project Bill of Quantities (BOQ)
              </span>
              <span className="px-2 py-0.2 rounded-full bg-[#171A1F] text-white font-mono text-[10px]">
                {summary.items.length} Committed Assemblies
              </span>
            </div>
            <h3 className="font-serif text-2xl text-[#171A1F] mt-0.5">
              Cost Allocation &amp; Specification Manifest
            </h3>
          </div>

          {/* Export Actions */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {copyFeedback && (
              <span className="text-emerald-700 font-semibold text-[11px] animate-fade-in">
                {copyFeedback}
              </span>
            )}
            <button
              type="button"
              onClick={handleCopyBrief}
              className="px-3 py-1.5 bg-[#EEE8DC] hover:bg-[#E4DDD0] border border-[#171A1F]/20 rounded uppercase text-[10px] font-semibold"
            >
              Copy Brief (MD)
            </button>
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 bg-[#EEE8DC] hover:bg-[#E4DDD0] border border-[#171A1F]/20 rounded uppercase text-[10px] font-semibold"
            >
              Download CSV
            </button>
            <button
              type="button"
              onClick={handleDownloadJSON}
              className="px-3 py-1.5 bg-[#EEE8DC] hover:bg-[#E4DDD0] border border-[#171A1F]/20 rounded uppercase text-[10px] font-semibold"
            >
              Export JSON
            </button>
          </div>
        </div>

        {/* Dynamic Budget Utilization Bar & Breakdown Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#FCFAF7] p-4 rounded border border-[#171A1F]/10 font-mono text-xs">
          <div>
            <div className="text-[10px] uppercase text-[#737882]">Purchase (Buy) Total</div>
            <div className="text-base font-bold text-[#171A1F]">
              {formatCurrency(summary.buySubtotal, summary.currency)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-[#737882]">
              Rental Total ({summary.rentalDurationDays} Days)
            </div>
            <div className="text-base font-bold text-[#171A1F]">
              {formatCurrency(summary.rentSubtotal, summary.currency)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-[#737882]">Custom Fabrication Total</div>
            <div className="text-base font-bold text-[#171A1F]">
              {formatCurrency(summary.customSubtotal, summary.currency)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-[#737882]">
              Grand Estimated Total / Budget
            </div>
            <div className="text-base font-bold text-[#D9532B]">
              {formatCurrency(summary.grandTotalEstimated, summary.currency)} / {formatCurrency(summary.totalBudget, summary.currency)}
            </div>
            <div className="text-[10px] text-[#737882] mt-0.5">
              Utilization: {summary.budgetUtilizationPct}% ({summary.remainingBudget >= 0 ? `${formatCurrency(summary.remainingBudget, summary.currency)} remaining` : `Over budget by ${formatCurrency(Math.abs(summary.remainingBudget), summary.currency)}`})
            </div>
          </div>
        </div>

        {/* Interactive BOQ Items Table */}
        {summary.items.length === 0 ? (
          <div className="p-8 text-center text-sm font-sans text-[#737882] italic bg-[#EEE8DC]/20 border border-dashed border-[#171A1F]/20 rounded">
            No assemblies saved to your Project BOQ yet. Select an assembly above and click &ldquo;+ Save to Project BOQ&rdquo;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#171A1F]/20 text-[10px] uppercase text-[#737882] tracking-wider bg-[#FCFAF7]">
                  <th className="py-2.5 px-3">Assembly &amp; Category</th>
                  <th className="py-2.5 px-3">Selected Match &amp; Tier</th>
                  <th className="py-2.5 px-3 text-center">Method</th>
                  <th className="py-2.5 px-3 text-center">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Line Total</th>
                  <th className="py-2.5 px-3">Supplier Link</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
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
                      <div className="text-xs text-[#171A1F] truncate max-w-[220px]">{item.selectedOption.title}</div>
                      <div className="text-[10px] text-[#2F5A4C]">{item.matchScorePct}% Spec Match • {item.tier}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-[#171A1F] text-white">
                        {item.sourcingMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 border border-[#171A1F]/20 rounded px-1.5 py-0.5 bg-white">
                        <button
                          type="button"
                          onClick={() => handleUpdateLineQty(item.objectId, -1)}
                          className="text-[#737882] hover:text-[#171A1F] px-1 font-bold"
                          title="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="font-bold min-w-[16px] text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateLineQty(item.objectId, 1)}
                          className="text-[#737882] hover:text-[#171A1F] px-1 font-bold"
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
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-[11px]"
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

        {/* Mandatory Transparency Disclaimer & Benchmark Timestamp */}
        <div className="border-t border-[#171A1F]/10 pt-3 space-y-1">
          <p className="font-mono text-[10px] text-[#737882] leading-relaxed">
            {summary.disclaimer}
          </p>
          <p className="font-mono text-[9px] text-[#737882]/80">
            FX Benchmark: Application-defined benchmark assumptions (Base: USD, dated Oct 2026) • Index Date: {summary.currencyConversionTimestamp?.slice(0, 10) || "2026-10-01"} • Verification Status: Preliminary Trade Reference (Non-Live Quotes / Non-Verified Stock)
          </p>
        </div>
      </div>
    </section>
  );
}
