# Backlog

Ideas captured for later shaping. Not yet scoped into a slice.

## ADHD content style (to brainstorm + shape)

Make generated pills ADHD-friendly. Four rules:

1. **Less text** — cut density; short lines, less prose. Highest-value lever.
2. **Diagrams whenever possible** — prefer a visual over a paragraph.
3. **Images where they help** — generated imagery as a content block.
4. **Bionic reading** — render-time transform that bolds the first 1–4 letters of each word (artificial fixation points). Evidence for a real speed gain is thin; treat as a legibility/comfort style choice.

**Splits across two layers:**
- *Generator* (`src/lib/generate-pill.ts` + prompt, `src/lib/pill-blocks.ts` schema): rules 1–3 — shorter blocks, new `diagram`/`image` block kinds, validator updates.
- *Reader* (`FocusReader` + `globals.css`): rule 4 (bionic) is pure render; diagrams/images need new block renderers.

**Open questions for shaping:**
- Images: generate how (which model/API), at what cost, generated when (at pill-gen time vs on demand)?
- Diagrams: what representation does the model emit — Mermaid, SVG, a structured JSON the reader draws?
- How aggressive is "less text" — hard caps per block?

Next step: run the brainstorming/shaping flow for this as its own slice.
