# VoteSphere 🗳️
> Stellar Soroban-Powered Smart Contract Voting & Governance dApp.

[![Vitest Tests](https://img.shields.io/badge/Vitest-Passing-brightgreen?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright E2E](https://img.shields.io/badge/Playwright-Configured-blueviolet?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)
[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-Active-blue?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/features/actions)
[![Sentry Telemetry](https://img.shields.io/badge/Observability-Sentry_Enabled-success?style=for-the-badge&logo=sentry&logoColor=white)](https://sentry.io/)

VoteSphere is a secure, transparent, and user-friendly decentralized application (dApp) built on the Stellar Network, utilizing Soroban smart contracts for trustless ballot registration, voter verification, and election tallying.

---

## 🛠️ Stellar Belt Program Level 3 Status

VoteSphere is fully compliant with **Level 3 (Orange Belt)** standards, having passed all audit verification guidelines.

### Level 3 Checklist Achievements
- [x] **Frontend Unit Testing**: 100% mocked testing environment (Vitest & RTL) covering wallet connection, form validation, page rendering, and state management.
- [x] **End-to-End Integration Testing**: 5 core user journey scenarios implemented via Playwright.
- [x] **GitHub Actions CI/CD**: Automated pipelines for Frontend CI, Rust smart contract compilation verification, and Deploy Preview build checks.
- [x] **Centralized Observability**: Centralized error tracking and telemetry powered by Sentry.
- [x] **Event Stream Resilience**: RPC event polling with automated reconnects and exponential backoff.

---

## 🧪 Testing Infrastructure

### Unit Testing
Unit tests target component-level code, form handling, and state stores. The tests run in a headless `jsdom` environment with complete mocks for the `@stellar/stellar-sdk` and `@creit.tech/stellar-wallets-kit`.

```bash
# Run unit tests
npm run test

# Run unit tests with coverage reporting
npm run test:coverage
```

### End-to-End (E2E) Testing
Playwright E2E integration tests verify complete user scenarios:
1. **Wallet Connect Flow**: Connecting wallet, selecting Freighter, and rendering public key.
2. **Create Election Flow**: Progressing through multistepped creation wizard.
3. **Voting Flow**: Viewing option lists, selecting a candidate, and verifying details.
4. **Results Analytics Flow**: Dashboard visualization of on-chain metrics and winner details.
5. **Transaction Tracking Flow**: Transferring XLM assets and tracing pending/signing/success status changes.

```bash
# Run Playwright E2E tests
npm run test:e2e
```

---

## 🚀 GitHub Actions CI/CD Workflows

Three automated pipelines run on code changes to guarantee build integrity:
1. **Frontend CI (`ci.yml`)**: Installs dependencies, runs lint verification, executes Vitest unit tests, and verifies Vite production compile.
2. **Smart Contract Verification (`contract-check.yml`)**: Formats Rust workspace, runs Cargo Clippy lint checking, executes Rust unit tests, and builds WebAssembly contract binaries.
3. **Deploy Preview Verification (`deploy-preview.yml`)**: End-to-end preview compile of both smart contracts (Rust target wasm32) and Frontend static assets.

---

## 👁️ Observability & Telemetry

A custom centralized wrapper around `@sentry/react` provides robust logging and error tracing:
- **Central Exception Tracking**: Intercepts failed transactions and RPC operations to log exact error contexts.
- **Session Identification**: Syncs the active connected Stellar public key to Sentry user context.
- **Console Fallback**: Gracefully falls back to standard developer logs in local environment when `VITE_SENTRY_DSN` is empty.

---

## 📡 Resilient Event Polling

To ensure uninterrupted synchronicity with Soroban contract events, our `EventStreamService` features:
- **Recursive Polling timeouts**: Prevents process stack overflow compared to static intervals.
- **Exponential Backoff**: Doubles polling intervals on RPC connection drops (starting at 4s, scaling up to 60s max) to protect resources and prevent server spam.
- **Auto-reconnect Recovery**: Resets backoff delay instantly to 4s upon the first successful ledger retrieval.
