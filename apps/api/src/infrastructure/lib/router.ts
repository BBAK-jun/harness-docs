import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { Context } from "hono";

export type ApiRouter = OpenAPIHono;
export type ApiContext = Context;

export function createRouter() {
  return new OpenAPIHono();
}

export { createRoute, z };
