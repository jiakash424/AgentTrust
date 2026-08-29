import React from "react";
import {
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Building2,
  MapPin,
  Tag,
  ShieldCheck,
  ArrowRight,
  Mail,
  MessageSquare,
} from "lucide-react";
import { Badge, Button } from "./ui";

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

  // Split text into paragraphs and lines
  const rawLines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // If the content is simple plain text without markdown, format into clean paragraphs
  const renderInlineFormatted = (text: string) => {
    // Replace markdown bold **text** with <strong>
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|https?:\/\/[^\s]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-[var(--color-ink)]">
            {part.slice(2, -2)}
          </strong>
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

  // Helper to check if a line is a bullet or numbered item
  const isListItem = (line: string) => {
    return /^(\*|-|•|\d+\.)\s+/.test(line);
  };

  const getListItemContent = (line: string) => {
    return line.replace(/^(\*|-|•|\d+\.)\s+/, "");
  };

  // Parse sections and blocks
  const parseBlocks = () => {
    const blocks: Array<{
      type: "header" | "keyvalue" | "list" | "paragraph" | "callout";
      content: any;
    }> = [];
    let currentList: string[] = [];

    // Helper to process inline key-value pairs separated by dashes or bullets
    const processLine = (line: string) => {
      // Check if line contains multiple bold key-values joined by dashes (e.g. "**ID:** xyz - **Company:** abc")
      if (line.includes(" - **") || line.includes(" - *")) {
        const segments = line.split(/\s+-\s+(?=\*\*|\*)/);
        if (segments.length > 1) {
          if (currentList.length > 0) {
            blocks.push({ type: "list", content: [...currentList] });
            currentList = [];
          }
          segments.forEach((seg) => {
            blocks.push({ type: "keyvalue", content: seg.trim() });
          });
          return;
        }
      }

      if (isListItem(line)) {
        currentList.push(getListItemContent(line));
      } else {
        if (currentList.length > 0) {
          blocks.push({ type: "list", content: [...currentList] });
          currentList = [];
        }

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
        } else if (
          /^\*\*[^*]+:\*\*/.test(line) ||
          /^\*\*[^*]+\*\*:/.test(line)
        ) {
          blocks.push({ type: "keyvalue", content: line });
        } else {
          blocks.push({ type: "paragraph", content: line });
        }
      }
    };

    rawLines.forEach((line) => processLine(line));

    if (currentList.length > 0) {
      blocks.push({ type: "list", content: currentList });
    }

    return blocks;
  };

  const blocks = parseBlocks();

  return (
    <div className="space-y-4 text-[14.5px] leading-relaxed text-[var(--color-ink)]">
      {blocks.map((block, idx) => {
        if (block.type === "header") {
          return (
            <div
              key={idx}
              className="pt-3 pb-1 border-b border-[var(--color-line)] first:pt-0"
            >
              <h4 className="text-base font-semibold text-[var(--color-ink)] flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--color-coral)]" />
                {block.content}
              </h4>
            </div>
          );
        }

        if (block.type === "keyvalue") {
          return (
            <div
              key={idx}
              className="flex items-start gap-2 py-1 px-3 rounded-lg bg-[var(--color-surface-2)]/70 border border-[var(--color-line)] text-sm"
            >
              <span className="text-[var(--color-ink-soft)] font-medium shrink-0">
                {renderInlineFormatted(block.content)}
              </span>
            </div>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={idx} className="space-y-2 my-2 pl-1">
              {block.content.map((item: string, itemIdx: number) => (
                <li
                  key={itemIdx}
                  className="flex items-start gap-2.5 text-sm leading-relaxed"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-coral)] mt-2 shrink-0" />
                  <span className="flex-1">{renderInlineFormatted(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p
            key={idx}
            className="text-sm leading-relaxed text-[var(--color-ink)]"
          >
            {renderInlineFormatted(block.content)}
          </p>
        );
      })}

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
