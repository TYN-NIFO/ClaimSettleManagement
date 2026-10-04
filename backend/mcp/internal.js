import crypto from 'crypto';

// Marks API calls made by MCP tools from inside this process. The secret is
// regenerated on every boot and never leaves the process, so outside callers
// cannot use the header to skip the API rate limiter.
export const MCP_INTERNAL_HEADER = 'x-mcp-internal';
export const MCP_INTERNAL_SECRET = crypto.randomBytes(32).toString('hex');

export const isInternalMcpRequest = (req) =>
  req.get(MCP_INTERNAL_HEADER) === MCP_INTERNAL_SECRET;
