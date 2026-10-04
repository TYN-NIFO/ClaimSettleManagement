import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { auth } from '../middleware/auth.js';
import { LoopbackApiClient } from './apiClient.js';
import { registerSessionTools } from './tools/sessionTools.js';
import { registerPolicyTools } from './tools/policyTools.js';
import { registerClaimTools } from './tools/claimTools.js';

function buildServer(context) {
  const server = new McpServer({ name: 'ydesk-claims', version: '1.0.0' });
  registerSessionTools(server, context);
  registerPolicyTools(server, context);
  registerClaimTools(server, context);
  return server;
}

const jsonRpcError = (res, status, message) =>
  res.status(status).json({ jsonrpc: '2.0', error: { code: -32000, message }, id: null });

// Stateless Streamable HTTP MCP endpoint. Each request is authenticated with the
// caller's own access token and gets a fresh server scoped to that user, so
// nothing is shared between users and nothing is lost when the instance restarts.
export function createMcpRouter() {
  const router = express.Router();

  router.post('/', auth, async (req, res) => {
    // Tools call back into this same server on the port this request arrived on.
    const api = new LoopbackApiClient(req.socket.localPort, req.token);
    const server = buildServer({ api, user: req.user });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP request error:', error);
      if (!res.headersSent) jsonRpcError(res, 500, 'Internal server error');
    }
  });

  // Stateless mode has no server-initiated streams or sessions to end.
  router.all('/', (req, res) => {
    res.set('Allow', 'POST');
    jsonRpcError(res, 405, 'Method not allowed.');
  });

  return router;
}
