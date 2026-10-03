# Claim Settlement Management MCP Server

Model Context Protocol (MCP) server for the **Claim Settlement Management System**. 
Enables AI assistants (such as Antigravity, Claude Desktop, and Cursor) to securely interact with the system using **Role-Based Access Control (RBAC)**.

---

## 🔒 Security & Role-Based Permissions

Users authenticate via individual credentials. The MCP server and backend Express middleware strictly enforce role boundaries:

| Role | Permitted Actions |
| :--- | :--- |
| **`employee`** | Submit claims, view own claims, view claim details, view company expense policies. |
| **`supervisor`** | Employee actions + Review team claims (`approve` or `reject` with comments). |
| **`finance_manager`** | Full claim management, finance approval, mark as paid / settled, view analytics & stats. |
| **`admin`** | Full access to all actions, policies, and claims. |

---

## 🛠️ Available MCP Tools

### 1. Authentication
* `login(email, password)`: Authenticates with the backend and establishes your active role session.
* `get_current_user()`: Checks the active session and role permissions.
* `logout()`: Clears active credentials.

### 2. Employee Tools
* `submit_claim(businessUnit, category, lineItems, filePaths)`: Submits a new expense claim. Supports attaching receipts directly from local file paths.
* `list_my_claims(status?, category?, page?, limit?)`: Lists claims submitted by the current user.
* `get_claim_details(claimId)`: Fetches complete breakdown of a claim (line items, status history, payment details).
* `get_company_policy()`: Displays active expense limits, categories, and reimbursement policies.

### 3. Supervisor Tools *(Restricted to `supervisor` and `admin`)*
* `supervisor_review_claim(claimId, action, reason?, notes?)`: Approves or rejects a team claim.

### 4. Finance & Admin Tools *(Restricted to `finance_manager` and `admin`)*
* `list_all_claims(status?, category?, page?, limit?)`: Lists all company claims across all employees.
* `finance_review_claim(claimId, action, reason?, notes?)`: Performs final finance review/approval before payment.
* `settle_claim_payment(claimId, channel)`: Marks an approved claim as **PAID** (Channels: `'Bank Transfer'`, `'Cash'`, `'Check'`).
* `get_claim_stats()`: Displays aggregate analytics, total claim amounts, and status breakdown.

---

## 🚀 Setup & Installation

### 1. Prerequisites
* Node.js v18+ (tested on Node v24)
* The Claim Settlement backend Express server running on `http://localhost:5000`

### 2. Configuration for AI Clients

#### A. In Google Antigravity
Add the server entry to your global configuration file:  
`~/.gemini/config/mcp_config.json` (on Windows: `C:\Users\<user>\.gemini\config\mcp_config.json`):

```json
{
  "mcpServers": {
    "claim-settlement": {
      "command": "node",
      "args": ["D:/TYN/ClaimSettleManagement/mcp-server/index.js"],
      "env": {
        "API_BASE_URL": "http://localhost:5000"
      }
    }
  }
}
```

#### B. In Claude Desktop
Add the following to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "claim-settlement": {
      "command": "node",
      "args": ["D:/TYN/ClaimSettleManagement/mcp-server/index.js"],
      "env": {
        "API_BASE_URL": "http://localhost:5000"
      }
    }
  }
}
```

---

## 💬 Example AI Prompts

Once configured, simply chat with your AI assistant:

* **Login**: *"Login to claims system with email finance@company.com and password MySecretPassword."*
* **Submit Claim**: *"Submit a travel claim for $120 for flight tickets on 2026-10-01 with business unit Alliance."*
* **Check Status**: *"What is the status of my claim CLM-2024-001?"*
* **Approve / Settle (Finance)**: *"Approve claim CLM-2024-001 and mark it as paid via Bank Transfer."*
* **Policy Question**: *"What is our company mileage reimbursement rate?"*
