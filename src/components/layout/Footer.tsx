import { useState } from "react";
import { Link } from "react-router";
import { Wordmark } from "../brand";
import LegalModal, { LegalTab } from "../LegalModal";

interface FooterProps {
  className?: string;
}

export default function Footer({ className }: FooterProps) {
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>("privacy");

  const openLegal = (tab: LegalTab) => {
    setLegalTab(tab);
    setLegalModalOpen(true);
  };

  return (
    <>
      <footer
        className={`border-t border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)] ${
          className || ""
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 lg:px-8 pt-16 pb-12">
          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-14 pb-14">
            {/* Brand Column */}
            <div className="md:col-span-5 lg:col-span-5 space-y-3">
              <Link to="/" className="inline-block">
                <Wordmark size={26} />
              </Link>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--color-coral)]">
                Autonomous AI Commerce &amp; B2B Sales OS
              </p>
              <p className="text-[13.5px] leading-relaxed text-[var(--color-ink-soft)] max-w-sm pt-1">
                AgentTrust is an autonomous AI-powered commerce and B2B sales
                platform that connects business data, market intelligence, buyer
                research, and sales workflows in one intelligent workspace.
              </p>
            </div>

            {/* Product Links */}
            <div className="md:col-span-2 lg:col-span-2 space-y-3.5">
              <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                Product
              </h4>
              <ul className="space-y-2.5 text-[13.5px]">
                <li>
                  <Link
                    to="/app/dashboard"
                    className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to="/app"
                    className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors"
                  >
                    AI Agents
                  </Link>
                </li>
                <li>
                  <Link
                    to="/app/deals"
                    className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors"
                  >
                    Sales Intelligence
                  </Link>
                </li>
                <li>
                  <Link
                    to="/app/opportunities"
                    className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors"
                  >
                    Market Intelligence
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources Links */}
            <div className="md:col-span-2 lg:col-span-2 space-y-3.5">
              <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                Resources
              </h4>
              <ul className="space-y-2.5 text-[13.5px]">
                <li>
                  <a
                    href="https://github.com/jiakash424/AgentTrust#readme"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/jiakash424/AgentTrust"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <Link
                    to="/app/diagnostics"
                    className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors"
                  >
                    Changelog
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div className="md:col-span-3 lg:col-span-3 space-y-3.5">
              <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                Company
              </h4>
              <ul className="space-y-2.5 text-[13.5px]">
                <li>
                  <a
                    href="#product"
                    className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors"
                  >
                    About AgentTrust
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:support@agenttrust.ai"
                    className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-[var(--color-line)] flex flex-col md:flex-row items-center justify-between gap-4 text-[12.5px] text-[var(--color-ink-faint)]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>&copy; 2026 AgentTrust. All rights reserved.</span>
              <span className="hidden sm:inline">&middot;</span>
              <button
                onClick={() => openLegal("privacy")}
                className="hover:text-[var(--color-ink)] transition-colors cursor-pointer text-left"
              >
                Privacy Policy
              </button>
              <span>&middot;</span>
              <button
                onClick={() => openLegal("terms")}
                className="hover:text-[var(--color-ink)] transition-colors cursor-pointer text-left"
              >
                Terms of Service
              </button>
            </div>

            {/* Operational Status */}
            <div className="flex items-center gap-2 font-mono text-[11.5px] text-[var(--color-ink-soft)] bg-[var(--color-surface-2)] px-2.5 py-1 rounded-full border border-[var(--color-line)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>All systems operational</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive Legal Modal */}
      <LegalModal
        open={legalModalOpen}
        initialTab={legalTab}
        onClose={() => setLegalModalOpen(false)}
      />
    </>
  );
}
