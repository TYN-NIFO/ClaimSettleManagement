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

You can manage claims end-to-end directly through AI assistants:
* **Claude Code**: `claude mcp add claim-settlement node "D:/TYN/ClaimSettleManagement/mcp-server/index.js" -e API_BASE_URL="https://internaltyn.onrender.com"`
* **Google Gemini / Antigravity**: Configured via `~/.gemini/config/mcp_config.json`
* **Claude Desktop**: Configured via `%APPDATA%\Claude\claude_desktop_config.json`
* **Cursor**: Configured via `.cursor/mcp.json`

👉 For detailed setup guides, role permissions, and prompt examples, see **[mcp-server/README.md](./mcp-server/README.md)**.
