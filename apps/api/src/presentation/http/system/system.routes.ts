import { healthCheckSchema } from "@harness-docs/contracts";
import { createRoute } from "../../../infrastructure/lib/router";
import { createSuccessEnvelopeSchema, jsonContent } from "../shared";

const tags = ["system"];

export const getHealth = createRoute({
  method: "get",
  path: "/health",
  tags,
  responses: {
    200: {
      description: "Health check response.",
      content: jsonContent(createSuccessEnvelopeSchema(healthCheckSchema)),
    },
  },
});
