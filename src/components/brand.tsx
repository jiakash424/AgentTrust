import { cn } from "../lib/cn";

export interface LogoProps {
  size?: number;
  className?: string;
  variant?: "primary" | "light" | "dark" | "mono-black" | "mono-white";
}

/**
 * Official AgentTrust Logo Symbol
 * Geometric "A" + "T" monogram integrated with a secure trust shield and Emerald intelligence core.
 */
export function Logo({
  size = 28,
  className,
  variant = "primary",
}: LogoProps) {
  if (variant === "mono-black") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        className={cn("shrink-0", className)}
        aria-hidden
      >
        <path
          d="M256 100 L372 166 V240 L332 232 V184 L256 140 L180 184 V232 L140 240 V166 Z"
          fill="#000000"
        />
        <path
          d="M152 248 H360 C368 248 374 254 372 262 L360 300 H304 V394 L256 418 L208 394 V300 H152 L140 262 C138 254 144 248 152 248 Z"
          fill="#000000"
        />
        <path
          d="M256 166 L292 208 L256 250 L220 208 Z"
          fill="#000000"
          opacity="0.6"
        />
      </svg>
    );
  }

  if (variant === "mono-white") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        className={cn("shrink-0", className)}
        aria-hidden
      >
        <path
          d="M256 100 L372 166 V240 L332 232 V184 L256 140 L180 184 V232 L140 240 V166 Z"
          fill="#FFFFFF"
        />
        <path
          d="M152 248 H360 C368 248 374 254 372 262 L360 300 H304 V394 L256 418 L208 394 V300 H152 L140 262 C138 254 144 248 152 248 Z"
          fill="#FFFFFF"
        />
        <path
          d="M256 166 L292 208 L256 250 L220 208 Z"
          fill="#FFFFFF"
          opacity="0.75"
        />
      </svg>
    );
  }

  if (variant === "light") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        className={cn("shrink-0", className)}
        aria-hidden
      >
        <defs>
          <linearGradient id="lightGemBrand" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#0891B2" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="112" fill="#F8FAFC" />
        <rect
          x="4"
          y="4"
          width="504"
          height="504"
          rx="108"
          stroke="#E2E8F0"
          strokeWidth="6"
        />
        <path
          d="M256 76 L396 142 V254 C396 338 336 406 256 436 C176 406 116 338 116 254 V142 Z"
          stroke="#CBD5E1"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />
        <path
          d="M256 100 L372 166 V240 L332 232 V184 L256 140 L180 184 V232 L140 240 V166 Z"
          fill="#0F172A"
        />
        <path
          d="M152 248 H360 C368 248 374 254 372 262 L360 300 H304 V394 L256 418 L208 394 V300 H152 L140 262 C138 254 144 248 152 248 Z"
          fill="#0F172A"
        />
        <path
          d="M256 166 L292 208 L256 250 L220 208 Z"
          fill="url(#lightGemBrand)"
        />
        <circle cx="256" cy="208" r="4" fill="#FFFFFF" />
      </svg>
    );
  }

  // Primary / Dark variant
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="bgGradBrand" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="shieldGradBrand" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id="gemGradBrand" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>

      <rect width="512" height="512" rx="112" fill="url(#bgGradBrand)" />
      <rect
        x="4"
        y="4"
        width="504"
        height="504"
        rx="108"
        stroke="#1E293B"
        strokeWidth="6"
        opacity="0.6"
      />

      <path
        d="M256 76 L396 142 V254 C396 338 336 406 256 436 C176 406 116 338 116 254 V142 Z"
        stroke="#334155"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />

      <path
        d="M256 100 L372 166 V240 L332 232 V184 L256 140 L180 184 V232 L140 240 V166 Z"
        fill="url(#shieldGradBrand)"
      />

      <path
        d="M152 248 H360 C368 248 374 254 372 262 L360 300 H304 V394 L256 418 L208 394 V300 H152 L140 262 C138 254 144 248 152 248 Z"
        fill="url(#shieldGradBrand)"
      />

      <path
        d="M256 166 L292 208 L256 250 L220 208 Z"
        fill="url(#gemGradBrand)"
      />
      <circle cx="256" cy="208" r="4" fill="#FFFFFF" />
    </svg>
  );
}

export function Wordmark({
  className,
  size = 28,
  variant = "primary",
}: {
  className?: string;
  size?: number;
  variant?: "primary" | "light" | "dark" | "mono-black" | "mono-white";
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size={size} variant={variant} />
      <span className="font-semibold text-[17px] tracking-tight text-[var(--color-ink)] font-sans">
        AgentTrust
      </span>
    </div>
  );
}

/**
 * NOVA Autonomous Agent Mark — Precision Star Pulse Node
 */
export function NovaMark({
  size = 18,
  active = false,
}: {
  size?: number;
  active?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
      aria-hidden
    >
      <defs>
        <linearGradient id="novaGem" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <path
        d="M12 2c.4 4.6 2.4 6.6 7 7-4.6.4-6.6 2.4-7 7-.4-4.6-2.4-6.6-7-7 4.6-.4 6.6-2.4 7-7Z"
        fill="url(#novaGem)"
        className={active ? "nova-dot" : ""}
        style={{ transformOrigin: "center" }}
      />
    </svg>
  );
}
