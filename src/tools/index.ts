/** All tool definitions registered by the server. */

import { readTools } from "./read.js";
import { writeTools } from "./write.js";
import type { AnyToolDef } from "./types.js";

export const allTools: AnyToolDef[] = [...readTools, ...writeTools];
