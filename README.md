# Decentralized Freelance Marketplace

A blockchain-powered platform that connects freelancers and clients through a trustless, transparent, and incentivized ecosystem, eliminating intermediaries and ensuring fair payments and dispute resolution.

---

## Overview

The Decentralized Freelance Marketplace leverages blockchain technology to create a secure, transparent platform for freelancers and clients. Built with Clarity smart contracts on the Stacks blockchain, it ensures fair payments, verifiable work agreements, and community-driven dispute resolution. The platform consists of four main smart contracts:

1. **Job Listing Contract** – Manages job postings and applications.
2. **Escrow Contract** – Secures funds until work is completed and approved.
3. **Reputation Contract** – Tracks freelancer and client ratings based on completed jobs.
4. **Dispute Resolution Contract** – Handles disputes through community voting.

---

## Features

- **Decentralized Job Board**: Clients post jobs, freelancers apply, and agreements are recorded on-chain.
- **Secure Escrow Payments**: Funds are locked in escrow until work is delivered and approved.
- **Reputation System**: Transparent, immutable ratings for freelancers and clients based on job outcomes.
- **Community-Driven Disputes**: Decentralized resolution through token-weighted voting.
- **No Intermediaries**: Direct interaction between clients and freelancers, reducing fees.
- **Transparent Agreements**: All job terms and milestones are stored on-chain.
- **Incentivized Participation**: Token rewards for dispute arbitrators.

---

## Smart Contracts

### Job Listing Contract
- Create, update, and close job postings.
- Accept freelancer applications and finalize agreements.
- Store job terms (budget, deadlines, milestones) on-chain.

### Escrow Contract
- Lock client funds in escrow upon job agreement.
- Release funds to freelancers upon client approval or dispute resolution.
- Refund clients if work is not delivered or approved.

### Reputation Contract
- Record ratings for freelancers and clients after job completion.
- Calculate weighted reputation scores based on job value and frequency.
- Publicly queryable reputation data for trust-building.

### Dispute Resolution Contract
- Initiate disputes for unapproved or undelivered work.
- Allow community members to vote on outcomes using platform tokens.
- Distribute rewards to arbitrators for participation.

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started).
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/freelance-marketplace.git
   ```
3. Run tests:
   ```bash
   npm test
   ```
4. Deploy contracts:
   ```bash
   clarinet deploy
   ```

## Usage

Each smart contract operates independently but integrates with others to form the complete marketplace. Refer to individual contract documentation for function calls, parameters, and usage examples.

## License

MIT License

