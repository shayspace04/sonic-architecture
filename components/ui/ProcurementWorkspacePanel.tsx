"use client";

import React, { useMemo, useState } from "react";
import type {
  CurrencyCode,
  ProcurementLineItem,
  ProjectBudgetConfig,
  SceneSpec,
  SourcingMethod,
} from "@/lib/types";
import {
  calculateProcurementSummary,
  deriveObjectProcurementMetadata,
  exportProcurementBriefMarkdown,
  formatCurrency,
  matchRealWorldProductsForObject,
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
}

export default function ProcurementWorkspacePanel({
  sceneSpec,
  selectedObjectId,
  onSelectObject,
  budgetConfig,
  onUpdateBudgetConfig,
  procurementList,
  onUpdateProcurementList,
}: ProcurementWorkspacePanelProps) {
  const [activeMethod, setActiveMethod] = useState<SourcingMethod>("rent");

  const selectedObj = useMemo(
    () =>
      sceneSpec.objects.find((o) => o.id === selectedObjectId) ||
      sceneSpec.objects[0] ||
      null,
    [sceneSpec.objects, selectedObjectId]
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

  return (
    <section className="bg-[#EEE8DC] border-t border-[#171A1F]/15 p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#171A1F]/15 pb-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#D9532B]">
            REAL-WORLD SOURCING &amp; BUDGET-AWARE PROCUREMENT
          </span>
          <h2 className="font-serif text-3xl text-[#171A1F]">
            Product Matching, Local Vendor Relevance &amp; Bill of Quantities
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <select
            value={budgetConfig.currency}
            onChange={(e) =>
              onUpdateBudgetConfig({
                ...budgetConfig,
                currency: e.target.value as CurrencyCode,
              })
            }
            className="px-2.5 py-1.5 bg-white border border-[#171A1F]/25"
          >
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="JPY">JPY (¥)</option>
          </select>
          <input
            type="text"
            value={budgetConfig.location}
            onChange={(e) =>
              onUpdateBudgetConfig({ ...budgetConfig, location: e.target.value })
            }
            className="px-2.5 py-1.5 bg-white border border-[#171A1F]/25"
            placeholder="Project Location..."
          />
        </div>
      </div>

      {selectedObj && objectMeta && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-[#171A1F] text-[#EEE8DC] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-[#2F5A4C]">
                {objectMeta.category} • {objectMeta.subtype}
              </span>
              <button
                type="button"
                onClick={() => onSelectObject(null)}
                className="font-mono text-[10px] underline"
              >
                Return to Full Scene
              </button>
            </div>
            <h3 className="text-lg font-semibold">{selectedObj.name}</h3>
            <div className="font-mono text-xs text-white/80 space-y-1">
              <div>
                Dimensions: {objectMeta.dimensionsMeters.join("m × ")}m ({objectMeta.unit})
              </div>
              <div>
                Material: {objectMeta.materialName} ({objectMeta.finish})
              </div>
              <div>Recommended Quantity: {objectMeta.quantity}</div>
              <div>Function: {objectMeta.intendedFunction}</div>
            </div>
            <div className="flex gap-1.5 pt-2">
              {(["buy", "rent", "custom"] as SourcingMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setActiveMethod(m)}
                  className={`flex-1 py-1.5 font-mono text-xs uppercase border ${
                    activeMethod === m
                      ? "bg-[#D9532B] text-white border-[#D9532B]"
                      : "border-white/20 text-white/70"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {methodMatches.map((opt) => (
              <div
                key={opt.id}
                className="bg-white border border-[#171A1F]/20 p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="uppercase px-1.5 py-0.5 bg-[#171A1F] text-white">
                      {opt.tier}
                    </span>
                    <span className="text-[#2F5A4C] font-semibold">
                      {opt.matchScorePct}% Match
                    </span>
                  </div>
                  <div className="font-mono text-[9px] text-amber-800 bg-amber-50 px-1.5 py-0.5 border border-amber-200">
                    {opt.dataSourceLabel}
                  </div>
                  <h4 className="font-semibold text-sm text-[#171A1F]">{opt.title}</h4>
                  <div className="font-mono text-xs text-[#D9532B] font-semibold">
                    Est. Total:{" "}
                    {formatCurrency(
                      opt.estimatedLineTotalInUserCurrency,
                      budgetConfig.currency
                    )}{" "}
                    ({opt.pricingPeriod.replace("_", " ")})
                  </div>
                  <p className="text-xs text-[#5B5F66]">{opt.budgetFitExplanation}</p>
                  <div className="font-mono text-[10px] text-[#171A1F]">
                    Vendor: {opt.supplierName}
                  </div>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-black/10">
                  <div className="flex gap-1.5">
                    <a
                      href={opt.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-1 bg-[#EEE8DC] hover:bg-[#E4DDD0] font-mono text-[10px] uppercase"
                    >
                      Supplier Page ↗
                    </a>
                    <a
                      href={opt.supplierSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-1 bg-[#EEE8DC] hover:bg-[#E4DDD0] font-mono text-[10px] uppercase"
                    >
                      Search Vendors ↗
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
                          objectMeta.quantity,
                          budgetConfig.rentalDurationDays
                        )
                      )
                    }
                    className="w-full py-1.5 bg-[#2F5A4C] text-white font-mono text-[10px] uppercase"
                  >
                    + Save to Project BOQ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-[#171A1F]/20 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs uppercase tracking-wider">
            Project Procurement List ({summary.items.length} Line Items)
          </h3>
          <div className="font-mono text-xs font-semibold">
            Grand Est. Total: {formatCurrency(summary.grandTotalEstimated, summary.currency)} /{" "}
            {formatCurrency(summary.totalBudget, summary.currency)} ({summary.budgetUtilizationPct}%)
          </div>
        </div>
        <p className="font-mono text-[10px] text-[#5B5F66]">{summary.disclaimer}</p>
      </div>
    </section>
  );
}
