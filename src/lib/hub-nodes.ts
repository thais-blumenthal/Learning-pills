export type NodeState = "done" | "shaky" | "current" | "locked";

/** Minimal shape needed to derive node state — matches a `concepts` row subset. */
export interface ConceptLike {
  id: number;
  position: number;
  title: string;
  hook: string;
  minutes: number;
  completion: string | null;
}

export interface HubNode {
  id: number;
  position: number;
  title: string;
  hook: string;
  minutes: number;
  node: NodeState;
}

/**
 * Derive per-concept node state for the Hub. Input must already be the
 * included concepts in `position` order. The first concept with
 * `completion === null` is `current`; any null after it is `locked`.
 */
export function deriveNodeStates(concepts: ConceptLike[]): HubNode[] {
  const currentIdx = concepts.findIndex((c) => c.completion == null);
  return concepts.map((c, i) => {
    let node: NodeState;
    if (c.completion === "mastered") node = "done";
    else if (c.completion === "shaky") node = "shaky";
    else node = i === currentIdx ? "current" : "locked";
    return {
      id: c.id,
      position: c.position,
      title: c.title,
      hook: c.hook,
      minutes: c.minutes,
      node,
    };
  });
}
