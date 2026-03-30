import { describe, expect, it } from "vitest";
import { parseEditorAIDraftProposal } from "./aiDraftProposal";

describe("parseEditorAIDraftProposal", () => {
  it("parses recommendation, draft markdown, and notes from a well-formed response", () => {
    const proposal = parseEditorAIDraftProposal(`
## Recommendation

Keep the architecture summary concise and make the contract boundary explicit.

## Draft Markdown

\`\`\`md
## Architecture

The desktop app initiates the publish flow.
\`\`\`

## Notes

Preserve the existing review terminology.
`);

    expect(proposal).toEqual({
      recommendation:
        "Keep the architecture summary concise and make the contract boundary explicit.",
      draftMarkdown: "## Architecture\n\nThe desktop app initiates the publish flow.",
      notes: "Preserve the existing review terminology.",
    });
  });

  it("returns null when the response does not include a draft markdown section", () => {
    expect(
      parseEditorAIDraftProposal(`
## Recommendation

Only explain the issue.
`),
    ).toBeNull();
  });

  it("returns null when the draft section is not fenced", () => {
    expect(
      parseEditorAIDraftProposal(`
## Draft Markdown

## Contracts

Document the persistence invariants.
`),
    ).toBeNull();
  });
});
