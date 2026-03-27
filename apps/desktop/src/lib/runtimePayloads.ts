import type { AITaskExecutionInput } from "../domain/aiTasks";
import type { PublishExecutionInput, PublishRepositoryFile } from "../domain/publishing";
import type {
  AITaskEntryPoint,
  DocumentTemplate,
  WorkspaceDocument,
  WorkspaceGraph
} from "../types";

function getDocumentSource(
  document: WorkspaceDocument,
  documentDrafts: Record<string, string>
) {
  return documentDrafts[document.id] ?? document.markdownSource;
}

function renderTemplateMarkdown(template: DocumentTemplate) {
  const sections = template.sections
    .map(
      (section) =>
        `## ${section.title}\n\n${section.defaultMarkdown}\n\nGuidance:\n${section.guidance
          .map((item) => `- ${item}`)
          .join("\n")}`
    )
    .join("\n\n");

  return `# ${template.name}\n\n${template.description}\n\n${sections}`;
}

function buildDocumentReferenceBlocks(
  entry: AITaskEntryPoint,
  workspaceGraph: WorkspaceGraph,
  documentDrafts: Record<string, string>
) {
  const documentIds = Array.from(
    new Set([
      ...(entry.documentId ? [entry.documentId] : []),
      ...entry.referenceDocumentIds
    ])
  );

  return documentIds
    .map((documentId) => workspaceGraph.documents.find((document) => document.id === documentId) ?? null)
    .filter((document): document is WorkspaceDocument => document !== null)
    .map((document) => {
      const source = getDocumentSource(document, documentDrafts);

      return `## ${document.title}\nType: ${document.type}\nSlug: ${document.slug}\n\n${source}`;
    })
    .join("\n\n");
}

export function buildAITaskPrompt(
  entry: AITaskEntryPoint,
  workspaceGraph: WorkspaceGraph,
  documentDrafts: Record<string, string>
) {
  const referenceBlocks = buildDocumentReferenceBlocks(entry, workspaceGraph, documentDrafts);

  return [
    `You are executing the "${entry.title}" task for the ${workspaceGraph.workspace.name} workspace.`,
    `Provider: ${entry.provider}`,
    `Task kind: ${entry.kind}`,
    `Suggested intent: ${entry.suggestedIntent}`,
    `Use only the internal workspace documents included below.`,
    `Focus on: ${entry.description}`,
    entry.invalidatedByDocumentIds.length > 0
      ? `Invalidated by document ids: ${entry.invalidatedByDocumentIds.join(", ")}`
      : "No invalidating documents are currently attached to this task.",
    "Return a concise markdown response with explicit recommendations and any draft content."
  ]
    .concat(["", "# Workspace References", referenceBlocks || "No internal documents were attached."])
    .join("\n");
}

function buildPublishFiles(
  workspaceGraph: WorkspaceGraph,
  documentDrafts: Record<string, string>
): PublishRepositoryFile[] {
  const activePublishRecord = workspaceGraph.publishRecords[0] ?? null;

  if (!activePublishRecord) {
    return [];
  }

  return activePublishRecord.artifacts.flatMap((artifact) => {
    if (artifact.kind === "document") {
      const document =
        workspaceGraph.documents.find((entry) => entry.id === artifact.targetId) ?? null;

      if (!document) {
        return [];
      }

      return [
        {
          path: `documents/${document.slug}.md`,
          content: getDocumentSource(document, documentDrafts)
        }
      ];
    }

    const template =
      workspaceGraph.templates.find((entry) => entry.id === artifact.targetId) ?? null;

    if (!template) {
      return [];
    }

    return [
      {
        path: `templates/${template.id}.md`,
        content: renderTemplateMarkdown(template)
      }
    ];
  });
}

export function buildPublishExecutionInput(
  workspaceGraph: WorkspaceGraph,
  documentDrafts: Record<string, string>,
  activeMembershipId: string | null
): PublishExecutionInput | null {
  const publishRecord = workspaceGraph.publishRecords[0] ?? null;

  if (!publishRecord) {
    return null;
  }

  return {
    workspaceId: workspaceGraph.workspace.id,
    repository: workspaceGraph.workspace.docsRepository,
    publishRecord,
    documents: workspaceGraph.documents.map((document) => ({
      ...document,
      markdownSource: getDocumentSource(document, documentDrafts)
    })),
    files: buildPublishFiles(workspaceGraph, documentDrafts),
    initiatedByMembershipId: activeMembershipId
  };
}

export function buildAITaskExecutionInput(
  entry: AITaskEntryPoint,
  workspaceGraph: WorkspaceGraph,
  documentDrafts: Record<string, string>
): AITaskExecutionInput {
  return {
    workspaceGraph,
    entry,
    prompt: buildAITaskPrompt(entry, workspaceGraph, documentDrafts)
  };
}
