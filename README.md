# HireProof — Decentralized AI Headhunter & Soft Skills Verification

HireProof is a bias-free, decentralized recruitment bounty platform. Companies lock a "Sign-on Bounty" in a smart contract alongside a soft-skills rubric. Applicants submit situational interview transcripts or crisis-solving essays. GenLayer's AI Validators objectively evaluate and score their EQ and problem-solving skills on-chain, completely ignoring the applicant's name, gender, or background. If they pass the rubric, the locked bounty is automatically released directly to the candidate as a sign-on bonus.

---

### 💡 Why HireProof DIES without GenLayer
Conventional blockchains cannot read Web2 transcript URLs or perform qualitative, blind soft-skill reviews without resorting to centralized off-chain servers or fragile, trust-compromised oracle networks. **GenLayer solves this natively** by executing non-deterministic LLM analysis (`exec_prompt`) and web requests (`web.render`) directly inside the smart contract, achieving decentralized consensus on qualitative evaluations and releasing sign-on bonuses trustlessly.

---

## Core Architecture

1. **Company creates a Job Bounty**: Locks native GEN tokens and defines a soft-skills rubric.
2. **Applicant submits Transcript URL**: Links to Notion, Gist, or a blog containing situational answers.
3. **Smart Contract Audit**:
   - `web.render` extracts the raw text from the transcript URL.
   - `exec_prompt` acts as a **Blind HR Director**, ignoring demographic features and focusing entirely on empathy, active listening, and logical crisis solving.
   - Evaluates EQ score, Logic score, qualitative feedback, and returns a binary verdict (`PASSED` or `FAILED`).
4. **Custom Semantic HR Validator**:
   - Compares the binary `verdict` field between the leader and validator nodes to reach consensus.
   - If consensus confirms `"PASSED"`, locked bounty is paid out to the applicant immediately.

---

## Project Structure

```bash
HireProof/
├── contracts/
│   └── hireproof.py       # Core Intelligent Smart Contract (v0.2.16)
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main dashboard panel
│   │   ├── index.css      # Obsidian-neon recruitment theme stylesheet
│   │   └── useHireProof.js# Custom react hook wrapping the genlayer-js SDK
│   ├── .env               # Environment variable for contract address
│   ├── .npmrc             # Cloud build peer-dependency resolver config
│   ├── package.json       # React + Vite client dependencies
│   └── vite.config.js     # Dev server configuration
└── README.md              # Documentation
```

---

## Step-by-Step Deployment on GenLayer Studio

### 1. Prepare and Copy Contract Code
- Open **GenLayer Studio** (https://studio.genlayer.com).
- Create a new project or contract file named `hireproof.py`.
- Copy and paste the contents of `contracts/hireproof.py` into the studio editor.

### 2. Compile
- Verify the compiler version in the Studio matches `v0.2.16`.
- Click the **Compile** button in the studio and ensure there are no compilation errors.

### 3. Deploy
- Set the deployment parameters (none are required in the constructor).
- Click **Deploy** to deploy the contract.
- Copy the generated contract address (e.g. `0x876...`).

---

## Running the Frontend Locally

### 1. Configure the Environment
Navigate to the `frontend/` folder and edit the `.env` file to add your deployed contract address:
```bash
VITE_CONTRACT_ADDRESS="YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE"
```

### 2. Install Dependencies
Open a terminal in the `frontend/` directory and run:
```bash
npm install
```

### 3. Run the Development Server
Launch the local Vite server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000` to interact with the dashboard.
