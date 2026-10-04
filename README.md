# Claim Settlement Management System

A full-stack, enterprise expense claim and settlement management application with Role-Based Access Control (RBAC), AWS S3 receipt storage, automated validation, and Model Context Protocol (MCP) AI integration.

---

## 📂 Project Structure

* **[`backend/`](./backend)**: Express.js REST API with MongoDB/Mongoose, JWT auth, and AWS S3 integration.
* **[`frontend/`](./frontend)**: Next.js (App Router) with Redux Toolkit and Tailwind CSS.
  * Live URL: [https://claim-settle-management-gyjm.vercel.app/](https://claim-settle-management-gyjm.vercel.app/)
* **[`mcp-server/`](./mcp-server)**: Model Context Protocol (MCP) server enabling conversational claim management via AI assistants (Claude Code, Google Gemini / Antigravity, Claude Desktop, Cursor).
  * Setup Guide: [mcp-server/README.md](./mcp-server/README.md)

---

## 🤖 AI Assistant Integration (MCP Server)

### Hosted endpoint (recommended)

The backend serves MCP itself at **`https://internaltyn.onrender.com/mcp`** (Streamable HTTP, stateless). Nothing to install or deploy separately. Users sign in with their existing YDesk email and password through OAuth, and tools act with exactly that user's permissions.

* **claude.ai / Claude Desktop / mobile**: Settings → Connectors → Add custom connector → URL `https://internaltyn.onrender.com/mcp`, then **Connect** and sign in on the YDesk page. On Team/Enterprise plans an Owner adds it once under Admin settings → Connectors.
* **Claude Code**: `claude mcp add --transport http ydesk-claims https://internaltyn.onrender.com/mcp`, then run `/mcp` in Claude Code to sign in.
* Tools: `get_current_user`, `get_company_policy`, `submit_claim` (receipts as base64), `list_claims`, `get_claim_details`, `finance_review_claim`, `settle_claim_payment`, `get_claim_stats`
* OAuth: discovery under `/.well-known/`, endpoints `/authorize`, `/token`, `/register`, `/revoke`. Allowed redirect URIs are Claude's callback and localhost; add others with `MCP_OAUTH_REDIRECT_URIS` (comma-separated). The public URL comes from `RENDER_EXTERNAL_URL`, or `PUBLIC_API_URL` if set.
* A `Authorization: Bearer <access token>` header from `POST /api/auth/token/` also works.
* Source: [`backend/mcp/`](./backend/mcp)

### Local stdio server

You can also run the standalone stdio server on your own machine:
* **Claude Code**: `claude mcp add claim-settlement node "D:/TYN/ClaimSettleManagement/mcp-server/index.js" -e API_BASE_URL="https://internaltyn.onrender.com"`
* **Google Gemini / Antigravity**: Configured via `~/.gemini/config/mcp_config.json`
* **Claude Desktop**: Configured via `%APPDATA%\Claude\claude_desktop_config.json`
* **Cursor**: Configured via `.cursor/mcp.json`

👉 For detailed setup guides, role permissions, and prompt examples, see **[mcp-server/README.md](./mcp-server/README.md)**.
