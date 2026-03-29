import { intakePreviewRequestSchema, intakePreviewSchema } from "@harness-docs/contracts";
import { createRoute } from "../../../infrastructure/lib/router";
import { createErrorEnvelopeSchema, createSuccessEnvelopeSchema, jsonContent } from "../shared";

const tags = ["intake"];
const errorEnvelope = createErrorEnvelopeSchema();

export const previewIntake = createRoute({
  method: "post",
  path: "/intake/preview",
  tags,
  request: {
    body: {
      required: true,
      content: jsonContent(intakePreviewRequestSchema),
    },
  },
  responses: {
    200: {
      description: "Prompt intake preview for AI-assisted workflow routing.",
      content: jsonContent(createSuccessEnvelopeSchema(intakePreviewSchema)),
    },
    422: {
      description: "Intake preview payload is invalid.",
      content: jsonContent(errorEnvelope),
    },
  },
});
