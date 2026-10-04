export const ok = (text) => ({ content: [{ type: 'text', text }] });

export const fail = (text) => ({ content: [{ type: 'text', text }], isError: true });

// Wraps a tool handler so API errors (403, validation, 404...) come back to the
// model as a readable tool error instead of a protocol failure.
export const handle = (label, fn) => async (args) => {
  try {
    return await fn(args);
  } catch (error) {
    return fail(`❌ ${label}: ${error.message}`);
  }
};
