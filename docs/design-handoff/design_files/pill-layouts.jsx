// pill-layouts.jsx — mixed-media lesson body exploration.
// A pill's content is a SEQUENCE of blocks: read · look (click) · watch · do.
// React.* used inline to avoid top-level scope collisions with design-canvas.jsx.

/* ---------- media placeholders (swap for real assets later) ---------- */
function ImagePh({ label = "image", h = 170, radius = 16, style }) {
  return <div className="ph" style={{ height: h, borderRadius: radius, ...style }}><span className="ph-label">▦ {label}</span></div>;
}
function VideoPh({ label = "video", dur = "0:45", h = 196, radius = 16, style }) {
  return (
    <div className="ph video" style={{ height: h, borderRadius: radius, ...style }}>
      <span className="ph-play"><svg width="22" height="22" viewBox="0 0 24 24"><polygon points="7 4 20 12 7 20" fill="#fff" /></svg></span>
      <span className="ph-dur">▶ {dur}</span>
      <span className="ph-label vid">{label}</span>
    </div>
  );
}

/* ---------- block-kind tag (paces the lesson: you know what each block asks) ---------- */
function Ktag({ kind, hint }) {
  const map = { read: ["READ", "📖"], look: ["LOOK", "👆"], watch: ["WATCH", "▶"], do: ["DO", "✓"] };
  const [label, ico] = map[kind] || ["", ""];
  return <div className={`ktag ${kind}`}><span className="ktag-ic">{ico}</span>{label}{hint && <span className="ktag-hint">· {hint}</span>}</div>;
}

/* ---------- interactive "click the diagram" block ---------- */
function LoopDiagram() {
  const [active, setActive] = React.useState(1);
  const steps = [
    { k: "Think", d: "Decides the next move toward the goal." },
    { k: "Act", d: "Calls a tool — a search, some code, an API." },
    { k: "Observe", d: "Reads the result, then loops back around." }
  ];
  return (
    <div className="loop">
      <div className="loop-row">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <button className={`loop-node ${active === i ? "on" : ""}`} onClick={() => setActive(i)}>
              <span className="ln-num">{i + 1}</span><span className="ln-k">{s.k}</span>
            </button>
            {i < 2 && <span className="loop-arr">→</span>}
          </React.Fragment>
        ))}
        <span className="loop-repeat" title="repeat">↻</span>
      </div>
      <div className="loop-exp"><b>{steps[active].k}</b> — {steps[active].d}</div>
    </div>
  );
}

/* ---------- interactive inline check ---------- */
function CheckBlock() {
  const [picked, setPicked] = React.useState(null);
  const opts = ["Stops immediately", "Observes the result, then picks the next step", "Asks the user to restart"];
  const answer = 1;
  return (
    <div className="qcheck">
      <div className="qc-q">Right after an agent uses a tool, what does it do?</div>
      <div className="qc-opts">
        {opts.map((o, i) => {
          let c = "qc-opt";
          if (picked !== null) { if (i === answer) c += " ok"; else if (i === picked) c += " no"; }
          else if (i === picked) c += " sel";
          return <button key={i} className={c} onClick={() => setPicked(i)}><span className="qc-mark" />{o}</button>;
        })}
      </div>
    </div>
  );
}

/* ---------- lesson primitives ---------- */
function Bar({ pct = 18 }) {
  return (
    <div className="rdr-bar">
      <span className="rdr-close">‹ Plan</span>
      <div className="rdr-prog"><span className="rdr-fill" style={{ width: pct + "%" }} /></div>
      <span className="rdr-time">◷ 3 min</span>
    </div>
  );
}
const P = ({ children }) => <p className="lp">{children}</p>;
function Block({ kind, hint, labeled, children }) {
  return <div className="lblock">{labeled && kind && <Ktag kind={kind} hint={hint} />}{children}</div>;
}

/* ---------- the full mixed-media lesson ---------- */
function Lesson({ labeled = true }) {
  return (
    <div className="rdr">
      <Bar />
      <div className="rdr-body lesson">
        <div className="r-step">PILL 2 OF 6</div>
        <h2 className="r-title">The agent loop</h2>

        <Block kind="read" labeled={labeled}>
          <P>Every agent runs the same little cycle — over and over — until the job is done. Once you see it, agents stop feeling like magic.</P>
        </Block>

        <Block kind="look" hint="tap a step" labeled={labeled}>
          <LoopDiagram />
        </Block>

        <Block kind="read" labeled={labeled}>
          <P>Each observation feeds the next decision. The loop only stops when the goal is met — or it hits a limit you set.</P>
        </Block>

        <Block kind="watch" hint="45 sec" labeled={labeled}>
          <VideoPh label="watch · 45s" dur="0:45" h={190} />
          <div className="vcap">See the loop run on one real task.</div>
        </Block>

        <Block kind="read" labeled={labeled}>
          <div className="r-points">
            <div className="r-point"><span className="r-dot" />It plans a step, then calls a tool.</div>
            <div className="r-point"><span className="r-dot" />It reads the result, then decides what's next.</div>
          </div>
        </Block>

        <Block kind="do" hint="quick check" labeled={labeled}>
          <CheckBlock />
        </Block>

        <div className="r-take"><span className="r-take-l">TAKEAWAY</span>Think, act, observe — on repeat.</div>
      </div>
    </div>
  );
}

/* ---------- block-kit cards (the vocabulary) ---------- */
function KitCard({ kind, title, children }) {
  return (
    <div className="kit">
      <div className="kit-head"><Ktag kind={kind} />{title}</div>
      <div className="kit-body">{children}</div>
    </div>
  );
}

function App() {
  return (
    <DesignCanvas>
      <DCSection id="lesson" title="A mixed-media mini-lesson" subtitle="One pill = a flow of blocks: read a bit, tap a diagram, watch 45s, answer. The kind-tags pace it so you always know what each block asks. (Diagram & check are live — click them.)">
        <DCArtboard id="labeled" label="A · Labeled blocks (paced)" width={480} height={1180}><Lesson labeled={true} /></DCArtboard>
        <DCArtboard id="quiet" label="B · Quiet flow (minimal labels)" width={480} height={1080}><Lesson labeled={false} /></DCArtboard>
      </DCSection>

      <DCSection id="blocks" title="The building blocks" subtitle="Mix & match these in any order to author a pill.">
        <DCArtboard id="b-read" label="Read" width={340} height={210}>
          <KitCard kind="read" title="Paragraph"><P>Short, plain-language text. One idea per block keeps it skimmable.</P></KitCard>
        </DCArtboard>
        <DCArtboard id="b-look" label="Look · clickable diagram" width={340} height={300}>
          <KitCard kind="look" title="Interactive diagram"><LoopDiagram /></KitCard>
        </DCArtboard>
        <DCArtboard id="b-watch" label="Watch · short video" width={340} height={320}>
          <KitCard kind="watch" title="Inline clip"><VideoPh label="watch · 45s" dur="0:45" h={150} /><div className="vcap">Caption sits under the clip.</div></KitCard>
        </DCArtboard>
        <DCArtboard id="b-image" label="Image · figure" width={340} height={300}>
          <KitCard kind="look" title="Image + caption"><ImagePh label="diagram / screenshot" h={140} /><div className="vcap">Fig 1 — a captioned still.</div></KitCard>
        </DCArtboard>
        <DCArtboard id="b-callout" label="Callout · analogy" width={340} height={250}>
          <KitCard kind="read" title="Callout / analogy">
            <div className="callout"><div className="callout-l">PICTURE THIS ✦</div><p>Like a robot vacuum: sense, decide, move — then sense again.</p></div>
          </KitCard>
        </DCArtboard>
        <DCArtboard id="b-do" label="Do · quick check" width={340} height={300}>
          <KitCard kind="do" title="Inline check"><CheckBlock /></KitCard>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
