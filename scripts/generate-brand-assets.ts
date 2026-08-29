import fs from "fs";
import path from "path";
import sharp from "sharp";

const PUBLIC_DIR = path.join(process.cwd(), "public");

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// 1. Primary Vector Logo (Obsidian + Silver Monogram + Emerald Core)
const logoPrimarySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E2E8F0"/>
    </linearGradient>
    <linearGradient id="gemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10B981"/>
      <stop offset="50%" stop-color="#06B6D4"/>
      <stop offset="100%" stop-color="#3B82F6"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Container Squircle -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <rect x="4" y="4" width="504" height="504" rx="108" stroke="#1E293B" stroke-width="6" opacity="0.6"/>

  <!-- Subtle Shield Perimeter -->
  <path d="M256 76 L396 142 V254 C396 338 336 406 256 436 C176 406 116 338 116 254 V142 Z"
        stroke="#334155" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>

  <!-- "A" / "T" Monogram & Shield Core Geometry -->
  <!-- Left Wing of "A" / Shield Crest -->
  <path d="M256 100 L372 166 V240 L332 232 V184 L256 140 L180 184 V232 L140 240 V166 Z"
        fill="url(#shieldGrad)"/>

  <!-- "T" Crossbeam -->
  <path d="M152 248 H360 C368 248 374 254 372 262 L360 300 H304 V394 L256 418 L208 394 V300 H152 L140 262 C138 254 144 248 152 248 Z"
        fill="url(#shieldGrad)"/>

  <!-- Inner Diamond Intel Core (NOVA Nexus) -->
  <path d="M256 166 L292 208 L256 250 L220 208 Z" fill="url(#gemGrad)" filter="url(#glow)"/>
  <circle cx="256" cy="208" r="4" fill="#FFFFFF"/>
</svg>`;

// 2. Light Mode Vector Logo (Clean light background with dark obsidian mark)
const logoLightSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="lightGem" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#0891B2"/>
    </linearGradient>
  </defs>

  <rect width="512" height="512" rx="112" fill="#F8FAFC"/>
  <rect x="4" y="4" width="504" height="504" rx="108" stroke="#E2E8F0" stroke-width="6"/>

  <path d="M256 76 L396 142 V254 C396 338 336 406 256 436 C176 406 116 338 116 254 V142 Z"
        stroke="#CBD5E1" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>

  <path d="M256 100 L372 166 V240 L332 232 V184 L256 140 L180 184 V232 L140 240 V166 Z"
        fill="#0F172A"/>

  <path d="M152 248 H360 C368 248 374 254 372 262 L360 300 H304 V394 L256 418 L208 394 V300 H152 L140 262 C138 254 144 248 152 248 Z"
        fill="#0F172A"/>

  <path d="M256 166 L292 208 L256 250 L220 208 Z" fill="url(#lightGem)"/>
  <circle cx="256" cy="208" r="4" fill="#FFFFFF"/>
</svg>`;

// 3. Monochrome Black Vector Logo
const logoMonoBlackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <path d="M256 100 L372 166 V240 L332 232 V184 L256 140 L180 184 V232 L140 240 V166 Z" fill="#000000"/>
  <path d="M152 248 H360 C368 248 374 254 372 262 L360 300 H304 V394 L256 418 L208 394 V300 H152 L140 262 C138 254 144 248 152 248 Z" fill="#000000"/>
  <path d="M256 166 L292 208 L256 250 L220 208 Z" fill="#000000" opacity="0.6"/>
</svg>`;

// 4. Monochrome White Vector Logo
const logoMonoWhiteSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <path d="M256 100 L372 166 V240 L332 232 V184 L256 140 L180 184 V232 L140 240 V166 Z" fill="#FFFFFF"/>
  <path d="M152 248 H360 C368 248 374 254 372 262 L360 300 H304 V394 L256 418 L208 394 V300 H152 L140 262 C138 254 144 248 152 248 Z" fill="#FFFFFF"/>
  <path d="M256 166 L292 208 L256 250 L220 208 Z" fill="#FFFFFF" opacity="0.7"/>
</svg>`;

// 5. Adaptive SVG Favicon (Theme aware)
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <style>
    @media (prefers-color-scheme: light) {
      .bg { fill: #0F172A; }
      .symbol { fill: #FFFFFF; }
      .core { fill: #10B981; }
    }
    @media (prefers-color-scheme: dark) {
      .bg { fill: #0F172A; }
      .symbol { fill: #F8FAFC; }
      .core { fill: #06B6D4; }
    }
  </style>
  <rect width="512" height="512" rx="112" class="bg" fill="#0F172A"/>
  <path d="M256 100 L372 166 V240 L332 232 V184 L256 140 L180 184 V232 L140 240 V166 Z" class="symbol" fill="#FFFFFF"/>
  <path d="M152 248 H360 C368 248 374 254 372 262 L360 300 H304 V394 L256 418 L208 394 V300 H152 L140 262 C138 254 144 248 152 248 Z" class="symbol" fill="#FFFFFF"/>
  <path d="M256 166 L292 208 L256 250 L220 208 Z" class="core" fill="#10B981"/>
</svg>`;

// 6. Social / OpenGraph Card (1200 x 630)
const ogCardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" fill="none">
  <defs>
    <linearGradient id="ogBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0F17"/>
      <stop offset="50%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#030712"/>
    </linearGradient>
    <radialGradient id="ogGlow" cx="20%" cy="50%" r="40%">
      <stop offset="0%" stop-color="#10B981" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#10B981" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ogShield" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#CBD5E1"/>
    </linearGradient>
    <linearGradient id="ogGem" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#06B6D4"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#ogBg)"/>
  <rect width="1200" height="630" fill="url(#ogGlow)"/>

  <!-- Logo Mark Left -->
  <g transform="translate(120, 195) scale(0.47)">
    <rect width="512" height="512" rx="112" fill="#1E293B" opacity="0.5"/>
    <path d="M256 100 L372 166 V240 L332 232 V184 L256 140 L180 184 V232 L140 240 V166 Z" fill="url(#ogShield)"/>
    <path d="M152 248 H360 C368 248 374 254 372 262 L360 300 H304 V394 L256 418 L208 394 V300 H152 L140 262 C138 254 144 248 152 248 Z" fill="url(#ogShield)"/>
    <path d="M256 166 L292 208 L256 250 L220 208 Z" fill="url(#ogGem)"/>
  </g>

  <!-- Typography -->
  <text x="400" y="270" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="68" font-weight="800" fill="#FFFFFF" letter-spacing="-1.5">AgentTrust</text>
  <text x="400" y="325" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="600" fill="#10B981" letter-spacing="2.5">AUTONOMOUS B2B COMMERCE &amp; SALES OS</text>
  <text x="400" y="380" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="400" fill="#94A3B8">AI Agent NOVA · Buyer Intelligence · Live Inventory Pricing</text>
</svg>`;

// Helper: Build ICO file buffer containing standard sizes (16, 32, 48)
function createIco(pngBuffers: { size: number; buffer: Buffer }[]): Buffer {
  const numImages = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(numImages, 4); // Image count

  const dirEntries: Buffer[] = [];
  let currentOffset = 6 + numImages * 16;

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.size >= 256 ? 0 : item.size, 0); // Width
    entry.writeUInt8(item.size >= 256 ? 0 : item.size, 1); // Height
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // Size of image data
    entry.writeUInt32LE(currentOffset, 12); // Offset of image data
    dirEntries.push(entry);
    currentOffset += item.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map((b) => b.buffer)]);
}

async function generateAllAssets() {
  console.log("Generating AgentTrust Brand Assets...");

  // 1. Write SVGs
  fs.writeFileSync(path.join(PUBLIC_DIR, "logo-primary.svg"), logoPrimarySvg);
  fs.writeFileSync(path.join(PUBLIC_DIR, "logo-dark.svg"), logoPrimarySvg);
  fs.writeFileSync(path.join(PUBLIC_DIR, "logo-light.svg"), logoLightSvg);
  fs.writeFileSync(path.join(PUBLIC_DIR, "logo-mono-black.svg"), logoMonoBlackSvg);
  fs.writeFileSync(path.join(PUBLIC_DIR, "logo-mono-white.svg"), logoMonoWhiteSvg);
  fs.writeFileSync(path.join(PUBLIC_DIR, "favicon.svg"), faviconSvg);

  const svgBuffer = Buffer.from(logoPrimarySvg);

  // 2. Generate PNG Favicons
  const sizes = [16, 32, 48, 64, 180, 192, 512];
  const icoBuffers: { size: number; buffer: Buffer }[] = [];

  for (const size of sizes) {
    const pngBuffer = await sharp(svgBuffer).resize(size, size).png().toBuffer();

    if (size === 16) {
      fs.writeFileSync(path.join(PUBLIC_DIR, "favicon-16x16.png"), pngBuffer);
      icoBuffers.push({ size: 16, buffer: pngBuffer });
    } else if (size === 32) {
      fs.writeFileSync(path.join(PUBLIC_DIR, "favicon-32x32.png"), pngBuffer);
      icoBuffers.push({ size: 32, buffer: pngBuffer });
    } else if (size === 48) {
      fs.writeFileSync(path.join(PUBLIC_DIR, "favicon-48x48.png"), pngBuffer);
      icoBuffers.push({ size: 48, buffer: pngBuffer });
    } else if (size === 64) {
      fs.writeFileSync(path.join(PUBLIC_DIR, "favicon-64x64.png"), pngBuffer);
    } else if (size === 180) {
      fs.writeFileSync(path.join(PUBLIC_DIR, "apple-touch-icon.png"), pngBuffer);
    } else if (size === 192) {
      fs.writeFileSync(path.join(PUBLIC_DIR, "android-chrome-192x192.png"), pngBuffer);
    } else if (size === 512) {
      fs.writeFileSync(path.join(PUBLIC_DIR, "android-chrome-512x512.png"), pngBuffer);
    }
  }

  // 3. Write ICO Favicon
  const icoFile = createIco(icoBuffers);
  fs.writeFileSync(path.join(PUBLIC_DIR, "favicon.ico"), icoFile);

  // 4. Generate OpenGraph Preview Card
  const ogBuffer = await sharp(Buffer.from(ogCardSvg)).resize(1200, 630).png().toBuffer();
  fs.writeFileSync(path.join(PUBLIC_DIR, "og-image.png"), ogBuffer);

  // 5. Generate PWA Web Manifest
  const manifest = {
    name: "AgentTrust — Autonomous B2B Sales & Intelligence OS",
    short_name: "AgentTrust",
    description: "AI-native B2B commerce operating system powered by NOVA agent.",
    start_url: "/",
    display: "standalone",
    background_color: "#0F172A",
    theme_color: "#0F172A",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
  fs.writeFileSync(
    path.join(PUBLIC_DIR, "site.webmanifest"),
    JSON.stringify(manifest, null, 2),
  );

  console.log("✔ All brand assets generated in public/ directory successfully!");
}

generateAllAssets().catch((err) => {
  console.error("Error generating brand assets:", err);
  process.exit(1);
});
