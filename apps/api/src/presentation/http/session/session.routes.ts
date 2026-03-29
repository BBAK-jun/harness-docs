import { bootstrapSessionSchema } from "@harness-docs/contracts";
import { createRoute } from "../../../infrastructure/lib/router";
import { createErrorEnvelopeSchema, createSuccessEnvelopeSchema, jsonContent } from "../shared";

const tags = ["session"];
const errorEnvelope = createErrorEnvelopeSchema();

export const getBootstrapSession = createRoute({
  method: "get",
  path: "/session/bootstrap",
  tags,
  responses: {
    200: {
      description: "Bootstrapped session with user and workspace catalog.",
      content: jsonContent(createSuccessEnvelopeSchema(bootstrapSessionSchema)),
    },
    422: {
      description: "Authentication is required.",
      content: jsonContent(errorEnvelope),
    },
  },
});
