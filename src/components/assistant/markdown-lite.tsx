import { Fragment, type ReactNode } from "react";

/**
 * Minimal, safe markdown for chat bubbles: paragraphs, bullet/numbered lists, headings, fenced code,
 * **bold**, *italic*, `code`. Everything is rendered as React text nodes (never as HTML).
 */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("`")) {
      out.push(<code key={i++} className="rounded bg-white/[0.07] px-1 py-0.5 font-mono text-[0.85em] text-warden-accent">{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith("**")) {
      out.push(<strong key={i++} className="font-semibold text-white">{tok.slice(2, -2)}</strong>);
    } else {
      out.push(<em key={i++}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function MarkdownLite({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={key++} className="my-2 overflow-x-auto rounded-lg bg-black/40 p-2.5 font-mono text-[11px] leading-relaxed text-slate-300">{code.join("\n")}</pre>
      );
    } else if (/^\s*([-*•])\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•])\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*•])\s+/, ""));
      blocks.push(
        <ul key={key++} className="my-1.5 list-disc space-y-1 pl-5 marker:text-slate-600">
          {items.map((t, n) => <li key={n}>{inline(t)}</li>)}
        </ul>
      );
    } else if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ""));
      blocks.push(
        <ol key={key++} className="my-1.5 list-decimal space-y-1 pl-5 marker:text-slate-600">
          {items.map((t, n) => <li key={n}>{inline(t)}</li>)}
        </ol>
      );
    } else if (/^#{1,4}\s+/.test(line)) {
      blocks.push(<div key={key++} className="mb-1 mt-2.5 font-semibold text-white">{inline(line.replace(/^#{1,4}\s+/, ""))}</div>);
      i++;
    } else if (line.trim() === "") {
      i++;
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() !== "" && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i]) && !lines[i].trim().startsWith("```") && !/^#{1,4}\s+/.test(lines[i])) {
        para.push(lines[i++]);
      }
      blocks.push(
        <p key={key++} className="my-1.5 leading-relaxed">
          {para.map((t, n) => <Fragment key={n}>{n > 0 && <br />}{inline(t)}</Fragment>)}
        </p>
      );
    }
  }
  return <div className="text-sm text-slate-300">{blocks}</div>;
}
