# Claim Settlement Management MCP Server

Model Context Protocol (MCP) server for the **Claim Settlement Management System**. 
Enables AI assistants (such as **Claude Code**, **Google Gemini / Antigravity**, **Claude Desktop**, and **Cursor**) to securely submit, view, approve, and settle claims using strict **Role-Based Access Control (RBAC)**.

---

## 🔒 Security & Role-Based Permissions

Users authenticate via individual accounts. The MCP server and backend Express middleware strictly enforce role boundaries:

| Role | Permitted Actions |
| :--- | :--- |
| **`employee`** | Submit claims with receipt attachments, view own claims, view claim details, view company expense policies. |
| **`supervisor`** | Employee actions + Review & approve/reject team member claims. |
| **`finance_manager`** | Full company claim management, finance approval, mark as paid / settled, view analytics & stats. |
| **`admin`** | Full access to all actions, policies, and claims. |

---

## 🛠️ Available MCP Tools

### 1. Authentication & Session
* `login(email, password)`: Authenticates with the backend and establishes your active role session.
* `get_current_user()`: Checks the active session, user ID, and role permissions.
* `logout()`: Clears credentials and ends active session.

### 2. Employee Tools
* `submit_claim(businessUnit, category, lineItems, filePaths)`: Submits a new expense claim. Supports attaching local receipt files (PDF, JPG, PNG) which are automatically uploaded to AWS S3.
* `list_my_claims(status?, category?, page?, limit?)`: Lists claims submitted by the logged-in user.
* `get_claim_details(claimId)`: Full breakdown of a claim (line items, attachment URLs, approval timeline, settlement status). Supports both Database ID and human reference (e.g., `claim_2026_00149`).
* `get_company_policy()`: Displays active expense limits, categories, and reimbursement rules.

### 3. Supervisor Tools *(Restricted to `supervisor` and `admin`)*
* `supervisor_review_claim(claimId, action, reason?, notes?)`: Approves or rejects a team claim.

### 4. Finance & Admin Tools *(Restricted to `finance_manager` and `admin`)*
* `list_all_claims(status?, category?, page?, limit?)`: Lists all company claims across all employees.
* `finance_review_claim(claimId, action, reason?, notes?)`: Performs final finance review and approval.
* `settle_claim_payment(claimId, channel)`: Marks an approved claim as **PAID** (Channels: `'Bank Transfer'`, `'Cash'`, `'Check'`).
* `get_claim_stats()`: Displays aggregate analytics, total claim amounts, and status breakdown.

---

## 🚀 Setup & Client Configuration

### 1. Prerequisites
* **Node.js**: v18+ (tested on Node v24)
* **Backend API**: Running locally on `http://localhost:5000` or production at `https://internaltyn.onrender.com`

---

### 2. Setup in Claude Code (CLI)

[Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) is Anthropic's agentic CLI tool.

#### Option A: Using the CLI command
Run the following in your terminal:
```bash
claude mcp add claim-settlement node "D:/TYN/ClaimSettleManagement/mcp-server/index.js" -e API_BASE_URL="https://internaltyn.onrender.com"
```

#### Option B: Via `.claude/settings.json` (Project-specific) or `~/.claude/settings.json` (Global)
Add the server entry:
```json
{
  "mcpServers": {
    "claim-settlement": {
      "command": "node",
      "args": ["D:/TYN/ClaimSettleManagement/mcp-server/index.js"],
      "env": {
        "API_BASE_URL": "https://internaltyn.onrender.com"
      }
    }
  }
}
```

*To verify in Claude Code:* Type `/mcp` inside the interactive Claude Code session.

---

### 3. Setup in Google Gemini / Antigravity

Antigravity uses the global MCP configuration file:
* **Windows**: `C:\Users\<YourUsername>\.gemini\config\mcp_config.json`
* **macOS/Linux**: `~/.gemini/config/mcp_config.json`

Add the server definition under `mcpServers`:
```json
{
  "mcpServers": {
    "claim-settlement": {
      "command": "node",
      "args": ["D:/TYN/ClaimSettleManagement/mcp-server/index.js"],
      "env": {
        "API_BASE_URL": "https://internaltyn.onrender.com"
      }
    }
  }
}
```

---

### 4. Setup in Claude Desktop

Open your Claude Desktop configuration file:
* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
* **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add the following configuration:
```json
{
  "mcpServers": {
    "claim-settlement": {
      "command": "node",
      "args": ["D:/TYN/ClaimSettleManagement/mcp-server/index.js"],
      "env": {
        "API_BASE_URL": "https://internaltyn.onrender.com"
      }
    }
  }
}
```

*Restart Claude Desktop to apply.* You will see the 🔌 tool icon in the bottom-right corner of the chat input.

---

### 5. Setup in Cursor IDE

1. Open **Cursor Settings** (`Ctrl + ,` or `Cmd + ,`).
2. Go to **Features** &rarr; **MCP Servers**.
3. Click **Add New MCP Server**:
   * **Name**: `claim-settlement`
   * **Type**: `command`
   * **Command**: `node D:/TYN/ClaimSettleManagement/mcp-server/index.js`
4. Alternatively, create a `.cursor/mcp.json` file in your workspace:
```json
{
  "mcpServers": {
    "claim-settlement": {
      "command": "node",
      "args": ["D:/TYN/ClaimSettleManagement/mcp-server/index.js"],
      "env": {
        "API_BASE_URL": "https://internaltyn.onrender.com"
      }
    }
  }
}
```

---

### 6. Setup in VS Code (Cline / Roo Code / Continue)

Open `cline_mcp_settings.json` or `roo_mcp_settings.json`:
```json
{
  "mcpServers": {
    "claim-settlement": {
      "command": "node",
      "args": ["D:/TYN/ClaimSettleManagement/mcp-server/index.js"],
      "env": {
        "API_BASE_URL": "https://internaltyn.onrender.com"
      }
    }
  }
}
```

---

## 💬 Example Prompts by Role

### 👤 As an Employee (`test@theyellow.network` / `TYN@123`)
* *"Login to the claim system with email test@theyellow.network and password TYN@123."*
* *"What is our company mileage reimbursement rate and hotel allowance?"*
* *"Submit a travel claim for ₹2,500 for hotel accommodation on 2026-10-03 with receipt attachment C:/Users/ravin/Downloads/image (7).png."*
* *"Show me all my recent claims and their status."*

### 💼 As Finance Manager (`testing@theyellownetwork.in` / `TYN@123`)
* *"Login as testing@theyellownetwork.in with password TYN@123."*
* *"Show all claims pending finance approval."*
* *"Approve claim claim_2026_00149 with remark 'Receipts verified'."*
* *"Settle and mark claim claim_2026_00149 as paid via Bank Transfer."*
* *"Give me the analytics summary of all company claims."*

---

## 🧪 Running the Automated Verification Test

To verify the entire lifecycle (Employee login &rarr; Submit with S3 receipt &rarr; RBAC block &rarr; Finance approval &rarr; Settlement) run:

```powershell
cd D:\TYN\ClaimSettleManagement\mcp-server
node test-e2e.js
```
