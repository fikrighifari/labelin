import type { IncomingMessage, ServerResponse } from 'node:http';
export function endpoint(kind: 'account' | 'workspace'): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
