"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  deriveObjectProcurementMetadata,
  exportProcurementBriefMarkdown,
  exportProcurementCSV,
  exportProcurementJSON,
  formatCurrency,
  matchRealWorldProductsForObject,
  upsertProcurementLineItem,
} from "@/lib/procurement";
import { generateSceneComparison } from "@/lib/compare/sceneGenerator";

export interface ProjectBOQSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  sceneSpec?: SceneSpec | null;
  budgetConfig: ProjectBudgetConfig;
  onUpdateBudgetConfig: (next: ProjectBudgetConfig) => void;
  procurementList: ProcurementLineItem[];
  onUpdateProcurementList: (next: ProcurementLineItem[]) => void;
  onSelectObject?: (id: string | null) => void;
  onSwitchToSourcingCatalog?: () => void;
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

export function ProjectBOQSheetModal({
  isOpen,
  onClose,
  sceneSpec,
  budgetConfig,
  onUpdateBudgetConfig,
  procurementList,
  onUpdateProcurementList,
  onSelectObject,
  onSwitchToSourcingCatalog,
}: ProjectBOQSheetModalProps) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [selectedQuickAddId, setSelectedQuickAddId] = useState<string>("");

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const safeSceneSpec: SceneSpec = useMemo(() => {
    if (sceneSpec) return sceneSpec;
    return generateSceneComparison({ prompt: "Sonic Architecture Spatial World", seed: 42 }).grounded;
  }, [sceneSpec]);

  const summary = useMemo(
    () => calculateProcurementSummary(procurementList, budgetConfig),
    [procurementList, budgetConfig]
  );

  const sourceableObjects = useMemo(
    () => (safeSceneSpec.objects || []).filter((o) => o && o.name),
    [safeSceneSpec.objects]
  );

  // Objects not yet in BOQ for quick addition
  const uncommittedObjects = useMemo(() => {
    const committedIds = new Set(procurementList.map((i) => i.objectId));
    return sourceableObjects.filter((o) => !committedIds.has(o.id));
  }, [sourceableObjects, procurementList]);

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

  const handleSetExactQty = (objectId: string, rawVal: string) => {
    const parsed = parseInt(rawVal, 10);
    if (isNaN(parsed) || parsed <= 0) return;
    const existing = procurementList.find((i) => i.objectId === objectId);
    if (!existing) return;
    const dur = existing.pricingPeriod === "per_day" ? Math.max(1, budgetConfig.rentalDurationDays) : 1;
    onUpdateProcurementList(
      procurementList.map((i) =>
        i.objectId === objectId
          ? {
              ...i,
              quantity: parsed,
              lineTotalInCurrency: existing.unitPriceInCurrency * parsed * dur,
            }
          : i
      )
    );
  };

  const handleSwitchMethod = (objectId: string, newMethod: SourcingMethod) => {
    const targetObj = sourceableObjects.find((o) => o.id === objectId);
    if (!targetObj) return;
    const matches = matchRealWorldProductsForObject(targetObj, safeSceneSpec, budgetConfig, procurementList);
    const bestInMethod = matches.find((m) => m.sourcingMethod === newMethod) || matches[0];
    if (!bestInMethod) return;

    const meta = deriveObjectProcurementMetadata(targetObj, safeSceneSpec);
    onUpdateProcurementList(
      upsertProcurementLineItem(
        procurementList,
        bestInMethod,
        targetObj.category || "furniture",
        meta?.quantity || 1,
        budgetConfig.rentalDurationDays
      )
    );
  };

  const handleRemoveFromBOQ = (objectId: string) => {
    onUpdateProcurementList(procurementList.filter((i) => i.objectId !== objectId));
  };

  const handleQuickAdd = () => {
    const targetObj = uncommittedObjects.find((o) => o.id === selectedQuickAddId) || uncommittedObjects[0];
    if (!targetObj) return;

    const matches = matchRealWorldProductsForObject(targetObj, safeSceneSpec, budgetConfig, procurementList);
    const best = matches[0];
    if (!best) return;

    const meta = deriveObjectProcurementMetadata(targetObj, safeSceneSpec);
    onUpdateProcurementList(
      upsertProcurementLineItem(
        procurementList,
        best,
        targetObj.category || "furniture",
        meta?.quantity || 1,
        budgetConfig.rentalDurationDays
      )
    );
    setSelectedQuickAddId("");
  };

  const handleCopyBrief = () => {
    const md = exportProcurementBriefMarkdown(summary, safeSceneSpec);
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
    const cleanTitle = (safeSceneSpec.title || "sonic-architecture").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadFile(csv, `${cleanTitle}-procurement-boq.csv`, "text/csv;charset=utf-8;");
  };

  const handleDownloadJSON = () => {
    const json = exportProcurementJSON(summary);
    const cleanTitle = (safeSceneSpec.title || "sonic-architecture").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadFile(json, `${cleanTitle}-procurement-boq.json`, "application/json");
  };

  const handleDownloadMarkdown = () => {
    const md = exportProcurementBriefMarkdown(summary, safeSceneSpec);
    const cleanTitle = (safeSceneSpec.title || "sonic-architecture").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadFile(md, `${cleanTitle}-procurement-brief.md`, "text/markdown;charset=utf-8;");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Project Bill of Quantities (BOQ)"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="project-boq-sheet relative bg-[#FCFAF7] border border-[#171A1F]/30 rounded-xl shadow-2xl max-w-6xl w-full max-h-[94vh] flex flex-col overflow-hidden text-[#171A1F]"
        data-testid="project-boq-sheet"
      >
        {/* =================================================================== */}
        {/* MODAL HEADER: Title, Location, Currency & Prominent Close */}
        {/* =================================================================== */}
        <div className="sticky top-0 bg-white border-b border-[#171A1F]/15 px-5 py-4 flex flex-wrap items-center justify-between gap-4 z-20">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-widest text-[#D9532B] font-bold">
                PROJECT PROCUREMENT SHEET
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#171A1F] text-white font-mono text-[10px] font-bold">
                {summary.items.length} Committed Items
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#171A1F] mt-0.5 leading-tight">
              Bill of Quantities (BOQ)
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#5B5F66] mt-1">
              <span><strong>Project:</strong> {safeSceneSpec.title || "Sonic Architecture Space"}</span>
              <span>•</span>
              <span><strong>Location:</strong> {budgetConfig.location}</span>
              <span>•</span>
              <span>
                <strong>Target Budget:</strong> {formatCurrency(budgetConfig.totalBudget, budgetConfig.currency)}
              </span>
            </div>
          </div>

          {/* Right Action: Currency Switcher & Close Button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-xs bg-[#EEE8DC]/50 border border-[#171A1F]/15 rounded px-2.5 py-1">
              <span className="text-[#737882] text-[10px] uppercase font-bold">Currency:</span>
              <select
                value={budgetConfig.currency}
                onChange={(e) =>
                  onUpdateBudgetConfig({
                    ...budgetConfig,
                    currency: e.target.value as CurrencyCode,
                  })
                }
                className="bg-transparent font-bold cursor-pointer outline-none text-xs"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={onClose}
              data-testid="boq-header-close-btn"
              className="px-4 py-2 bg-[#171A1F] hover:bg-black text-white font-mono text-xs uppercase font-bold rounded flex items-center gap-1.5 transition-colors shadow-sm"
              title="Close BOQ Sheet (Esc)"
            >
              <span>✕ Close Sheet</span>
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* MODAL BODY (Scrollable area) */}
        {/* =================================================================== */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-5 rounded-lg border border-[#171A1F]/15 font-mono text-xs shadow-sm">
            <div>
              <div className="text-[10px] uppercase text-[#737882] font-semibold">Purchase (Buy) Total</div>
              <div className="text-xl font-bold text-[#171A1F] mt-1" data-testid="boq-purchase-total">
                {formatCurrency(summary.buySubtotal, summary.currency)}
              </div>
              <div className="text-[10px] text-[#737882] mt-0.5">
                {summary.items.filter((i) => i.sourcingMethod === "buy").length} assemblies purchased
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase text-[#737882] font-semibold">
                Rental Total ({summary.rentalDurationDays} Days)
              </div>
              <div className="text-xl font-bold text-[#171A1F] mt-1" data-testid="boq-rental-total">
                {formatCurrency(summary.rentSubtotal, summary.currency)}
              </div>
              <div className="text-[10px] text-[#737882] mt-0.5">
                {summary.items.filter((i) => i.sourcingMethod === "rent").length} assemblies rented
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase text-[#737882] font-semibold">Custom Fabrication Total</div>
              <div className="text-xl font-bold text-[#171A1F] mt-1" data-testid="boq-custom-total">
                {formatCurrency(summary.customSubtotal, summary.currency)}
              </div>
              <div className="text-[10px] text-[#737882] mt-0.5">
                {summary.items.filter((i) => i.sourcingMethod === "custom").length} assemblies bespoke
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase text-[#737882] font-semibold">
                Grand Estimated Total / Budget
              </div>
              <div className="text-xl font-bold text-[#D9532B] mt-1" data-testid="boq-grand-total">
                {formatCurrency(summary.grandTotalEstimated, summary.currency)}
              </div>
              <div className="text-[10px] text-[#737882] mt-0.5">
                Budget: {formatCurrency(summary.totalBudget, summary.currency)} (
                <span
                  className={
                    summary.remainingBudget >= 0
                      ? "text-emerald-700 font-bold"
                      : "text-red-700 font-bold"
                  }
                >
                  {summary.remainingBudget >= 0
                    ? `${formatCurrency(summary.remainingBudget, summary.currency)} remaining`
                    : `Over by ${formatCurrency(Math.abs(summary.remainingBudget), summary.currency)}`}
                </span>
                )
              </div>
            </div>
          </div>

          {/* Budget Utilization Progress Bar */}
          <div className="space-y-1.5 bg-white p-3.5 rounded-lg border border-[#171A1F]/15">
            <div className="flex justify-between font-mono text-[11px] text-[#737882]">
              <span>
                <strong>Budget Utilization:</strong> {summary.budgetUtilizationPct}%
              </span>
              <span>
                Target Ceiling: <strong>{formatCurrency(summary.totalBudget, summary.currency)}</strong>
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#EEE8DC] rounded-full overflow-hidden">
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

          {/* Top Actions & Quick Add Assembly Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-[#171A1F]/15">
            {/* Quick Add Assembly to BOQ */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs uppercase font-bold text-[#171A1F]">
                + Add Assembly to BOQ:
              </span>
              {uncommittedObjects.length > 0 ? (
                <>
                  <select
                    value={selectedQuickAddId}
                    onChange={(e) => setSelectedQuickAddId(e.target.value)}
                    data-testid="quick-add-assembly-select"
                    className="bg-[#EEE8DC]/60 border border-[#171A1F]/20 rounded px-2.5 py-1.5 text-xs font-mono font-medium max-w-xs truncate"
                  >
                    <option value="">Select scene assembly...</option>
                    {uncommittedObjects.map((obj) => (
                      <option key={obj.id} value={obj.id}>
                        {obj.name} ({obj.category})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleQuickAdd}
                    data-testid="quick-add-assembly-btn"
                    className="px-3 py-1.5 bg-[#2F5A4C] hover:bg-[#25483D] text-white font-mono text-xs uppercase font-bold rounded shadow-sm transition-colors"
                  >
                    + Add to BOQ
                  </button>
                </>
              ) : (
                <span className="text-xs font-mono text-emerald-700 font-semibold">
                  ✓ All {sourceableObjects.length} scene assemblies committed
                </span>
              )}
            </div>

            {/* Export Actions Bar */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              {copyFeedback && (
                <span className="text-emerald-700 font-bold text-[11px] animate-fade-in mr-1">
                  ✓ {copyFeedback}
                </span>
              )}
              <button
                type="button"
                onClick={handleCopyBrief}
                data-testid="copy-brief-btn"
                className="px-3 py-1.5 bg-[#EEE8DC] hover:bg-[#E4DDD0] border border-[#171A1F]/20 rounded uppercase text-[10px] font-bold transition-colors"
                title="Copy markdown procurement brief to clipboard"
              >
                Copy Brief (MD)
              </button>
              <button
                type="button"
                onClick={handleDownloadCSV}
                data-testid="download-csv-btn"
                className="px-3 py-1.5 bg-[#EEE8DC] hover:bg-[#E4DDD0] border border-[#171A1F]/20 rounded uppercase text-[10px] font-bold transition-colors"
                title="Download CSV spreadsheet"
              >
                Download CSV
              </button>
              <button
                type="button"
                onClick={handleDownloadJSON}
                data-testid="export-json-btn"
                className="px-3 py-1.5 bg-[#EEE8DC] hover:bg-[#E4DDD0] border border-[#171A1F]/20 rounded uppercase text-[10px] font-bold transition-colors"
                title="Export structured JSON data"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={handleDownloadMarkdown}
                className="px-3 py-1.5 bg-[#171A1F] hover:bg-black text-white rounded uppercase text-[10px] font-bold transition-colors shadow-sm"
                title="Download Markdown brief"
              >
                Download BOQ (.md)
              </button>
            </div>
          </div>

          {/* =================================================================== */}
          {/* COMMITTED BOQ ITEMS TABLE */}
          {/* =================================================================== */}
          {summary.items.length === 0 ? (
            <div className="p-12 text-center bg-white border border-dashed border-[#171A1F]/25 rounded-xl space-y-3">
              <div className="font-serif text-xl font-semibold text-[#171A1F]">
                No assemblies saved to your Project BOQ yet
              </div>
              <p className="font-sans text-xs text-[#5B5F66] max-w-lg mx-auto leading-relaxed">
                Your scene contains <strong>{sourceableObjects.length}</strong> architectural assemblies.
                Select an assembly from the dropdown above or browse the verified vendor catalog in Pricing &amp; Sourcing to commit your first line item.
              </p>
              {uncommittedObjects.length > 0 && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSwitchToSourcingCatalog) {
                        onClose();
                        onSwitchToSourcingCatalog();
                      } else {
                        handleQuickAdd();
                      }
                    }}
                    className="px-5 py-2.5 bg-[#D9532B] hover:bg-[#C2441F] text-white font-mono text-xs uppercase font-bold rounded shadow-md transition-all hover:scale-[1.02]"
                  >
                    Browse Sourcing Catalog in Workspace →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#171A1F]/20 bg-white shadow-sm">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#171A1F]/20 text-[10px] uppercase text-[#737882] tracking-wider bg-[#FCFAF7]">
                    <th className="py-3.5 px-4 font-bold">Assembly &amp; Category</th>
                    <th className="py-3.5 px-4 font-bold">Selected Match &amp; Tier</th>
                    <th className="py-3.5 px-3 text-center font-bold">Method</th>
                    <th className="py-3.5 px-3 text-center font-bold">Quantity</th>
                    <th className="py-3.5 px-4 text-right font-bold">Unit Price</th>
                    <th className="py-3.5 px-3 text-center font-bold">Period / Dur</th>
                    <th className="py-3.5 px-4 text-right font-bold">Line Total</th>
                    <th className="py-3.5 px-4 font-bold">Supplier Info</th>
                    <th className="py-3.5 px-3 text-center font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#171A1F]/10">
                  {summary.items.map((item) => (
                    <tr
                      key={item.lineId}
                      data-testid={`boq-item-row-${item.objectId}`}
                      className="hover:bg-[#FCFAF7] transition-colors"
                    >
                      {/* Assembly & Category */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-xs text-[#171A1F]">{item.sceneObjectName}</div>
                        <div className="text-[10px] text-[#737882] uppercase">{item.category}</div>
                      </td>

                      {/* Selected Match & Tier */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-[#171A1F] font-medium leading-tight">
                          {item.selectedOption.title}
                        </div>
                        <div className="text-[10px] text-[#2F5A4C] font-semibold mt-0.5">
                          {item.matchScorePct}% Spec Match · {item.tier}
                        </div>
                      </td>

                      {/* Method Selector */}
                      <td className="py-3.5 px-3 text-center">
                        <select
                          value={item.sourcingMethod}
                          onChange={(e) =>
                            handleSwitchMethod(item.objectId, e.target.value as SourcingMethod)
                          }
                          className="uppercase text-[9px] px-2 py-1 rounded font-bold bg-[#171A1F] text-white cursor-pointer outline-none"
                          title="Switch procurement mode"
                        >
                          <option value="buy">BUY</option>
                          <option value="rent">RENT</option>
                          <option value="custom">CUSTOM</option>
                        </select>
                      </td>

                      {/* Quantity Controls */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1 border border-[#171A1F]/20 rounded px-1.5 py-0.5 bg-white shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateLineQty(item.objectId, -1)}
                            data-testid={`boq-qty-dec-${item.objectId}`}
                            className="text-[#737882] hover:text-[#171A1F] px-1 font-bold text-sm leading-none"
                            title="Decrease quantity"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleSetExactQty(item.objectId, e.target.value)}
                            data-testid={`boq-qty-input-${item.objectId}`}
                            className="w-10 text-center font-bold text-xs bg-transparent outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateLineQty(item.objectId, 1)}
                            data-testid={`boq-qty-inc-${item.objectId}`}
                            className="text-[#737882] hover:text-[#171A1F] px-1 font-bold text-sm leading-none"
                            title="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-medium">
                          {formatCurrency(item.unitPriceInCurrency, summary.currency)}
                        </div>
                        <div className="text-[10px] text-[#737882]">
                          {item.pricingPeriod === "per_day"
                            ? "/day"
                            : item.pricingPeriod === "per_sqm"
                            ? "/m²"
                            : "/unit"}
                        </div>
                      </td>

                      {/* Rental Duration / Period */}
                      <td className="py-3.5 px-3 text-center text-[11px] text-[#737882]">
                        {item.pricingPeriod === "per_day" ? `${summary.rentalDurationDays}d` : "One-Time"}
                      </td>

                      {/* Line Total */}
                      <td className="py-3.5 px-4 text-right font-bold text-[#D9532B] text-sm">
                        {formatCurrency(item.lineTotalInCurrency, summary.currency)}
                      </td>

                      {/* Supplier Info Link */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-medium text-[#171A1F] truncate max-w-[160px]">
                          {item.supplierName}
                        </div>
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:text-emerald-900 underline text-[10px] font-semibold inline-block mt-0.5"
                        >
                          Supplier Link ↗
                        </a>
                      </td>

                      {/* Actions: Edit & Remove */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {onSelectObject && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectObject(item.objectId);
                                if (onSwitchToSourcingCatalog) {
                                  onClose();
                                  onSwitchToSourcingCatalog();
                                }
                              }}
                              className="px-2 py-1 text-[#2F5A4C] hover:bg-[#2F5A4C]/10 rounded text-[10px] font-bold uppercase transition-colors"
                              title="Edit in Sourcing catalog"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveFromBOQ(item.objectId)}
                            data-testid={`boq-remove-btn-${item.objectId}`}
                            className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-[10px] font-bold uppercase transition-colors"
                            title="Remove from BOQ"
                          >
                            ✕ Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Transparency Disclaimer & Disclosures */}
          <div className="border-t border-[#171A1F]/10 pt-4 space-y-1">
            <p className="font-mono text-[10px] text-[#737882] leading-relaxed">
              {summary.disclaimer}
            </p>
            <p className="font-mono text-[9px] text-[#737882]/80">
              FX Benchmark: Fixed regional cost estimation (Base: USD, Oct 2026) · Verification Status: Preliminary Trade Reference Quotes.
            </p>
          </div>
        </div>

        {/* =================================================================== */}
        {/* MODAL FOOTER */}
        {/* =================================================================== */}
        <div className="sticky bottom-0 bg-[#EEE8DC] border-t border-[#171A1F]/15 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="text-[#5B5F66]">
            Total Line Items: <strong>{summary.items.length}</strong> · Estimated Grand Total:{" "}
            <strong className="text-[#D9532B] font-bold">
              {formatCurrency(summary.grandTotalEstimated, summary.currency)}
            </strong>
          </div>
          <div className="flex items-center gap-3">
            {onSwitchToSourcingCatalog && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToSourcingCatalog();
                }}
                data-testid="boq-footer-return-btn"
                className="px-3.5 py-1.5 bg-white hover:bg-neutral-100 border border-[#171A1F]/20 text-[#171A1F] rounded uppercase text-[10px] font-bold transition-colors"
              >
                Return to Pricing &amp; Sourcing Workspace
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              data-testid="boq-footer-close-btn"
              className="px-4 py-1.5 bg-[#171A1F] hover:bg-black text-white rounded uppercase text-[10px] font-bold transition-colors shadow-sm"
            >
              Close BOQ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectBOQSheetModal;
