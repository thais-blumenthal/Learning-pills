// components.jsx — shared UI for the micro-learning hub.
const { useState, useEffect, useRef } = React;

/* ---------------- tiny icon set (simple line icons) ---------------- */
function Icon({ name, size = 20, stroke = 2.2, style }) {
  const common = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round",
    strokeLinejoin: "round", style
  };
  switch (name) {
    case "check": return <svg {...common}><polyline points="20 6 9 17 4 12" /></svg>;
    case "lock": return <svg {...common}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
    case "clock": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>;
    case "arrow": return <svg {...common}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
    case "back": return <svg {...common}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>;
    case "play": return <svg {...common}><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" /></svg>;
    case "spark": return <svg {...common}><path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18" /></svg>;
    case "plus": return <svg {...common}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
    case "grid": return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case "link": return <svg {...common}><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></svg>;
    case "doc": return <svg {...common}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><polyline points="14 3 14 8 19 8" /></svg>;
    case "note": return <svg {...common}><path d="M4 4h16v12l-4 4H4z" /><polyline points="20 16 16 16 16 20" /></svg>;
    case "send": return <svg {...common}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>;
    case "refresh": return <svg {...common}><path d="M21 12a9 9 0 1 1-3-6.7" /><polyline points="21 4 21 10 15 10" /></svg>;
    case "x": return <svg {...common}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
    case "drag": return <svg {...common}><circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.4" fill="currentColor" stroke="none"/></svg>;
    default: return null;
  }
}

/* material reference chip (the resources you "throw in") */
function MaterialChip({ m, onRemove }) {
  const ic = m.type === "pdf" ? "doc" : m.type === "note" ? "note" : "link";
  return (
    <span className="mat-chip">
      <Icon name={ic} size={15} stroke={2} />
      {m.label}
      {onRemove && <button className="mat-x" onClick={onRemove} aria-label="remove"><Icon name="x" size={13} /></button>}
    </span>
  );
}

/* ---------------- progress ring ---------------- */
function ProgressRing({ value, size = 46, stroke = 5 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)}
        style={{ transition: "stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)" }} />
    </svg>
  );
}

/* ---------------- confetti burst ---------------- */
function Confetti({ fire }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!fire || !ref.current) return;
    const host = ref.current;
    const colors = ["#ff5fa2", "#a855f7", "#22d3ee", "#fde047", "#22c55e", "#fb7185"];
    const N = 70;
    for (let i = 0; i < N; i++) {
      const s = document.createElement("span");
      const sz = 6 + Math.random() * 8;
      s.style.cssText = `position:absolute;left:50%;top:42%;width:${sz}px;height:${sz*0.6}px;
        background:${colors[i%colors.length]};border-radius:2px;pointer-events:none;`;
      host.appendChild(s);
      const ang = Math.random() * Math.PI * 2;
      const vel = 120 + Math.random() * 320;
      const dx = Math.cos(ang) * vel, dy = Math.sin(ang) * vel - 160;
      s.animate([
        { transform: "translate(-50%,-50%) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx}px,${dy + 420}px) rotate(${Math.random()*720-360}deg)`, opacity: 0 }
      ], { duration: 1100 + Math.random()*700, easing: "cubic-bezier(.15,.7,.3,1)" })
        .onfinish = () => s.remove();
    }
  }, [fire]);
  return <div ref={ref} style={{ position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none", overflow: "hidden" }} />;
}

/* ---------------- pill status helper ---------------- */
function statusOf(idx, firstIncomplete, completedSet, pill) {
  if (completedSet.has(pill.id)) return "done";
  if (idx === firstIncomplete) return "current";
  if (idx < firstIncomplete) return "done";
  return "locked";
}

/* =====================================================================
   METAPHOR 1 — THE PATH (primary, ADHD-friendly journey)
   ===================================================================== */
/* rainbow palette for path nodes (unicorn vibe) */
const RAINBOW = ["#ff5fa2", "#a855f7", "#22b8d6", "#f59e0b", "#22c55e", "#ec4899", "#6366f1", "#06b6d4"];

function PathView({ topic, pills, completedSet, shakySet, firstIncomplete, onOpen }) {
  const list = pills || topic.pills;
  return (
    <div className="path-wrap">
      <div className="path-spine" />
      {list.map((pill, i) => {
        const st = statusOf(i, firstIncomplete, completedSet, pill);
        const shaky = shakySet && shakySet.has(pill.id);
        const hue = RAINBOW[i % RAINBOW.length];
        const side = i % 2 === 0 ? "left" : "right";
        const nodeStyle = st === "done" ? { background: `linear-gradient(140deg, ${hue}, ${RAINBOW[(i + 2) % RAINBOW.length]})`, boxShadow: `0 8px 22px -6px ${hue}` }
          : st === "current" ? { borderColor: hue, color: hue } : null;
        return (
          <div key={pill.id} className={`path-row ${side}`}>
            <button
              className={`path-node ${st} ${pill.reinforce ? "reinforce" : ""}`}
              style={nodeStyle}
              disabled={st === "locked"}
              onClick={() => onOpen(i)}
              aria-label={pill.title}
            >
              {pill.reinforce ? <span className="node-emoji">💪</span>
                : st === "done" ? <Icon name="check" size={24} />
                : st === "locked" ? <Icon name="lock" size={20} />
                : <span className="node-num">{i + 1}</span>}
              {st === "current" && <span className="node-pulse" style={{ borderColor: hue }} />}
            </button>
            <button className={`path-card ${st} ${pill.reinforce ? "reinforce" : ""}`} disabled={st === "locked"} onClick={() => onOpen(i)}>
              <div className="pc-top">
                <span className="pc-step" style={{ color: hue }}>{pill.reinforce ? "💪 REINFORCE" : `PILL ${i + 1}`}</span>
                <span className="pc-time"><Icon name="clock" size={13} stroke={2.4} />{pill.minutes} min</span>
              </div>
              <div className="pc-title">{pill.title}</div>
              {st === "current" && <span className="pc-cta" style={{ color: hue }}>Start now <Icon name="arrow" size={15} /></span>}
              {st === "done" && !shaky && <span className="pc-done">Completed</span>}
              {st === "done" && shaky && <span className="pc-shaky">🤔 Marked to revisit</span>}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* =====================================================================
   METAPHOR 2 — CARD DECK
   ===================================================================== */
function CardsView({ topic, pills, completedSet, firstIncomplete, onOpen }) {
  const list = pills || topic.pills;
  return (
    <div className="deck-scroll">
      {list.map((pill, i) => {
        const st = statusOf(i, firstIncomplete, completedSet, pill);
        return (
          <button key={pill.id} className={`deck-card ${st}`} disabled={st === "locked"} onClick={() => onOpen(i)}>
            <div className="dc-head">
              <span className="dc-idx">{String(i + 1).padStart(2, "0")}</span>
              <span className={`dc-badge ${st}`}>
                {st === "done" ? <Icon name="check" size={14} /> : st === "locked" ? <Icon name="lock" size={13} /> : <Icon name="play" size={12} />}
              </span>
            </div>
            <div className="dc-title">{pill.title}</div>
            <div className="dc-hook">{pill.hook}</div>
            <div className="dc-foot">
              <span><Icon name="clock" size={13} stroke={2.4} /> {pill.minutes} min</span>
              {st !== "locked" && <span className="dc-go">{st === "done" ? "Review" : "Open"} <Icon name="arrow" size={14} /></span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* =====================================================================
   METAPHOR 3 — GRID OF TILES
   ===================================================================== */
function GridView({ topic, pills, completedSet, firstIncomplete, onOpen }) {
  const list = pills || topic.pills;
  return (
    <div className="tile-grid">
      {list.map((pill, i) => {
        const st = statusOf(i, firstIncomplete, completedSet, pill);
        return (
          <button key={pill.id} className={`tile ${st}`} disabled={st === "locked"} onClick={() => onOpen(i)}>
            <div className="tile-badge">
              {st === "done" ? <Icon name="check" size={20} /> : st === "locked" ? <Icon name="lock" size={18} /> : <span className="tile-num">{i + 1}</span>}
            </div>
            <div className="tile-title">{pill.title}</div>
            <div className="tile-time"><Icon name="clock" size={12} stroke={2.4} /> {pill.minutes} min</div>
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, { Icon, MaterialChip, ProgressRing, Confetti, statusOf, PathView, CardsView, GridView });
