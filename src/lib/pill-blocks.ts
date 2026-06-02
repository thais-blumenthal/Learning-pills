export interface ReadBlock {
  kind: "read";
  text?: string;
  points?: string[];
}
export interface CalloutBlock {
  kind: "callout";
  text: string;
}
export interface DoBlock {
  kind: "do";
  question: string;
  options: string[];
  answer: number;
}
export type Block = ReadBlock | CalloutBlock | DoBlock;

export interface Pill {
  blocks: Block[];
  takeaway: string;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseBlock(raw: unknown, i: number): Block | null {
  const obj = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const kind = obj.kind;

  if (kind === "read") {
    const text = asString(obj.text);
    const points = Array.isArray(obj.points)
      ? obj.points.map(asString).filter(Boolean)
      : [];
    if (!text && points.length === 0) {
      throw new Error(`read block ${i} needs text or points`);
    }
    const block: ReadBlock = { kind: "read" };
    if (text) block.text = text;
    if (points.length > 0) block.points = points;
    return block;
  }

  if (kind === "callout") {
    const text = asString(obj.text);
    if (!text) throw new Error(`callout block ${i} needs text`);
    return { kind: "callout", text };
  }

  if (kind === "do") {
    const question = asString(obj.question);
    const options = Array.isArray(obj.options) ? obj.options.map(asString).filter(Boolean) : [];
    if (!question) throw new Error(`do block ${i} needs a question`);
    if (options.length !== 3) throw new Error(`do block ${i} needs exactly 3 options`);
    const answer = Math.max(0, Math.min(2, Math.round(Number(obj.answer) || 0)));
    return { kind: "do", question, options, answer };
  }

  // unknown kind → skip
  return null;
}

export function parsePill(raw: unknown): Pill {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Pill must be an object");
  }
  const obj = raw as Record<string, unknown>;
  const rawBlocks = Array.isArray(obj.blocks) ? obj.blocks : [];

  const parsed: Block[] = [];
  let doBlock: DoBlock | null = null;
  rawBlocks.forEach((b, i) => {
    const block = parseBlock(b, i);
    if (!block) return;
    if (block.kind === "do") {
      if (doBlock) return; // keep only the first do block
      doBlock = block;
    }
    parsed.push(block);
  });

  if (!doBlock) {
    throw new Error("Pill must contain exactly one do block");
  }

  return {
    blocks: parsed,
    takeaway: asString(obj.takeaway) || "That's the core of it — you've got this.",
  };
}
