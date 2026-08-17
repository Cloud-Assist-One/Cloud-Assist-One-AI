# Cloud Assist One — AI Solutions Website — Product Requirements Document

## Overview

A marketing website for Cloud Assist One's new business focus: setting up and supporting AI (Claude) solutions for small businesses. The company installs Claude AI tools for a customer, trains them on the basics, builds custom commands/agents/skills to run parts of their business, and offers ongoing monthly support.

This is a **new, separate project** from the existing Cloud Assist One cloud-services site (which stays live, untouched, in the `Cloud Assist One` folder). Same company name, different business focus.

## Goals

- Explain the new AI-solutions offering in plain, non-technical language aimed at small business owners.
- Clearly present pricing: the one-time setup fee, the monthly support plan, and hourly rates.
- Drive prospects to submit a contact form to start the process.
- Ship a v1 marketing site now; billing/signup, a customer support portal, and the agent-build workflow are separate future projects (see Non-goals).

## Non-goals (v1)

- No real subscription sign-up or payment processing (no Stripe, no billing) — that's a future phase.
- No customer portal for submitting support tickets or feature requests — that's a future phase.
- No CMS, no database, no user accounts.
- No pages beyond a single homepage (no separate Pricing/About/Blog pages in v1).

This site is sub-project #1 of a larger plan. Later phases (specced separately when it's time to build them):
1. Marketing website *(this PRD)*
2. Subscription & billing (e.g., Stripe)
3. Customer onboarding/setup delivery process
4. Custom agent/command/skill build process
5. Ongoing support & request intake (ticketing)

## Target audience

Small business owners with little-to-no technical background who want to use AI to run parts of their business (customer communication, scheduling, content, admin work, etc.) but don't know how to set it up themselves.

## Technical constraints

- **Stack**: Next.js (React), deployed to Vercel. No database, no auth, no payment processing in v1.
- **Contact**: a contact form (name, email, business type, message) submitted via a no-backend form service (e.g., Formspree) to `info@cloudassistone.com`. No server-side code to maintain.
- **Dependencies**: none added beyond Next.js/Vercel essentials without explicit sign-off from the site owner.

## Pages & features

### Homepage (single page, sectioned)

| Section | Content |
|---|---|
| Header/nav | Logo, links to Services/How It Works/Pricing/Contact, "Get Started" CTA (scrolls to contact form), sticky on scroll, mobile hamburger menu |
| Hero | Headline positioning Cloud Assist One as the AI setup-and-support partner for small businesses, one-line subheadline, CTA to Get Started / See Pricing |
| Services / What's included | Plain-language explanation of what's delivered: installing Claude AI tools, configuring custom commands/agents/skills for the customer's specific business, hands-on training |
| How it works | Numbered flow: Setup call → Install & configure → 1-hour training → Ongoing support |
| Pricing | See pricing table below |
| Why Cloud Assist One | Value props: real working AI tools (not just advice/consulting), ongoing support included, discounted hourly rate for active subscribers, no technical background required |
| Contact form | Name, email, business type, message → submits to `info@cloudassistone.com` via form service |
| Footer | Logo, tagline, contact info (`info@cloudassistone.com`, `407-388-4747`), copyright |

## Pricing

| Item | Price | What's included |
|---|---|---|
| Initial Setup | $250 one-time | All AI tools installed, 1 hour of training, a working baseline of commands/agents/skills for the customer's business |
| Monthly Support | $50/month | Submit support tickets, request new features/agents/commands/skills, discounted rate on additional training |
| Hourly rate — no monthly plan | $175/hour | Extra work/training beyond the initial setup |
| Hourly rate — with active monthly plan | $150/hour | Discounted rate for subscribers needing extra work/training |

Presented as a simple pricing table/cards — not named tiers (e.g. not "Basic/Pro") since it's one path (setup, then optional ongoing plan) plus transparent hourly rates.

## Design

- **Logo**: provided by site owner as a separate file; placed in header and footer, sized via CSS to preserve aspect ratio (same pattern as the existing Cloud Assist One site).
- **Palette/typography**: reuse the existing Cloud Assist One brand (black/near-black + white, electric-blue accent, system font stack) as the default — revisit once the new logo file is available, in case it calls for a different palette.
- **Tone**: approachable, plain-language, non-technical. Explain benefits in business terms (e.g., "answers customer emails while you sleep") rather than AI/technical jargon (e.g., avoid phrases like "autonomous agent orchestration").
- **Responsive**: mobile-first, no horizontal overflow at any width.
- **Accessibility target**: WCAG AA contrast on body text, semantic landmarks, visible focus states on all interactive controls, alt text on all images.

## Status

Not yet built. This PRD is ready for implementation planning.

## Success criteria

- Builds and deploys cleanly on Vercel with no errors.
- No console errors on the page.
- Contact form successfully delivers a test submission to `info@cloudassistone.com`.
- Responsive layout holds with no horizontal overflow across mobile/tablet/desktop widths.
- Pricing section matches the numbers in this document exactly ($250 setup, $50/month, $175/hr, $150/hr with plan).
- All `mailto:`/`tel:` links (where used) resolve correctly.
