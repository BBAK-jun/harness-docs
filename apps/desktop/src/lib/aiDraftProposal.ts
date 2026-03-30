import type { EditorAIDraftProposal } from "../types/domain-ui";

function normalizeOutput(output: string) {
  return output.replace(/\r\n/g, "\n").trim();
}

function escapeForPattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSectionBody(markdown: string, title: string, nextTitles: string[]) {
  const nextPattern =
    nextTitles.length > 0
      ? `(?=\\n##\\s+(?:${nextTitles.map(escapeForPattern).join("|")})\\s*(?:\\n|$)|$)`
      : "$";
  const sectionPattern = new RegExp(
    `##\\s+${escapeForPattern(title)}\\s*\\n+([\\s\\S]*?)${nextPattern}`,
    "i",
  );
  const sectionMatch = sectionPattern.exec(markdown);

  return sectionMatch?.[1]?.trim() ?? null;
}

function extractMarkdownBlock(sectionBody: string) {
  const fencedBlockMatch = sectionBody.match(/```(?:md|markdown)?\n([\s\S]*?)\n```/i);

  if (fencedBlockMatch?.[1]) {
    return fencedBlockMatch[1].trim();
  }

  return null;
}

export function parseEditorAIDraftProposal(output: string): EditorAIDraftProposal | null {
  const normalizedOutput = normalizeOutput(output);

  if (!normalizedOutput) {
    return null;
  }

  const draftSection = getSectionBody(normalizedOutput, "Draft Markdown", ["Notes"]);

  if (!draftSection) {
    return null;
  }

  const draftMarkdown = extractMarkdownBlock(draftSection);

  if (!draftMarkdown) {
    return null;
  }

  return {
    recommendation:
      getSectionBody(normalizedOutput, "Recommendation", ["Draft Markdown", "Notes"]) ?? "",
    draftMarkdown,
    notes: getSectionBody(normalizedOutput, "Notes", []),
  };
}
