// screens.jsx — all full-screen flows.
// NOTE: alias hooks to avoid global-scope collisions with components.jsx / app.jsx.
const { useState: useStateS, useEffect: useEffectS, useRef: useRefS } = React;

/* ===================================================================
   PROJECTS HOME — your learning projects
   =================================================================== */
function Projects({ projects, onOpen, onNew }) {
  return (
    <div className="home">
      <div className="home-inner wide">
        <div className="home-kicker">LEARNING PILLS</div>
        <h1 className="home-h1 small">Your learning<br/>projects</h1>
        <p className="home-sub">Drop in what you want to learn. I research it, break it into bite-sized pills, and drip them to you — one idea at a time.</p>

        <div className="proj-grid">
          <button className="proj-new" onClick={onNew}>
            <span className="proj-new-plus"><Icon name="plus" size={26} /></span>
            <span>New project</span>
            <small>Add a topic + your materials</small>
          </button>

          {projects.map((p) => {
            const topic = window.TOPICS[p.topicId];
            const total = topic.pills.length;
            const done = p.doneCount || 0;
            const pct = p.status === "learning" ? done / (p.includedCount || total) : 0;
            return (
              <button key={p.id} className="proj-card" onClick={() => onOpen(p)}>
                <div className="proj-top">
                  <span className="proj-emoji">{topic.emoji}</span>
                  <span className={`proj-badge ${p.status}`}>
                    {p.status === "researching" && "Researching…"}
                    {p.status === "review" && "Plan ready to review"}
                    {p.status === "learning" && `${done}/${p.includedCount || total} pills`}
                  </span>
                </div>
                <div className="proj-name">{p.name}</div>
                <div className="proj-sub">{topic.title}</div>
                {p.status === "learning" && (
                  <div className="proj-bar"><span style={{ width: `${pct * 100}%` }} /></div>
                )}
                <div className="proj-foot">
                  <span><Icon name="send" size={13} stroke={2} /> {p.cadence}</span>
                  {p.status === "review" && <span className="proj-cta">Review plan <Icon name="arrow" size={13} /></span>}
                  {p.status === "learning" && <span className="proj-cta">Continue <Icon name="arrow" size={13} /></span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   CREATE PROJECT — name it + throw in materials
   =================================================================== */
function CreateProject({ onBack, onStart }) {
  const [name, setName] = useStateS("");
  const [mats, setMats] = useStateS([]);
  const [linkVal, setLinkVal] = useStateS("");
  const [cadence, setCadence] = useStateS("Each morning");
  const [dragOver, setDragOver] = useStateS(false);

  const samples = [
    { type: "link", label: "Hermes internal docs" },
    { type: "pdf", label: "Agent design guide.pdf" },
    { type: "link", label: "Building effective agents (article)" }
  ];

  function addLink() {
    const v = linkVal.trim();
    if (!v) return;
    const isLink = /^https?:|\./.test(v);
    setMats((m) => [...m, { type: isLink ? "link" : "note", label: v }]);
    setLinkVal("");
  }

  return (
    <div className="create">
      <div className="create-inner">
        <button className="hub-home" onClick={onBack}><Icon name="back" size={16} /> Projects</button>
        <h1 className="create-h1">Start a new project</h1>

        <label className="field-label">Project name</label>
        <input className="create-input" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Hermes agent" autoFocus />

        <label className="field-label">Reference materials <span>— links, PDFs, notes. I’ll read them so you don’t have to.</span></label>
        <div className={`dropzone ${dragOver ? "over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); setMats((m) => [...m, { type: "pdf", label: (e.dataTransfer.files[0]?.name) || "Dropped file" }]); }}>
          <Icon name="doc" size={22} stroke={1.8} />
          <span>Drag files here</span>
        </div>

        <div className="link-row">
          <input className="link-input" value={linkVal} onChange={(e) => setLinkVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLink()} placeholder="Paste a link or type a note, then Enter" />
          <button className="link-add" onClick={addLink}><Icon name="plus" size={16} /> Add</button>
        </div>

        {mats.length > 0 && (
          <div className="mat-list">
            {mats.map((m, i) => <MaterialChip key={i} m={m} onRemove={() => setMats((a) => a.filter((_, j) => j !== i))} />)}
          </div>
        )}
        {mats.length === 0 && (
          <div className="mat-sample">
            <span>Try:</span>
            {samples.map((s, i) => (
              <button key={i} className="mat-add-sample" onClick={() => setMats((m) => [...m, s])}>+ {s.label}</button>
            ))}
          </div>
        )}

        <label className="field-label">Delivery cadence <span>— when should pills land in your Slack?</span></label>
        <div className="cadence-row">
          {["Each morning", "Twice a day", "Weekdays only"].map((c) => (
            <button key={c} className={`cadence-btn ${cadence === c ? "on" : ""}`} onClick={() => setCadence(c)}>{c}</button>
          ))}
        </div>

        <button className="create-go" disabled={!name.trim()}
          onClick={() => onStart({ name: name.trim(), mats: mats.length ? mats : samples, cadence })}>
          Research & build my plan <Icon name="arrow" size={18} />
        </button>
      </div>
    </div>
  );
}

/* ===================================================================
   RESEARCHING — reading materials & drafting a plan
   =================================================================== */
function Researching({ name, mats, onDone }) {
  const steps = [
    "Reading your materials…",
    "Cross-checking with fresh research…",
    "Pulling out the core concepts…",
    "Sequencing them easiest-first…",
    "Drafting your learning plan…"
  ];
  const [step, setStep] = useStateS(0);
  useEffectS(() => {
    if (step < steps.length - 1) {
      const t = setTimeout(() => setStep(step + 1), 640);
      return () => clearTimeout(t);
    }
    const t = setTimeout(onDone, 760);
    return () => clearTimeout(t);
  }, [step]);
  return (
    <div className="gen">
      <div className="gen-orb"><span/><span/><span/></div>
      <div className="gen-topic">“{name}”</div>
      <div className="gen-mats">
        {(mats || []).map((m, i) => <MaterialChip key={i} m={m} />)}
      </div>
      <ul className="gen-steps">
        {steps.map((s, i) => (
          <li key={i} className={i < step ? "done" : i === step ? "active" : ""}>
            <span className="gen-dot">{i < step ? <Icon name="check" size={13} /> : null}</span>{s}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ===================================================================
   PLAN REVIEW — approve / trim the core concepts
   =================================================================== */
function PlanReview({ name, topic, onApprove, onBack }) {
  const [included, setIncluded] = useStateS(() => topic.pills.map((p) => p.id));
  const inSet = new Set(included);
  const keptPills = topic.pills.filter((p) => inSet.has(p.id));
  const totalMin = keptPills.reduce((a, p) => a + p.minutes, 0);

  function toggle(id) {
    setIncluded((arr) => arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  }

  return (
    <div className="plan">
      <div className="plan-inner">
        <button className="hub-home" onClick={onBack}><Icon name="back" size={16} /> Back</button>
        <div className="plan-kicker">PLAN READY · FROM YOUR MATERIALS</div>
        <h1 className="plan-h1">Here’s the plan for<br/>“{name}”</h1>
        <p className="plan-sub">I broke it into {topic.pills.length} core concepts, easiest first. Keep what matters, switch off anything you already know — then approve and I’ll turn them into pills.</p>

        <div className="plan-list">
          {topic.pills.map((p, i) => {
            const on = inSet.has(p.id);
            return (
              <div key={p.id} className={`plan-row ${on ? "" : "off"}`}>
                <span className="plan-drag"><Icon name="drag" size={16} /></span>
                <span className="plan-num">{i + 1}</span>
                <div className="plan-meta">
                  <div className="plan-title">{p.title}</div>
                  <div className="plan-hook">{p.hook}</div>
                </div>
                <span className="plan-min">{p.minutes}m</span>
                <button className={`plan-toggle ${on ? "on" : ""}`} onClick={() => toggle(p.id)} aria-label="include">
                  <span className="pt-knob">{on ? <Icon name="check" size={13} /> : <Icon name="x" size={12} />}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="plan-foot">
        <div className="plan-foot-meta">
          <b>{keptPills.length} pills</b> · ~{totalMin} min total · drips to Slack
        </div>
        <button className="plan-approve" disabled={keptPills.length === 0}
          onClick={() => onApprove(included)}>
          Approve & create pills <Icon name="check" size={18} />
        </button>
      </div>
    </div>
  );
}

/* ===================================================================
   FOCUS MODE — one pill (now with two-tier completion)
   =================================================================== */
function FocusPill({ topic, pills, index, completedSet, shakySet, onComplete, onClose, onNav }) {
  const pill = pills[index];
  const [picked, setPicked] = useStateS(null);
  const [revealed, setRevealed] = useStateS(false);
  const alreadyDone = completedSet.has(pill.id);

  useEffectS(() => { setPicked(null); setRevealed(false); }, [pill.id]);

  const correct = picked === pill.check.answer;
  const canComplete = revealed && correct;
  const isLast = index === pills.length - 1;

  return (
    <div className="focus">
      <div className="focus-bar">
        <button className="focus-close" onClick={onClose}><Icon name="back" size={18} /> Plan</button>
        <div className="focus-prog">
          {pills.map((p, i) => (
            <span key={p.id} className={`fp-seg ${i === index ? "on" : ""} ${completedSet.has(p.id) ? "filled" : ""}`} />
          ))}
        </div>
        <span className="focus-time"><Icon name="clock" size={14} stroke={2.4} /> {pill.minutes} min</span>
      </div>

      <div className="focus-scroll">
        <div className="focus-card">
          <div className="fc-meta-row">
            <div className="fc-step">PILL {index + 1} OF {pills.length}</div>
            <div className="fc-slack-note"><Icon name="send" size={13} stroke={2} /> delivered this morning</div>
          </div>
          <h2 className="fc-title">{pill.title}</h2>
          <p className="fc-hook">{pill.hook}</p>

          <div className="fc-analogy">
            <div className="fc-analogy-label">PICTURE THIS</div>
            <p>{pill.analogy}</p>
          </div>

          <div className="fc-points">
            {pill.points.map((pt, i) => (
              <div key={i} className="fc-point"><span className="fc-pt-dot" />{pt}</div>
            ))}
          </div>

          <div className="fc-check">
            <div className="fc-check-q">Quick check · {pill.check.q}</div>
            <div className="fc-options">
              {pill.check.options.map((opt, i) => {
                let cls = "fc-opt";
                if (revealed) {
                  if (i === pill.check.answer) cls += " correct";
                  else if (i === picked) cls += " wrong";
                } else if (i === picked) cls += " picked";
                return (
                  <button key={i} className={cls} disabled={revealed}
                    onClick={() => { setPicked(i); setRevealed(true); }}>
                    <span className="fc-opt-mark" />{opt}
                  </button>
                );
              })}
            </div>
            {revealed && (
              <div className={`fc-feedback ${correct ? "good" : "bad"}`}>
                {correct ? "✓ Nailed it." : "Not quite — tap the green one to see why."}
                {!correct && <button className="fc-retry" onClick={() => { setPicked(null); setRevealed(false); }}>Try again</button>}
              </div>
            )}
          </div>

          <div className="fc-takeaway">
            <span className="fc-take-label">TAKEAWAY</span>
            {pill.takeaway}
          </div>
        </div>
      </div>

      <div className="focus-foot">
        <button className="focus-prev" disabled={index === 0} onClick={() => onNav(index - 1)}><Icon name="back" size={16} /></button>
        {alreadyDone ? (
          <button className="focus-done ready" onClick={() => onComplete(pill.id, isLast, "mastered")}>
            {isLast ? "Finish" : "Next pill"} <Icon name="arrow" size={17} />
          </button>
        ) : (
          <div className={`focus-twin ${canComplete ? "ready" : "locked"}`}>
            <button className="twin-shaky" disabled={!canComplete} onClick={() => onComplete(pill.id, isLast, "shaky")}>
              🤔 Kinda — bring it back
            </button>
            <button className="twin-got" disabled={!canComplete} onClick={() => onComplete(pill.id, isLast, "mastered")}>
              Got it <Icon name="check" size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================================================================
   SPACED REVIEW — an old concept resurfaced
   =================================================================== */
function SpacedReview({ pill, onResult, onClose }) {
  const [picked, setPicked] = useStateS(null);
  const [revealed, setRevealed] = useStateS(false);
  const correct = picked === pill.check.answer;
  return (
    <div className="srev-overlay" onClick={onClose}>
      <div className="srev" onClick={(e) => e.stopPropagation()}>
        <div className="srev-head">
          <span className="srev-tag"><Icon name="refresh" size={14} /> SPACED REVIEW</span>
          <button className="srev-x" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="srev-from">Still got this from earlier?</div>
        <h3 className="srev-concept">{pill.title}</h3>
        <div className="srev-q">{pill.check.q}</div>
        <div className="fc-options">
          {pill.check.options.map((opt, i) => {
            let cls = "fc-opt";
            if (revealed) { if (i === pill.check.answer) cls += " correct"; else if (i === picked) cls += " wrong"; }
            else if (i === picked) cls += " picked";
            return (
              <button key={i} className={cls} disabled={revealed}
                onClick={() => { setPicked(i); setRevealed(true); }}>
                <span className="fc-opt-mark" />{opt}
              </button>
            );
          })}
        </div>
        {revealed && (
          <div className="srev-foot">
            <span className={correct ? "good" : "bad"}>{correct ? "✓ Still locked in. Nice." : "Worth another look — keeping it in rotation."}</span>
            <button className="srev-done" onClick={() => onResult(pill.id, correct)}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================================================================
   ADD RESOURCES — drop more fuel into a live project
   =================================================================== */
function AddResources({ existing, onAdd, onClose }) {
  const [mats, setMats] = useStateS([]);
  const [linkVal, setLinkVal] = useStateS("");
  function addLink() {
    const v = linkVal.trim();
    if (!v) return;
    const isLink = /^https?:|\./.test(v);
    setMats((m) => [...m, { type: isLink ? "link" : "note", label: v }]);
    setLinkVal("");
  }
  return (
    <div className="srev-overlay" onClick={onClose}>
      <div className="srev addres" onClick={(e) => e.stopPropagation()}>
        <div className="srev-head">
          <span className="srev-tag rainbow-tag">✨ ADD FUEL</span>
          <button className="srev-x" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <h3 className="srev-concept">Found more? Toss it in.</h3>
        <div className="srev-from">I’ll re-read it and slot any new ideas into your plan — only if they add something.</div>

        {existing && existing.length > 0 && (
          <div className="addres-have">
            <span>Already in:</span>
            {existing.slice(0, 4).map((m, i) => <MaterialChip key={i} m={m} />)}
            {existing.length > 4 && <span className="addres-more">+{existing.length - 4}</span>}
          </div>
        )}

        <div className="link-row" style={{ marginTop: 16 }}>
          <input className="link-input" value={linkVal} onChange={(e) => setLinkVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLink()} placeholder="Paste a link or note, then Enter" autoFocus />
          <button className="link-add" onClick={addLink}><Icon name="plus" size={16} /> Add</button>
        </div>
        {mats.length > 0 && (
          <div className="mat-list">
            {mats.map((m, i) => <MaterialChip key={i} m={m} onRemove={() => setMats((a) => a.filter((_, j) => j !== i))} />)}
          </div>
        )}
        {mats.length === 0 && (
          <div className="mat-sample">
            <span>Try:</span>
            <button className="mat-add-sample" onClick={() => setMats((m) => [...m, { type: "pdf", label: "New deep-dive.pdf" }])}>+ New deep-dive.pdf</button>
            <button className="mat-add-sample" onClick={() => setMats((m) => [...m, { type: "link", label: "A great thread I found" }])}>+ A great thread I found</button>
          </div>
        )}

        <div className="srev-foot" style={{ marginTop: 22 }}>
          <span className="addres-note">Re-adapts only if there’s something new</span>
          <button className="srev-done" disabled={mats.length === 0} onClick={() => onAdd(mats)}>Re-adapt plan ✨</button>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   ADAPT OVERLAY — quick "thinking" pass while the plan updates
   =================================================================== */
function AdaptOverlay({ label }) {
  return (
    <div className="adapt-overlay">
      <div className="adapt-card">
        <div className="gen-orb small"><span/><span/><span/></div>
        <div className="adapt-label">{label}</div>
      </div>
    </div>
  );
}

/* ===================================================================
   TOAST
   =================================================================== */
function Toast({ msg }) {
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}

Object.assign(window, { Projects, CreateProject, Researching, PlanReview, FocusPill, SpacedReview, AddResources, AdaptOverlay, Toast });
