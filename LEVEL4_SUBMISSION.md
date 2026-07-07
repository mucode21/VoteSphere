# VoteSphere Level 4 Submission Document 🗳️
> **Stellar Soroban Orange Belt Certification Portfolio**

VoteSphere has been upgraded to a **Level 4 Production MVP**, fully optimized for onboarding, community testing, observability, and auditability.

---

## 🌟 1. Core Feature Set

1.  **Tamper-Proof Ballot Boxes**: Secure, verifiable voting contracts deployed to Stellar Testnet.
2.  **First-Time Onboarding**: Fully accessible interactive tour guiding new users through Freighter, Albedo, and xBull wallet integration.
3.  **Governance Analytics Dashboard**: Admin stats visualizing average candidate counts, user engagement connection logs, and transaction execution reliability.
4.  **Floating Feedback Collector**: Direct rating and suggestion system exportable to CSV/JSON format.
5.  **Robust Event Stream Polling**: Polling loops are session-aware to instantly terminate orphaned streams on page route unmounts.

---

## 📐 2. Architecture & Tech Stack

```
+-------------------------------------------------------------+
|                          VOTESPHERE                         |
+-------------------------------------------------------------+
|     [ React Frontend ]  ====== (JSON-RPC Fetch Polling) =====+
|      ├── Zustand Store (Local Backup & Analytics Cache)      |
|      └── Observability (Sentry + LogRocket ready layer)      |
|           ||                                         ||     |
|           \/                                         ||     |
|     (Freighter / Albedo)                             ||     |
|           ||                                         ||     |
|           \/                                         ||     |
|   [ Stellar Testnet ]                                ||     |
|     ├── Election Registry Contract ───────────────────╣     |
|     ├── Voting Contract ──────────────────────────────╣     |
|     └── Results Tally Contract ───────────────────────+     |
+-------------------------------------------------------------+
```

*   **Framework**: Vite + React + TypeScript + TailwindCSS.
*   **State Management**: Zustand (persisting local feedback logs, telemetry, and theme configurations).
*   **Stellar SDK**: `@stellar/stellar-sdk` v16.0.1.
*   **RPC Status Poll Fallback**: Fallback raw HTTP JSON-RPC POST requests to bypass XDR switch decoding exceptions.

---

## 🚀 3. Onboarding & Tour Walkthrough
*   **Automatic Pop-up**: First-time users see a Welcome Screen introducing VoteSphere.
*   **Guided Wallet Steps**: Detail setup guidelines for:
    *   *Freighter*: Browser extension, experimental features, Testnet toggle.
    *   *Albedo*: Inline web signers.
    *   *xBull*: Custom endpoint mapping.
*   **User Guide Action**: Triggerable anytime from the footer link.

---

## 📈 4. Telemetry & Analytics
*   **Tracked Events**: Matches local state logs for wallet connections, successful/failed transactions, elections created, and votes cast.
*   **Computed Ratios**: Tally success rate percentages, turnout averages, and voter adoption rates.

---

## 🛡️ 5. Monitoring & Error Tracking
*   **Telemetry Layer**: Connected directly to `MonitoringService` which maps Sentry captures and stubs LogRocket session replays.
*   **Alert Configuration**: Dashboard configurations (`monitoring-config.json`) trace latency metrics and connection rejections.

---

## 💬 6. User Feedback System
*   **Floating Access**: Button on every page triggers the rating collector modal.
*   **Format Options**: Export comments instantly to Google Sheets compatible CSV or JSON file models.
