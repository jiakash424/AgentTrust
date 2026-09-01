import React from "react";
import {
  ExternalLink,
  Sparkles,
  ArrowRight,
  Mail,
  MessageSquare,
} from "lucide-react";
import { Button } from "./ui";

interface FormattedChatMessageProps {
  content: string;
  payload?: any;
  onActionClick?: (action: string, payload?: any) => void;
}

export function FormattedChatMessage({
  content,
  payload,
  onActionClick,
}: FormattedChatMessageProps) {
  if (!content) return null;

  // Split text into lines
  const rawLines = content.split("\n").map((l) => l.trim());

  // Render inline formatting (bold, italic, links, code badges)
  const renderInlineFormatted = (text: string) => {
    // Match bold, code backticks, italics, and URLs
    const parts = text.split(
      /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|https?:\/\/[^\s]+)/g,
    );
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-[var(--color-ink)]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        const codeText = part.slice(1, -1);
        return (
          <span
            key={i}
            className="inline-block px-2 py-0.5 text-xs font-mono rounded bg-[var(--color-surface-2)] text-[var(--color-coral-ink)] border border-[var(--color-line)]"
          >
            {codeText}
          </span>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={i} className="italic text-[var(--color-ink-soft)]">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith("http://") || part.startsWith("https://")) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[var(--color-coral)] hover:underline break-all"
          >
            {part.replace(/^https?:\/\/(www\.)?/, "").slice(0, 30)}...
            <ExternalLink size={12} className="shrink-0" />
          </a>
        );
      }
      return part;
    });
  };

  // Helper to check if a line is a bullet item
  const isListItem = (line: string) => /^(\*|-|•|\d+\.)\s+/.test(line);
  const getListItemContent = (line: string) =>
    line.replace(/^(\*|-|•|\d+\.)\s+/, "");

  // Helper to check if line is a markdown table row
  const isTableRow = (line: string) => {
    const trimmed = line.trim();
    return (
      (trimmed.startsWith("|") && trimmed.endsWith("|")) ||
      (trimmed.includes("|") && trimmed.split("|").length >= 3)
    );
  };

  const isTableSeparator = (line: string) => {
    const trimmed = line.trim();
    return /^\|?(\s*:?-+:?\s*\|)+\s*$/.test(trimmed);
  };

  const parseTableCells = (line: string): string[] => {
    let trimmed = line.trim();
    if (trimmed.startsWith("|")) trimmed = trimmed.substring(1);
    if (trimmed.endsWith("|")) trimmed = trimmed.substring(0, trimmed.length - 1);
    return trimmed.split("|").map((c) => c.trim());
  };

  // Parse structured blocks
  const parseBlocks = () => {
    const blocks: Array<{
      type: "header" | "keyvalue" | "list" | "table" | "callout" | "paragraph";
      content: any;
    }> = [];
    let currentList: string[] = [];
    let currentTableRows: string[][] = [];

    const flushList = () => {
      if (currentList.length > 0) {
        blocks.push({ type: "list", content: [...currentList] });
        currentList = [];
      }
    };

    const flushTable = () => {
      if (currentTableRows.length > 0) {
        blocks.push({
          type: "table",
          content: {
            headers: currentTableRows[0] || [],
            rows: currentTableRows.slice(1),
          },
        });
        currentTableRows = [];
      }
    };

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (!line) {
        flushList();
        flushTable();
        continue;
      }

      // 1. Table Detection
      if (isTableRow(line)) {
        flushList();
        if (isTableSeparator(line)) {
          continue; // Ignore separator row like |---|---|
        }
        currentTableRows.push(parseTableCells(line));
        continue;
      } else {
        flushTable();
      }

      // 2. Metric / Summary Callout Detection (e.g. "**Total Inventory:** 500 Units | **Total Valuation:** ₹15,000")
      if (
        (line.includes("**Total Inventory:**") ||
          line.includes("Total Valuation") ||
          line.includes("Total Stock")) &&
        line.includes("|")
      ) {
        flushList();
        blocks.push({ type: "callout", content: line });
        continue;
      }

      // 3. List Item Detection
      if (isListItem(line)) {
        currentList.push(getListItemContent(line));
        continue;
      } else {
        flushList();
      }

      // 4. Header Detection
      if (
        line.startsWith("### ") ||
        line.startsWith("## ") ||
        line.startsWith("# ") ||
        (/^\*\*[^*:]+\*\*$/.test(line) && line.length < 50)
      ) {
        blocks.push({
          type: "header",
          content: line.replace(/^#+\s+/, "").replace(/^\*\*|\*\*$/g, ""),
        });
        continue;
      }

      // 5. Key-Value Detection
      if (
        /^\*\*[^*]+:\*\*/.test(line) ||
        /^\*\*[^*]+\*\*:/.test(line)
      ) {
        blocks.push({ type: "keyvalue", content: line });
        continue;
      }

      // 6. Regular Paragraph
      blocks.push({ type: "paragraph", content: line });
    }

    flushList();
    flushTable();

    return blocks;
  };

  const blocks = parseBlocks();

  // Auto-detect proposals, emails, and buyer companies
  const isProposalOrEmail =
    content.includes("PROPOSAL DRAFT") ||
    content.includes("Subject:") ||
    content.includes("SUBJECT:") ||
    content.includes("Dear ") ||
    content.includes("Warm regards") ||
    content.includes("1️⃣ Heritage") ||
    content.includes("SPECIFIC OUTREACH EMAILS");

  const phoneMatch = content.match(/(\+91[\s-]?[6-9]\d{4}[\s-]?\d{5}|\+91[\s-]?[6-9]\d{9})/);
  const firstPhone = phoneMatch ? phoneMatch[0] : null;

  const discoveredCompanies: string[] = [];
  const compRegex = /(?:🏢|###\s*🏢?\s*)([A-Za-z0-9\s&]+(?:Pvt|Ltd|Mills|Foods|Industries|Exports|Works|Caterers|Agro|Enterprises|Distributors))/g;
  let m;
  while ((m = compRegex.exec(content)) !== null) {
    const compName = m[1].trim();
    if (compName.length > 3 && !discoveredCompanies.includes(compName)) {
      discoveredCompanies.push(compName);
    }
  }

  return (
    <div className="space-y-4 text-[14.5px] leading-relaxed text-[var(--color-ink)]">
      {blocks.map((block, idx) => {
        // 1. HEADERS
        if (block.type === "header") {
          return (
            <div
              key={idx}
              className="pt-4 pb-1 border-b border-[var(--color-line)] first:pt-0"
            >
              <h4 className="text-base font-semibold text-[var(--color-ink)] flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--color-coral)]" />
                {block.content}
              </h4>
            </div>
          );
        }

        // 2. METRIC HIGHLIGHT CALLOUT
        if (block.type === "callout") {
          const segments = block.content.split("|").map((s: string) => s.trim());
          return (
            <div
              key={idx}
              className="flex flex-wrap items-center gap-4 p-3.5 px-4 rounded-xl bg-gradient-to-r from-[var(--color-surface)] to-[var(--color-surface-2)] border border-[var(--color-line)] shadow-sm"
            >
              {segments.map((seg: string, segIdx: number) => (
                <div
                  key={segIdx}
                  className="flex items-center gap-2 text-sm text-[var(--color-ink)] font-medium"
                >
                  {segIdx > 0 && (
                    <span className="text-[var(--color-line)] font-normal mr-2">
                      |
                    </span>
                  )}
                  <span>{renderInlineFormatted(seg)}</span>
                </div>
              ))}
            </div>
          );
        }

        // 3. BEAUTIFUL RESPONSIVE DATA TABLE
        if (block.type === "table") {
          const { headers, rows } = block.content;
          return (
            <div
              key={idx}
              className="my-3 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-sm"
            >
              <div className="w-full">
                <table className="w-full text-left border-collapse table-auto text-xs sm:text-[13px]">
                  <thead>
                    <tr className="bg-[var(--color-surface-2)]/90 border-b border-[var(--color-line)] text-[10.5px] font-mono uppercase tracking-wider text-[var(--color-ink-soft)]">
                      {headers.map((h: string, hIdx: number) => {
                        const cleanHeader = h
                          .replace(/Target Sell Price/i, "Target")
                          .replace(/Cost Price/i, "Cost")
                          .replace(/Stock Units/i, "Stock")
                          .replace(/Margin @ Target/i, "Margin")
                          .replace(/Product Name/i, "Product");
                        return (
                          <th
                            key={hIdx}
                            className={`py-2.5 px-2.5 sm:px-3 font-semibold ${
                              hIdx === 0
                                ? "text-center w-8"
                                : hIdx >= headers.length - 3
                                  ? "text-right"
                                  : "text-left"
                            }`}
                          >
                            {cleanHeader}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-line)]/60">
                    {rows.map((row: string[], rIdx: number) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-[var(--color-surface-2)]/40 transition-colors"
                      >
                        {row.map((cell: string, cIdx: number) => {
                          const isNumeric = /^[₹$+\-\d,.\s%]+$/.test(cell);
                          const isPositiveMargin =
                            cell.includes("+₹") || cell.includes("+ ₹");
                          return (
                            <td
                              key={cIdx}
                              className={`py-2 px-2.5 sm:py-2.5 sm:px-3 text-xs sm:text-[13px] ${
                                cIdx === 0
                                  ? "text-center text-[var(--color-ink-faint)] font-mono w-8"
                                  : cIdx >= headers.length - 3
                                    ? "text-right whitespace-nowrap"
                                    : "text-left"
                              } ${
                                isPositiveMargin
                                  ? "font-bold text-emerald-600 dark:text-emerald-400"
                                  : isNumeric
                                    ? "font-mono font-medium text-[var(--color-ink)]"
                                    : "text-[var(--color-ink)]"
                              }`}
                            >
                              {renderInlineFormatted(cell)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        // 4. KEY-VALUE ROW
        if (block.type === "keyvalue") {
          return (
            <div
              key={idx}
              className="flex items-start gap-2 py-1.5 px-3.5 rounded-lg bg-[var(--color-surface-2)]/60 border border-[var(--color-line)] text-sm"
            >
              <span className="text-[var(--color-ink)] font-medium">
                {renderInlineFormatted(block.content)}
              </span>
            </div>
          );
        }

        // 5. BULLET LIST
        if (block.type === "list") {
          return (
            <ul key={idx} className="space-y-2 my-2.5 pl-1">
              {block.content.map((item: string, itemIdx: number) => (
                <li
                  key={itemIdx}
                  className="flex items-start gap-2.5 text-sm leading-relaxed"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-coral)] mt-2 shrink-0" />
                  <span className="flex-1 text-[var(--color-ink)]">
                    {renderInlineFormatted(item)}
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        // 6. PARAGRAPH
        return (
          <p
            key={idx}
            className="text-sm leading-relaxed text-[var(--color-ink)]"
          >
            {renderInlineFormatted(block.content)}
          </p>
        );
      })}

      {/* Auto-detected 1-Click Action Card for Proposals & Emails */}
      {isProposalOrEmail && (
        <div className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              <Sparkles size={14} />
              <span>1-Click Commercial Dispatch Ready</span>
            </div>
            <span className="text-[11px] text-[var(--color-ink-faint)]">
              Verified Gateway
            </span>
          </div>

          <p className="text-xs text-[var(--color-ink-soft)]">
            NOVA has prepared this customized proposal with your verified seller profile. Send immediately or dispatch via WhatsApp:
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs gap-1.5 shadow-xs cursor-pointer"
              onClick={() => onActionClick?.("send_email_now", { content })}
            >
              <Mail size={13} />
              Send Email Now (1-Click)
            </Button>

            {firstPhone && (
              <a
                href={`https://wa.me/${firstPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                  `Namaste ji, This is Rajesh Sharma from Apex Global Agro Traders. We have prepared a customized bulk procurement quote for your review. When can we connect?`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 transition-colors shadow-xs"
              >
                <MessageSquare size={13} />
                Send via WhatsApp ({firstPhone})
              </a>
            )}

            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 border-[var(--color-line)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(content);
                alert("Proposal copied to clipboard!");
              }}
            >
              Copy Proposal Text
            </Button>
          </div>
        </div>
      )}

      {/* Auto-detected 1-Click Action Buttons for Discovered Buyers */}
      {!isProposalOrEmail && discoveredCompanies.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[var(--color-line)] space-y-2.5">
          <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-ink-faint)]">
            ⚡ Quick Outreach Actions for Researched Buyers:
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {discoveredCompanies.slice(0, 4).map((comp, cIdx) => (
              <Button
                key={cIdx}
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 border-[var(--color-coral)]/30 hover:bg-[var(--color-coral)]/10 hover:text-[var(--color-coral-ink)] cursor-pointer"
                onClick={() =>
                  onActionClick?.("draft_proposal_for", { companyName: comp })
                }
              >
                <Mail size={12} className="text-[var(--color-coral)]" />
                Draft Email for {comp.replace(/🏢|Pvt|Ltd|Foods|Industries|Mills/gi, "").trim()}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Interactive Actions */}
      {payload?.recommendedActions &&
        Array.isArray(payload.recommendedActions) &&
        payload.recommendedActions.length > 0 && (
          <div className="pt-3 mt-4 border-t border-[var(--color-line)] flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-ink-faint)] mr-1">
              Suggested Actions:
            </span>
            {payload.recommendedActions.map((act: any, actIdx: number) => (
              <Button
                key={actIdx}
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 py-1 px-3 border-[var(--color-coral)]/30 hover:bg-[var(--color-coral)]/10 hover:text-[var(--color-coral)] hover:border-[var(--color-coral)]"
                onClick={() => onActionClick?.(act.action, act.payload || act)}
              >
                {act.action?.includes("email") ||
                act.action?.includes("outreach") ? (
                  <Mail size={13} className="text-[var(--color-coral)]" />
                ) : act.action?.includes("whatsapp") ? (
                  <MessageSquare size={13} className="text-emerald-500" />
                ) : (
                  <ArrowRight size={13} />
                )}
                {act.label || act.action}
              </Button>
            ))}
          </div>
        )}
    </div>
  );
}
