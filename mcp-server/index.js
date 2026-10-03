import dotenv from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ClaimApiClient } from './client.js';
import { registerAuthTools } from './tools/authTools.js';
import { registerPolicyTools } from './tools/policyTools.js';
import { registerClaimTools } from './tools/claimTools.js';

dotenv.config();

// Create the API client
const apiClient = new ClaimApiClient(process.env.API_BASE_URL || 'http://localhost:5000');

// Create the MCP server instance
const server = new McpServer({
  name: 'claim-settle-management',
  version: '1.0.0'
});

// Register all modular tools
registerAuthTools(server, apiClient);
registerPolicyTools(server, apiClient);
registerClaimTools(server, apiClient);

async function main() {
  // If credentials are pre-provided via environment variables, auto-authenticate
  if (process.env.CLAIM_USER_EMAIL && process.env.CLAIM_USER_PASSWORD) {
    try {
      console.error(`Attempting auto-login for ${process.env.CLAIM_USER_EMAIL}...`);
      await apiClient.login(process.env.CLAIM_USER_EMAIL, process.env.CLAIM_USER_PASSWORD);
      console.error(`Auto-login successful. Active role: ${apiClient.currentRole}`);
    } catch (err) {
      console.error(`Auto-login failed: ${err.message}. User can log in manually using the login tool.`);
    }
  } else if (process.env.AUTH_TOKEN) {
    try {
      apiClient.setToken(process.env.AUTH_TOKEN);
      await apiClient.getProfile();
      console.error(`Initialized from AUTH_TOKEN. Active role: ${apiClient.currentRole}`);
    } catch (err) {
      console.error(`Token validation failed: ${err.message}`);
    }
  }

  // Connect to stdio transport for communication with AI client (Antigravity, Claude Desktop, etc.)
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 Claim Settlement MCP server is running on stdio transport.');
}

main().catch((err) => {
  console.error('Fatal MCP server error:', err);
  process.exit(1);
});
