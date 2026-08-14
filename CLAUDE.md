# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server (binds 0.0.0.0:5173)
- `npm run build` — type-check (`tsc -b`) then build to `dist/`
- `npm run preview` — serve the production build

There is no test suite and no linter configured. Type-checking via `npx tsc -b` is the only static verification.

## What this app is

**AUMA FLOW** is a Danish-language customer database ("kundekartotek") PWA for a vehicle decoration/wrapping business. All UI text, database column names, and OCR labels are Danish (with æ/ø transliterated in identifiers: `skaerme`, `foererhus`, `kant_paa_hjul`). Keep new UI text in Danish.

Stack: React 18 + TypeScript + Vite + Tailwind. Backend is Supabase (Postgres + Storage), deployed on Vercel as an SPA (`vercel.json` rewrites everything to `index.html`). Mobile-first PWA — note the `env(safe-area-inset-top)` padding, `manifest.json`, and the `isMobile()` user-agent check duplicated in `App.tsx` and `FlowForm.tsx`.

## Architecture

### Single-component state machine, no router

`src/App.tsx` is the hub. Navigation is a `view` state (`'home' | 'create' | 'edit' | 'search' | 'scan' | 'media'`) plus an `activeTab` state (`'kunde' | 'flow' | 'billeder'`) for the customer card. All customer CRUD, the scan-confirm workflow, and print/PDF dispatch live here; components under `src/components/` receive callbacks.

### Supabase backend

- Client and credentials are hardcoded in `src/lib/supabase.ts` (anon key, no env vars).
- Schema lives in `setup.sql` — a **destructive drop-and-recreate script** run manually in the Supabase SQL editor. It is the source of truth for the schema; keep it in sync with `src/types/customer.ts` when changing tables. RLS is enabled but with allow-all policies (no auth in the app).
- Tables: `customers` → `customer_vehicles` (one per truck, the "Flow" tab) → `vehicle_field_images` (one image per flow field); `customers` → `customer_images` (gallery, optional `customer_albums`).
- Images go in the public storage bucket `customer-images`; rows store the full public URL, built as `${supabaseUrl}/storage/v1/object/public/customer-images/<path>`. Deletion parses the path back out of the URL (see `handleImageDelete` in `App.tsx`).
- `.github/workflows/supabase-keepalive.yml` pings the REST API twice a week so the free-tier project isn't paused after 7 idle days. It greps the URL and anon key out of `src/lib/supabase.ts`, so keep that file's format stable if you touch it.

### OCR scan pipeline

The "Scan" feature turns a photographed/PDF work sheet into database rows:

1. `ImageScanner.tsx` → `scanFile()` in `src/lib/scanParser.ts`: Tesseract.js OCR for images; `pdfjs-dist` for PDF text + embedded-image extraction (PDF.js worker is loaded from the cdnjs CDN).
2. `parseScannedText()` matches Danish labels (`LABEL_DEFS`) against OCR output — longest label first, `Bemærkninger` section handled specially.
3. `ScanPreview.tsx` lets the user verify/edit the parsed key→value pairs.
4. `App.handleScanConfirm()` splits confirmed fields into customer fields vs flow fields using the `flowFields` set in `App.tsx`, auto-creates the customer and a `customer_vehicles` row, and uploads any images extracted from the PDF to the customer gallery.

### Adding/renaming a flow (vehicle) field touches five places

The vehicle field list is duplicated by design; keep all in sync:

1. `setup.sql` — `customer_vehicles` column
2. `src/types/customer.ts` — `CustomerVehicle`, `emptyVehicle`, and `FLOW_FIELDS` (display label + left/right print column)
3. `src/App.tsx` — the `flowFields` set (scan-confirm routing) and the `vehicleData` object in `handleScanConfirm`
4. `src/lib/scanParser.ts` — `LABEL_DEFS` (OCR label variants, including non-accented spellings)
5. `src/components/CustomerPrint.tsx` — print/PDF layout if the field needs special handling

### Print / PDF

`CustomerPrint.tsx` exports `printCustomer()` and `savePDF()`, both building an A4 jsPDF document directly (red-branded layout, vehicles + images fetched from Supabase inside the builder).

## Versioning

`src/version.ts` (`APP_VERSION`) is displayed in the header and bumped in release commits (e.g. "v1.2: …"). Bump it when shipping user-visible changes.

## Communication rules (IMPORTANT)

- **Never paste raw bot or webhook content into chat.** This applies to
  deploy bots (Netlify, Vercel, etc.), GitHub event payloads, CI logs, and
  API responses: do not echo raw JSON, escaped HTML, hidden HTML comments,
  or markdown tables verbatim.
- Summarize such content in one or two plain sentences with at most the one
  or two relevant links, e.g. "Netlify deploy preview is ready: <URL>".
- Keep chat replies short and human-readable; the user often reads them on a
  phone.

## Task tracking (IMPORTANT)

- At the start of every session, create a todo list from the user's requests
  (use the task/todo tools): one item per thing the user asks for.
- Update the list as work proceeds — mark items in progress when started and
  completed as each fix lands — so the user can always see current status.
- When the user adds new requests mid-session, add them to the list
  immediately; never leave the list stale.
