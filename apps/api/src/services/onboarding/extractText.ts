import { PDFParse as pdf } from "pdf-parse";
import mammoth from "mammoth";
import { normalizeWhitespace } from "../../utils/text";
import { isUint8Array } from "node:util/types";

export interface ExtractResult {
  text: string;
  pageCount?: number;
}

export async function extractTextFromPdf(
  buf: Buffer,
  maxPages?: number,
): Promise<ExtractResult> {
  const parser = new pdf({ data: new Uint8Array(buf) });
  const data = await parser.getText({ parsePageInfo: true });
  return {
    text: normalizeWhitespace(data.text || ""),
    pageCount: data.total,
  };
}

export async function extractTextFromDocx(buf: Buffer): Promise<ExtractResult> {
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return { text: normalizeWhitespace(value || "") };
}

export async function extractTextFromTxt(buf: Buffer): Promise<ExtractResult> {
  return { text: normalizeWhitespace(buf.toString("utf8")) };
}
