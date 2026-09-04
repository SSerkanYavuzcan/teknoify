# 03 — Marketing Architecture & Design Foundation Proposal

This proposal is grounded in what the repository proves the product is today (doc 01 §6–§7) and in the ownership boundary (doc 02 §1). It does not invent products. Where a surface depends on an unresolved question, the question ID from doc 02 §5 is cited.

---

## 1. Current product reality (from the codebase)

What the site *claims* today, in its own words:

- Positioning: "Kurumsal Otomasyon & Veri Çözümleri"; hero "Geleceğin İş Gücünü Bugün İnşa Edin"; sub-line about AI-based automation raising business efficiency.
- Eight service cards on the homepage hub: Eğitim & Danışmanlık, Yatırım Analizleri, RPA, Finans Bot (financial indicators), Web Scraping, API Entegrasyonu, Veri Analitiği (links to `/demo/?service=data-analytics`), AI Asistan.
- One public demo (`/demo/`): web-scraping price comparison, currently an empty table.
- Pricing page with three tiers (Başlangıç, Premium ₺199/ay, Profesyonel) not linked from the navigation (U8).
- An authenticated product surface that, in its own UI copy, mostly reports "kaynak bağlı değil / kullanılamıyor" (billing, API keys, webhooks, team), plus a handful of real tools behind entitlements: BİM API console, web-scraping price comparison, geo-intelligence map, product-discover agent, investment market dashboard, personal finance.
- Legal: KVKK, privacy, terms, service agreement (Turkish).

What is real enough to market now: automation and data services (RPA, scraping, API integration, AI assistant), an investment analytics product with a premium tier, an agents/tools workspace (the platform), and training/consulting (U9).

---

## 2. Proposed information architecture

### Needed now (justified by current product reality)

| Surface | Purpose | Source of content | Notes |
| --- | --- | --- | --- |
| **Home** `/` | Value proposition, what Teknoify is, the three pillars (Automation services · AI agents & tools platform · Investment intelligence), proof of technical credibility, primary CTA "Start using Teknoify" → platform, secondary "Talk to us" | existing hero + hub copy, rewritten | Single `h1`. |
| **Product** `/product` | What the platform is: agents, tools, automations, workspace, how it works | dashboard UI copy (AI Hub, Araçlar & Servisler, Çalışma Alanı), product owner | Must not fake screens; use real product screenshots once platform UI is stable. |
| **Tools / Agents** `/tools` (index) + `/tools/<slug>` | One page per real tool/agent: web-scraping price comparison, product-discover, geo-intelligence, BİM API console, investment market data | `dashboard/*` tool pages, `demo/` catalog | Only tools that exist; each page links to the platform deep link. |
| **Services** `/services` + `/services/{rpa,web-scraping,api-integration,ai-assistant,training-consulting}` | The consultancy/automation offerings that exist today as `pages/*.html` | existing copy | Keep old URLs via 301. |
| **Investment** `/investment` | Marketing landing for investment analytics + premium tier; the interactive calculators move to the platform | `pages/investment-analytics.html` copy | Financial disclaimer stays. |
| **Security & Trust** `/security` | Data handling, hosting (Netlify/GCP/Render), auth (Firebase), KVKK compliance, no fake certifications | docs/security (to be written), platform team | Short and honest; grows later. |
| **Contact** `/contact` (+ homepage section) | Lead capture | existing form fields (name, email/phone, service, message) | Endpoint decision U6. |
| **Legal** `/legal/{privacy,kvkk,terms,service-agreement}` | Existing texts | `pages/*.html` | Old URLs 301. |
| **Demo** `/demo` | Interactive demos | `demo/` | Canonical decision U2. |
| **Sign in** / **Start using Teknoify** | Links to `https://platform.teknoify.com/...` | — | No auth UI here. |

### Needed soon

- **Pricing** `/pricing` — once U8 confirms real, purchasable plans. Until then the Investment page may show the premium tier only.
- **Use cases / Solutions** — one page per proven customer scenario (retail price intelligence, BİM request automation) written from real tool usage, not templates.
- **Changelog / What's new** — fed by platform releases.

### Future (architecture must allow, navigation must not show yet)

- Resources (blog, guides, docs), Customers (only with permission), Careers, English locale (`/en/`), Status page link, Partner/integrations directory.

### Navigation direction

Primary nav: Product · Tools · Services · Investment · Security · (Pricing when ready) · Sign in · **Start using Teknoify**. Footer: product/tool links, services, legal, contact, social (only real accounts). Mobile: full-screen sheet with accordion groups, focus-trapped, Escape to close; no hover-only menus.

### URL contract and redirects

Freeze in Phase B: new slugs above; 301 from every current public URL (`/pages/rpa.html` and `/pages/rpa` → `/services/rpa`, etc.), `/dashboard/*` → platform (cleanup track), `/pages/login.html` and `/login.html` → platform sign-in, `/pages/subscription.html` → `/pricing` or `/investment`, `/domains/**` → 404 (or 410).

---

## 3. Content architecture

- **Content as data**: each page's metadata (title, description, canonical, OG image, structured data type), and each tool/service entry (name, one-liner, capabilities, platform deep link, status: `available | beta | coming-soon`) lives in typed content files, not in HTML. A tool with status `coming-soon` may not be published publicly.
- **Single source for the shell**: header, footer, consent banner, contact form are components rendered once.
- **Tokens before pages**: typography scale, color roles, spacing, radius, motion live in one token file that generates CSS custom properties.
- **Locale-ready**: Turkish first; strings in content files so an English locale can be added without touching templates.
- **SEO layer**: automatic canonical, sitemap, robots, OG/Twitter meta, JSON-LD (`Organization`, `WebSite`, `Product`/`SoftwareApplication` for tools, `Article` later), `noindex` by default for anything not in the content model.

### Recommended toolchain (decision to confirm in Phase B/D)

**Astro** (static output) with the official Netlify adapter is recommended:

- Zero client JS by default fits a marketing site whose current problem is unnecessary JS; islands allow small interactive pieces (nav, consent, contact form, demo widgets) without a framework runtime.
- Content collections give the typed content model above with build-time validation.
- Built-in image optimization, view transitions, and `<head>` management address the SEO/performance gaps directly.
- Deploys to Netlify with a `dist/` publish directory, which also solves the "repo root is public" exposure (R-14).
- Framework-agnostic islands mean the platform team's stack does not constrain this repo.

Alternative if the team wants one language with the platform: Next.js static export. It carries a React runtime on every page and a heavier toolchain; only pick it if shared React components with the platform are a real, near-term need. Do not choose a client-rendered SPA.

---

## 4. Brand / design foundation (recommendation only)

Goal: premium, deliberate, technically credible, fast, accessible. The current site already has a defensible seed (dark, indigo accent, monospace "terminal" motif, Inter Tight). Build on that identity; drop the generic-dark-SaaS execution.

| Primitive | Recommendation |
| --- | --- |
| **Typography philosophy** | Two families: a geometric/grotesk sans for UI and headlines (keep **Inter Tight** or move to a distinctive alternative with similar metrics), and a monospace for code/technical accents (**Fira Code** or JetBrains Mono). Self-host with `font-display: swap`, subset to Latin + Turkish. Tight tracking on display sizes, generous line-height on body. |
| **Type scale** | Fluid scale with `clamp()`: display 56–88, h1 40–64, h2 32–44, h3 24–28, body 16–18, small 14, caption 12. Max line length 65–75 ch. |
| **Color roles** | Semantic tokens, not raw hex in components: `bg.canvas`, `bg.surface`, `bg.elevated`, `fg.primary`, `fg.muted`, `border.subtle`, `border.strong`, `accent`, `accent.fg`, `success`, `warning`, `danger`, `focus`. Light and dark themes from day one (the current site is dark-only; a light theme is expected for enterprise buyers and print). |
| **Neutral system** | 10–12 step near-black to white with a slight cool tint (the current `#050505`/`#0f1014` are fine anchors). Avoid pure black on OLED banding; avoid pure white text. |
| **Accent strategy** | One primary accent (the existing indigo `#6366f1` family) used sparingly for CTAs, links, focus and one signature gradient reserved for the hero headline. A second technical accent (cyan/teal) only for data/monospace elements. No purple-gradient washes on surfaces. |
| **Spacing** | 4 px base, scale 4/8/12/16/24/32/48/64/96/128. Section rhythm 96–128 desktop, 64–80 mobile. |
| **Containers** | Content 72 rem (1152 px), wide 80 rem, prose 65 ch. Consistent 24 px gutters on mobile. |
| **Radius** | 4 (controls), 8 (cards), 12 (panels), 999 (pills). Never mix per page. |
| **Borders** | 1 px hairlines using `border.subtle` on dark and `border.strong` on light; borders over shadows for dark surfaces. |
| **Shadows** | Two levels only (raised, overlay); dark theme relies on borders and subtle inner highlights instead of shadows. |
| **Icons** | Single inline SVG set (Lucide or Phosphor, 1.5 px stroke), 20/24 px, `aria-hidden` with text labels. No icon font. |
| **Imagery** | Real product UI captured from the platform, framed in a restrained device/window chrome with consistent radius and border; no stock photos, no fake dashboards, no fake logos/testimonials/metrics. |
| **Illustration** | Abstract, geometric, monochrome line-work derived from the "grid/terminal" motif, used as section accents at low contrast. |
| **Product screenshot treatment** | Same chrome component everywhere; dark and light variants; lazy-loaded, `width`/`height` set, AVIF/WebP. |
| **Motion** | Purpose-driven only: reveal on scroll (opacity + 8 px translate, 200–300 ms, once), hover affordance (150 ms), page transitions optional. Everything behind `prefers-reduced-motion`. The canvas grid may survive as a single, GPU-cheap, paused-when-hidden hero background; the DOM particle field should not. |
| **Section rhythm** | Alternate content density: statement → proof → detail → CTA. Each section has one job and one heading level. |
| **Desktop / mobile relationship** | Mobile-first components; desktop adds columns, never new features. Touch targets ≥ 44 px, sticky CTA on mobile product pages, no hover-dependent disclosure. |
| **Accessibility baseline** | WCAG 2.2 AA: 4.5:1 text, 3:1 UI, visible focus (`focus` token, 2 px offset ring), skip link, landmarks, dialog pattern for menu/consent, reduced motion, 200 % zoom reflow at 320 px. |

Avoid: glassmorphism everywhere, floating cards, template SaaS sections ("Trusted by" with fake logos), copy inflation, animation for its own sake.

---

## 5. Responsive philosophy

- One breakpoint set: 40 rem (640), 48 rem (768), 64 rem (1024), 80 rem (1280); content-driven container queries for components.
- Layout primitives (Stack, Cluster, Grid, Sidebar, Switcher) instead of per-page media queries.
- No `overflow-x: hidden` on `body` as a fix; overflow is a bug to be found in preview.
- Every PR preview is checked at 375, 390, 768, 1024, 1440 widths with automated screenshots.

---

## 6. Motion principles

1. Motion communicates state or hierarchy; if removing it loses nothing, remove it.
2. Durations 150–300 ms; easings `ease-out` for entrances, `ease-in-out` for movement.
3. Reveal animations run once, never on every scroll.
4. Background effects must pause when off-screen or hidden and must not exceed a frame budget on a mid-range phone.
5. `prefers-reduced-motion: reduce` disables all non-essential motion globally, not per component.
