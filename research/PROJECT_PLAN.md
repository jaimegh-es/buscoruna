# Coruña Bus PWA: Project Specification

A modern, high-performance Progressive Web App for the A Coruña bus system, focusing on intelligent trip planning and real-time data.

## 1. Core Feature: Smart Trip Calculator
The primary goal is to answer: *"Which bus should I take to get to [Destination] by [Time]?"*

- **Input:**
  - Origin (Current location via GPS or manual search).
  - Destination (Search by stop name or address).
  - Target Arrival Time (e.g., "I need to be there at 09:00").
- **Processing:**
  - Identify target stop near destination.
  - Identify origin stop near user.
  - Cross-reference line sequences from the Catalog (`func=7`).
  - Calculate travel duration between stops.
  - Check real-time arrivals (`func=0`) to find the best immediate or upcoming bus.
- **Output:**
  - Recommended Line(s).
  - Time to leave (e.g., "Leave in 5 mins").
  - Arrival time at origin stop.
  - Estimated arrival at destination.

## 2. Secondary Features
- **Real-time Stop View:** Enter a stop ID or select from favorites to see ETAs for all lines.
- **Nearby Stops:** GPS-based discovery of stops within walking distance.
- **Line Explorer:** 
  - View full stop sequences.
  - Live bus positions on a map (`func=99`).
- **Personalization:**
  - Favorite stops and frequent destinations.
  - Recent searches.

## 3. Design Philosophy (No "AI-Slop")
- **Mobile-First:** Optimized for one-handed use and quick interactions on the go.
- **High Contrast & Legibility:** Using the official line colors but ensuring high readability.
- **Minimalist Aesthetic:** Clean typography, purposeful spacing, and intuitive iconography (no unnecessary gradients or cluttered UI).
- **Interactive Feedback:** Smooth transitions and clear loading states (especially for API calls).

## 4. Technical Stack
- **Framework:** [Astro](https://astro.build/) (Static Site Generation + Selective Hydration).
- **Interactivity:** Vanilla JavaScript and Custom Elements (Web Components). We will leverage Astro's component model for structure and native Web Components for client-side state, keeping the bundle small and the logic close to the DOM.
- **Styling:** Vanilla CSS (Modern CSS with variables for themes and colors).
- **Data Layer:**
  - **API:** Reverse-engineered `itranvias.com` endpoints.
  - **Client Storage:** `IndexedDB` for caching the 74KB Catalog for offline use and fast lookups.
- **PWA:** `vite-plugin-pwa` for manifest and service worker management.

## 5. Roadmap
- [ ] **Phase 1: Foundation.** Astro scaffolding, PWA setup, and API service layer.
- [ ] **Phase 2: Data Core.** Catalog caching and search functionality.
- [ ] **Phase 3: The Calculator.** Core logic for route and time estimation.
- [ ] **Phase 4: Real-time & GPS.** Integrating live ETAs and location services.
- [ ] **Phase 5: UI/UX Polish.** Refining the "non-slop" aesthetic and transitions.
