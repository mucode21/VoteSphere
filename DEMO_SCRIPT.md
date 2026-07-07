# VoteSphere Demo Video Script 🎥
> **Duration**: 2.5 Minutes (150 Seconds)  
> **Audience**: Hackathon Judges, Reviewers, and Community Members  

---

## 🎬 Part 1: Introduction & Problem Statement (0:00 - 0:30)

*   **Visual**: Show landing page of VoteSphere with high-end glassmorphism styling, clean dark-mode typography, and live network metrics running.
*   **Audio (Presenter)**:  
    "Hello and welcome to VoteSphere—a decentralized voting and governance platform built on the Stellar network using Soroban smart contracts.  
    Traditional voting systems suffer from centralization, lack of public verification, and complex manual audits. VoteSphere fixes this by providing trustless voter authorization, tamper-proof ballot boxes, and real-time result streaming directly from the Stellar ledger."

---

## 🎬 Part 2: User Onboarding & Wallet Connection (0:30 - 0:55)

*   **Visual**: Click on the "User Guide" link in the footer to show the Step-by-Step Onboarding Modal. Highlight Freighter, Albedo, and xBull wallet integration cards.
*   **Audio (Presenter)**:  
    "New users are greeted with our guided onboarding tour, walking them through wallet setups for Freighter, Albedo, and xBull. Let's connect our Freighter wallet. You can see the app fetches our XLM balance and checks active sessions securely."

---

## 🎬 Part 3: Election Creation (0:55 - 1:25)

*   **Visual**: Click "Create Election" CTA, fill in form fields:
    *   Title: "Community Council Election 2026"
    *   Description: "Select the representative for Q3/Q4 term."
    *   Candidates: "Alice", "Bob", "Charlie".
    *   Click Submit, show Freighter signature request, sign transaction, and watch it update state.
*   **Audio (Presenter)**:  
    "Creating an election is fully decentralized. As an admin, I fill out the ballot details and candidate listings. When I submit, a Soroban transaction is built, simulated, and submitted to the Testnet. The registry contract instantiates a new election record instantly."

---

## 🎬 Part 4: Voting & Event Streaming (1:25 - 1:55)

*   **Visual**: Go to the active election page, cast a vote for Bob, sign Freighter window. Show the live toast notification popping up at the bottom right. Navigate to the Dashboard to show the transaction history and the event ledger feed.
*   **Audio (Presenter)**:  
    "Now let's cast a vote. Our ballot is encrypted and signed by the voter's key. Upon submission to the ledger, our session-aware event listener streams the `vote_cast` event directly to all connected clients in real-time. No refreshes required."

---

## 🎬 Part 5: Results & Admin Analytics (1:55 - 2:15)

*   **Visual**: Show the results calculation and the admin analytics dashboard with average candidates, wallet connections, transaction success rate, and turnout statistics.
*   **Audio (Presenter)**:  
    "Once voting concludes, results are compiled on-chain by the results contract. Our Live Dashboard provides real-time auditability, showing system adoption metrics, transaction success rates, and contract activity logs."

---

## 🎬 Part 6: Feedback Widget & Outro (2:15 - 2:30)

*   **Visual**: Click the floating Feedback Widget in the bottom right, select a 5-star rating, select category "UI Improvement", type "Smooth transitions!", submit, and show export to JSON/CSV.
*   **Audio (Presenter)**:  
    "Finally, community feedback is collected locally and can be exported instantly to CSV or JSON formats. VoteSphere is production-ready, fully accessible, and completely verifiable. Try it out today. Thank you!"
