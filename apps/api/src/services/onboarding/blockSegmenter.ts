import { looksLikeDateLine } from "../../utils/date";

export interface Block {
  lines: string[];
}

export function splitIntoBlocks(sectionLines: string[]): Block[] {
  const blocks: Block[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (buf.length) blocks.push({ lines: buf.splice(0, buf.length) });
  };

  for (const l of sectionLines) {
    if (!l.trim()) {
      flush();
      continue;
    }
    // New block starts when we encounter a line with dates (common in headers)
    if (looksLikeDateLine(l) && buf.length) {
      flush();
    }
    buf.push(l);
  }
  flush();
  return blocks.filter((b) => b.lines.join(" ").trim().length > 0);
}
