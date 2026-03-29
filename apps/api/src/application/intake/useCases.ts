import type { IntakePreviewDto, IntakePreviewRequestDto } from "@harness-docs/contracts";
import { succeed } from "../shared/result";

export function createIntakeUseCases() {
  return {
    previewIntake(input: IntakePreviewRequestDto) {
      return succeed<IntakePreviewDto>({
        summary: `${input.provider} should interview this prompt before proposing new specs.`,
        recommendedRoute: "workspace.discovery",
        recommendedArtifacts: ["PRD", "UX Flow", "Technical Spec", "Policy/Decision"],
        nextAction: `Start an intake interview for "${input.prompt}".`,
      });
    },
  };
}
