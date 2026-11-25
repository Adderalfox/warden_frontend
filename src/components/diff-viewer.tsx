"use client";

import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";

function splitDiff(diff: string): { oldStr: string; newStr: string } {
  const oldLines: string[] = [];
  const newLines: string[] = [];
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@") || line.startsWith("diff ")) {
      continue;
    }
    if (line.startsWith("-")) oldLines.push(line.slice(1));
    else if (line.startsWith("+")) newLines.push(line.slice(1));
    else {
      oldLines.push(line.slice(1));
      newLines.push(line.slice(1));
    }
  }
  return { oldStr: oldLines.join("\n"), newStr: newLines.join("\n") };
}

export default function DiffViewer({ diff }: { diff: string | null }) {
  if (!diff) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        No patch generated yet.
      </div>
    );
  }

  const { oldStr, newStr } = splitDiff(diff);

  return (
    <div className="h-full overflow-auto text-xs">
      <ReactDiffViewer
        oldValue={oldStr}
        newValue={newStr}
        splitView={false}
        compareMethod={DiffMethod.LINES}
        useDarkTheme
      />
    </div>
  );
}
