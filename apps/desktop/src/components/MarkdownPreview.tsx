import { Fragment } from "react";
import { cn } from "@/lib/utils";

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "blockquote"; text: string }
  | { type: "code"; language: string; code: string };

interface MarkdownPreviewProps {
  source: string;
}

function renderHeading(level: number, content: ReturnType<typeof renderInline>, key: string) {
  const className =
    level === 1 ? "text-3xl" : level === 2 ? "text-2xl" : level === 3 ? "text-xl" : "text-lg";

  switch (level) {
    case 1:
      return (
        <h1 key={key} className={cn("font-semibold tracking-tight text-slate-50", className)}>
          {content}
        </h1>
      );
    case 2:
      return (
        <h2 key={key} className={cn("font-semibold tracking-tight text-slate-50", className)}>
          {content}
        </h2>
      );
    case 3:
      return (
        <h3 key={key} className={cn("font-semibold tracking-tight text-slate-100", className)}>
          {content}
        </h3>
      );
    case 4:
      return (
        <h4 key={key} className={cn("font-semibold tracking-tight text-slate-100", className)}>
          {content}
        </h4>
      );
    case 5:
      return (
        <h5 key={key} className={cn("font-semibold tracking-tight text-slate-100", className)}>
          {content}
        </h5>
      );
    default:
      return (
        <h6 key={key} className={cn("font-semibold tracking-tight text-slate-100", className)}>
          {content}
        </h6>
      );
  }
}

function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let index = 0;

  const isBlank = (line: string) => line.trim().length === 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (isBlank(line)) {
      index += 1;
      continue;
    }

    const codeFence = trimmed.match(/^```(\w+)?$/);

    if (codeFence) {
      const language = codeFence[1] ?? "plain";
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !(lines[index] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push({
        type: "code",
        language,
        code: codeLines.join("\n"),
      });
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);

    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2],
      });
      index += 1;
      continue;
    }

    const unorderedItem = trimmed.match(/^[-*]\s+(.*)$/);

    if (unorderedItem) {
      const items: string[] = [];

      while (index < lines.length) {
        const nextLine = (lines[index] ?? "").trim();
        const match = nextLine.match(/^[-*]\s+(.*)$/);

        if (!match) {
          break;
        }

        items.push(match[1]);
        index += 1;
      }

      blocks.push({ type: "unordered-list", items });
      continue;
    }

    const orderedItem = trimmed.match(/^\d+\.\s+(.*)$/);

    if (orderedItem) {
      const items: string[] = [];

      while (index < lines.length) {
        const nextLine = (lines[index] ?? "").trim();
        const match = nextLine.match(/^\d+\.\s+(.*)$/);

        if (!match) {
          break;
        }

        items.push(match[1]);
        index += 1;
      }

      blocks.push({ type: "ordered-list", items });
      continue;
    }

    const blockquote = trimmed.match(/^>\s?(.*)$/);

    if (blockquote) {
      const quoteLines: string[] = [];

      while (index < lines.length) {
        const nextLine = (lines[index] ?? "").trim();
        const match = nextLine.match(/^>\s?(.*)$/);

        if (!match) {
          break;
        }

        quoteLines.push(match[1]);
        index += 1;
      }

      blocks.push({ type: "blockquote", text: quoteLines.join(" ") });
      continue;
    }

    const paragraphLines: string[] = [];

    while (index < lines.length) {
      const nextLine = lines[index] ?? "";
      const nextTrimmed = nextLine.trim();

      if (
        isBlank(nextLine) ||
        /^#{1,6}\s+/.test(nextTrimmed) ||
        /^[-*]\s+/.test(nextTrimmed) ||
        /^\d+\.\s+/.test(nextTrimmed) ||
        /^>\s?/.test(nextTrimmed) ||
        /^```/.test(nextTrimmed)
      ) {
        break;
      }

      paragraphLines.push(nextTrimmed);
      index += 1;
    }

    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

function renderInline(text: string) {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);

  return tokens.map((token, index) => {
    const codeMatch = token.match(/^`([^`]+)`$/);

    if (codeMatch) {
      return (
        <code
          key={`${token}-${index}`}
          className="rounded-md border border-white/10 bg-white/[0.08] px-1.5 py-0.5 font-mono text-[0.92em] text-amber-100"
        >
          {codeMatch[1]}
        </code>
      );
    }

    const strongMatch = token.match(/^\*\*([^*]+)\*\*$/);

    if (strongMatch) {
      return (
        <strong key={`${token}-${index}`} className="font-semibold text-slate-100">
          {strongMatch[1]}
        </strong>
      );
    }

    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

    if (linkMatch) {
      return (
        <a
          key={`${token}-${index}`}
          className="text-sky-300 underline decoration-sky-300/40 underline-offset-4 transition-colors hover:text-sky-200"
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <Fragment key={`${token}-${index}`}>{token}</Fragment>;
  });
}

export function MarkdownPreview({ source }: MarkdownPreviewProps) {
  const blocks = parseMarkdown(source);

  if (blocks.length === 0) {
    return <p className="text-sm text-slate-500">Nothing to preview yet.</p>;
  }

  return (
    <div className="grid gap-4 text-[15px] leading-7 text-slate-300" aria-label="Markdown preview">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return renderHeading(block.level, renderInline(block.text), `${block.type}-${index}`);
        }

        if (block.type === "paragraph") {
          return <p key={`${block.type}-${index}`}>{renderInline(block.text)}</p>;
        }

        if (block.type === "unordered-list") {
          return (
            <ul key={`${block.type}-${index}`} className="grid list-disc gap-2 pl-5">
              {block.items.map((item) => (
                <li key={item}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol key={`${block.type}-${index}`} className="grid list-decimal gap-2 pl-5">
              {block.items.map((item) => (
                <li key={item}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }

        if (block.type === "blockquote") {
          return (
            <blockquote
              key={`${block.type}-${index}`}
              className="rounded-r-2xl border-l-2 border-amber-200/50 bg-amber-200/8 px-4 py-3 text-slate-300"
            >
              {renderInline(block.text)}
            </blockquote>
          );
        }

        return (
          <pre
            key={`${block.type}-${index}`}
            className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/95 p-4 font-mono text-sm text-slate-200"
          >
            <code>{block.code}</code>
          </pre>
        );
      })}
    </div>
  );
}
