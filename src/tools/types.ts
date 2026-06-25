/**
 * Tool definition contract. Each tool declares its name, description, a Zod raw
 * shape for inputs, and a handler that receives the validated args and the
 * shared ChainContext. The server registers every ToolDef once at startup.
 */

import type { ZodRawShape, z } from "zod";
import type { ChainContext } from "../chain/context.js";
import type { ToolResult } from "./common.js";

export interface ToolDef<Shape extends ZodRawShape = ZodRawShape> {
  name: string;
  description: string;
  inputShape: Shape;
  handler: (
    args: z.objectOutputType<Shape, z.ZodTypeAny>,
    ctx: ChainContext,
  ) => Promise<ToolResult>;
}

/**
 * Type-erased tool definition for the registry. Concrete ToolDefs have a
 * contravariant handler arg type and so do not unify under ToolDef<ZodRawShape>;
 * the registry treats the handler args as `any`.
 */
export interface AnyToolDef {
  name: string;
  description: string;
  inputShape: ZodRawShape;
  handler: (args: any, ctx: ChainContext) => Promise<ToolResult>;
}

/** Helper to define a tool with inferred arg typing. */
export function defineTool<Shape extends ZodRawShape>(
  def: ToolDef<Shape>,
): ToolDef<Shape> {
  return def;
}
