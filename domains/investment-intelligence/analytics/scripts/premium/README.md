# Investment Analytics Premium Scripts

## Purpose

This folder will contain premium gate and access UI coordination for Investment Analytics pages.

## What belongs here

Future premium modules may coordinate:

- Premium overlay behavior
- Upgrade/login CTA coordination
- Post-login redirect support if applicable

## What does not belong here yet

Premium runtime code should not be moved here yet. Auth primitives belong under `packages/auth/`, route constants belong under `packages/config/`, and this folder should only coordinate investment-page UI behavior.

## Current migration status

Migration status: Phase 5D README-only skeleton; no investment analytics JS/CSS files have been moved here yet.

## Candidate current source files

- Premium gate coordination currently inside investment analytics scripts, if present.
- Related current behavior in `js/premium-content-gate.js` should remain in place until ownership and compatibility are documented.

## First safe migration idea

Do not change access behavior until current premium gate behavior has a smoke checklist.
