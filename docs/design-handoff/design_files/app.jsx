// app.jsx — state, flow routing, themes, AI generation, adaptive plan.
const { useState: useStateA, useEffect: useEffectA, useMemo, useRef: useRefA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "unicorn",
  "metaphor": "path",
  "font": "bubbly",
  "density": "regular",
  "reduceMotion": false
}/*EDITMODE-END*/;

const THEMES = {
  unicorn: { scheme: "light", vars: {
    "--bg": "#f3ecff", "--surface": "#ffffff", "--surface-2": "#fbf6ff",
    "--text": "#2a1b46", "--text-dim": "#8b7aa8", "--border-solid": "#ece0fb", "--track": "#2a1b4612",
    "--accent": "#d6249f", "--accent-2": "#1fb6d6", "--accent-soft": "rgba(214,36,159,.12)",
    "--grad": "linear-gradient(135deg,#ff5fa2 0%,#a855f7 50%,#22b8d6 100%)",
    "--grad-text": "linear-gradient(120deg,#ff3d97,#a855f7 45%,#16a5c9)",
    "--glow": "0 16px 44px -12px rgba(168,85,247,.55)",
    "--m1": "#ffd1ec", "--m2": "#d9c8ff", "--m3": "#c8f5ff", "--m4": "#fff4c8"
  }},
  cyber: { scheme: "dark", vars: {
    "--bg": "#0d0a1e", "--surface": "#171232", "--surface-2": "#211a42",
    "--text": "#f1e9ff", "--text-dim": "#9c8cc8", "--border-solid": "#2d2456", "--track": "#ffffff14",
    "--accent": "#ff5fa2", "--accent-2": "#22e3c4", "--accent-soft": "rgba(255,95,162,.18)",
    "--grad": "linear-gradient(135deg,#ff5fa2 0%,#7c3aed 50%,#22d3ee 100%)",
    "--grad-text": "linear-gradient(120deg,#ff8fc4,#b483ff 45%,#3fe0ff)",
    "--glow": "0 0 34px -2px rgba(124,58,237,.7)",
    "--m1": "#3a1d6e", "--m2": "#6e1d5b", "--m3": "#1d4d6e", "--m4": "#1d6e57"
  }},
  calm: { scheme: "light", vars: {
    "--bg": "#f7f4ec", "--surface": "#ffffff", "--surface-2": "#fbf8f1",
    "--text": "#221f17", "--text-dim": "#7d7765", "--border-solid": "#e7e1d3", "--track": "#221f1712",
    "--accent": "#e8633a", "--accent-2": "#1f9e74", "--accent-soft": "rgba(232,99,58,.12)",
    "--grad": "linear-gradient(135deg,#e8633a,#e8a23a)", "--grad-text": "linear-gradient(120deg,#e8633a,#d98a2b)",
    "--glow": "0 14px 36px -16px rgba(232,99,58,.5)",
    "--m1": "#efe7da", "--m2": "#f3ece0", "--m3": "#efe7da", "--m4": "#f7f4ec"
  }}
};

const FONTS = {
  bubbly:  { head: "'Fredoka', sans-serif",   body: "'Nunito', sans-serif" },
  baloo:   { head: "'Baloo 2', cursive",      body: "'Nunito', sans-serif" },
  classic: { head: "'Bricolage Grotesque', sans-serif", body: "'Public Sans', sans-serif" }
};

const STORE_KEY = "mlh_projects_v3";

function seedProjects() {
  const base = JSON.parse(JSON.stringify(window.PROJECTS));
  return base.map((p) => {
    const topic = window.TOPICS[p.topicId];
    const common = { includedIds: topic.pills.map((x) => x.id), extraPills: [], done: {}, streak: 0, lastDay: null, materials: topic.materials || [] };
    if (p.status === "learning") return { ...p, ...common };
    return { ...p, ...common, includedIds: null };
  });
}
function loadProjects() {
  try { const s = localStorage.getItem(STORE_KEY); if (s) return JSON.parse(s); } catch {}
  return seedProjects();
}

function authoredMatch(name) {
  const lc = name.toLowerCase();
  if (/agent|hermes|\bllm\b|\bai\b|prompt/.test(lc)) return "agents";
  if (/espresso|coffee|latte|barista/.test(lc)) return "espresso";
  if (/stock|market|invest|share|finance|dividend/.test(lc)) return "stocks";
  return null;
}

/* ---- real AI plan generation (with graceful fallback) ---- */
function parseJSON(raw) {
  const a = raw.indexOf("{"), b = raw.lastIndexOf("}");
  if (a < 0 || b < 0) throw new Error("no json");
  return JSON.parse(raw.slice(a, b + 1));
}
async function aiGenerateTopic(name, mats) {
  const matStr = (mats || []).map((m) => m.label).join(", ");
  const prompt = `You design ADHD-friendly micro-learning. Break the topic "${name}" into a plan of exactly 5 bite-sized concepts, ordered easiest-first.${matStr ? ` The learner provided these materials: ${matStr}.` : ""}
Return ONLY minified JSON (no prose, no markdown), shaped EXACTLY:
{"emoji":"<one emoji>","blurb":"<one short tagline>","pills":[{"title":"<3-6 words>","minutes":2,"hook":"<one plain sentence>","analogy":"<1-2 vivid everyday-analogy sentences>","points":["<short>","<short>","<short>"],"check":{"q":"<question>","options":["<a>","<b>","<c>"],"answer":0},"takeaway":"<short punchy line>"}]}
Rules: exactly 5 pills; exactly 3 points and 3 options each; "answer" is the correct option index (0-2); keep every string concise.`;
  const raw = await window.claude.complete(prompt);
  const j = parseJSON(raw);
  if (!Array.isArray(j.pills) || j.pills.length < 3) throw new Error("bad shape");
  const id = "ai-" + Date.now();
  window.TOPICS[id] = {
    id, title: name, blurb: j.blurb || "Freshly generated for you.", emoji: j.emoji || "✨",
    materials: mats || [],
    pills: j.pills.slice(0, 6).map((p, i) => ({
      id: id + "-p" + i, title: p.title || ("Concept " + (i + 1)), minutes: p.minutes || 2,
      hook: p.hook || "", analogy: p.analogy || "", points: (p.points || []).slice(0, 4),
      check: { q: p.check?.q || "Got it?", options: (p.check?.options || ["Yes", "Sort of", "No"]).slice(0, 3), answer: Math.max(0, Math.min(2, p.check?.answer ?? 0)) },
      takeaway: p.takeaway || ""
    }))
  };
  return id;
}
async function aiExtraPill(topicId, name, mats) {
  const matStr = (mats || []).map((m) => m.label).join(", ");
  const prompt = `A learner studying "${name}" just added new material: ${matStr}. Propose ONE new bite-sized concept it likely adds to their understanding.
Return ONLY minified JSON: {"title":"<3-6 words>","minutes":2,"hook":"<one sentence>","analogy":"<1-2 sentences>","points":["<short>","<short>","<short>"],"check":{"q":"<question>","options":["<a>","<b>","<c>"],"answer":0},"takeaway":"<short>"}`;
  const raw = await window.claude.complete(prompt);
  const p = parseJSON(raw);
  return {
    id: topicId + "-x" + Date.now(), title: p.title, minutes: p.minutes || 2, hook: p.hook, analogy: p.analogy,
    points: (p.points || []).slice(0, 4),
    check: { q: p.check?.q || "Got it?", options: (p.check?.options || ["Yes", "Sort of", "No"]).slice(0, 3), answer: Math.max(0, Math.min(2, p.check?.answer ?? 0)) },
    takeaway: p.takeaway || "", fromMaterial: true
  };
}

function makeReinforce(base) {
  return {
    id: base.id + "-r" + Date.now(), reinforce: true,
    title: "Lock in: " + base.title, minutes: 1,
    hook: "Quick re-take — let’s make this one really stick.",
    analogy: base.analogy,
    points: [base.takeaway, ...(base.points ? base.points.slice(0, 1) : [])],
    check: base.check, takeaway: base.takeaway
  };
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [view, setView] = useStateA("projects");
  const [projects, setProjects] = useStateA(loadProjects);
  const [activeId, setActiveId] = useStateA(null);
  const [pending, setPending] = useStateA(null);
  const [focusIdx, setFocusIdx] = useStateA(0);
  const [fireConfetti, setFireConfetti] = useStateA(0);
  const [finished, setFinished] = useStateA(false);
  const [reviewPillId, setReviewPillId] = useStateA(null);
  const [reviewDismissed, setReviewDismissed] = useStateA(false);
  const [showAddRes, setShowAddRes] = useStateA(false);
  const [adaptLabel, setAdaptLabel] = useStateA(null);
  const [toast, setToast] = useStateA("");
  const genRef = useRefA(null);

  useEffectA(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(projects)); } catch {} }, [projects]);
  useEffectA(() => { if (!toast) return; const x = setTimeout(() => setToast(""), 3000); return () => clearTimeout(x); }, [toast]);

  const project = activeId ? projects.find((p) => p.id === activeId) : null;
  const topic = project ? window.TOPICS[project.topicId] : null;

  const pool = useMemo(() => topic ? [...topic.pills, ...((project && project.extraPills) || [])] : [], [topic, project && project.extraPills]);
  const pills = useMemo(() => {
    if (!project || !topic) return [];
    const ids = project.includedIds || topic.pills.map((p) => p.id);
    const byId = new Map(pool.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter(Boolean);
  }, [project, topic, pool]);

  const doneMap = project ? project.done || {} : {};
  const completedSet = useMemo(() => new Set(Object.keys(doneMap)), [doneMap]);
  const shakySet = useMemo(() => new Set(Object.keys(doneMap).filter((k) => doneMap[k] === "shaky")), [doneMap]);
  const firstIncompleteRaw = pills.findIndex((p) => !completedSet.has(p.id));
  const fi = firstIncompleteRaw === -1 ? pills.length : firstIncompleteRaw;
  const pct = pills.length ? Math.min(1, completedSet.size / pills.length) : 0;

  function patchProject(id, patch) {
    setProjects((arr) => arr.map((p) => p.id === id ? { ...p, ...(typeof patch === "function" ? patch(p) : patch) } : p));
  }

  /* ---- create / research / plan ---- */
  function startResearch({ name, mats, cadence }) {
    const matched = authoredMatch(name);
    // kick off generation now so it runs behind the research animation
    if (matched) {
      genRef.current = Promise.resolve({ topicId: matched, generated: false });
    } else {
      genRef.current = aiGenerateTopic(name, mats)
        .then((id) => ({ topicId: id, generated: true }))
        .catch(() => ({ topicId: "stocks", generated: false, failed: true }));
    }
    setPending({ name, mats, cadence });
    setView("researching");
  }
  async function researchDone() {
    let res = { topicId: "stocks", generated: false };
    try { res = await genRef.current; } catch {}
    const id = "u" + Date.now();
    const newProj = {
      id, name: pending.name, topicId: res.topicId, status: "review",
      cadence: pending.cadence, addedAgo: "Just now", materials: pending.mats,
      includedIds: null, extraPills: [], done: {}, streak: 0, lastDay: null
    };
    setProjects((arr) => [newProj, ...arr]);
    setActiveId(id);
    if (res.failed) setToast("⚡ AI was busy — started you on a sample plan");
    setView("plan");
  }
  function approvePlan(includedIds) {
    patchProject(activeId, { includedIds, status: "learning" });
    setFinished(false); setReviewDismissed(false); setView("hub");
  }

  function openProject(p) {
    setActiveId(p.id); setFinished(false); setReviewDismissed(false);
    setView(p.status === "learning" ? "hub" : "plan");
  }

  function openPill(i) { setFocusIdx(i); setView("focus"); }

  function completePill(pillId, isLast, level) {
    let didAdapt = false;
    patchProject(activeId, (p) => {
      const today = new Date().toDateString();
      const done = { ...(p.done || {}), [pillId]: level };
      let streak = p.streak || 0;
      if (p.lastDay !== today) streak += 1;
      let includedIds = p.includedIds ? [...p.includedIds] : (topic ? topic.pills.map((x) => x.id) : []);
      let extraPills = p.extraPills ? [...p.extraPills] : [];
      if (level === "shaky") {
        const base = [...(topic ? topic.pills : []), ...extraPills].find((x) => x.id === pillId);
        if (base && !base.reinforce) {
          const r = makeReinforce(base);
          extraPills.push(r);
          const at = includedIds.indexOf(pillId);
          includedIds.splice(at + 1, 0, r.id);
          didAdapt = true;
        }
      }
      return { done, streak, lastDay: today, includedIds, extraPills };
    });

    if (level === "mastered" && !t.reduceMotion) setFireConfetti((n) => n + 1);
    if (level === "shaky" && didAdapt) setToast("💪 Plan adapted — added a quick re-take");

    if (level === "shaky") {
      setTimeout(() => setFocusIdx(focusIdx + 1), 460); // the new re-take sits right after
    } else if (isLast) {
      setTimeout(() => { setFinished(true); setView("hub"); }, 600);
    } else {
      setTimeout(() => setFocusIdx(focusIdx + 1), 460);
    }
  }

  /* ---- add resources mid-project → re-adapt ---- */
  async function addResources(newMats) {
    setShowAddRes(false);
    setAdaptLabel("Re-reading your new materials…");
    const baseTopicId = project.topicId;
    const name = topic.title;
    await new Promise((r) => setTimeout(r, 700));
    setAdaptLabel("Updating your plan…");

    let newPill = null;
    try {
      newPill = await aiExtraPill(baseTopicId, name, newMats);
    } catch {
      // fallback: an authored bonus concept not already added
      const pool2 = window.EXTRAS[baseTopicId] || [];
      const haveIds = new Set((project.extraPills || []).map((x) => x.id));
      newPill = pool2.find((x) => !haveIds.has(x.id)) || null;
      if (newPill) newPill = { ...newPill, fromMaterial: true };
    }

    patchProject(activeId, (p) => {
      const materials = [...(p.materials || []), ...newMats];
      if (!newPill) return { materials };
      const extraPills = [...(p.extraPills || []), newPill];
      const includedIds = [...(p.includedIds || []), newPill.id];
      return { materials, extraPills, includedIds };
    });

    setAdaptLabel(null);
    setToast(newPill ? `✨ Plan grew — added “${newPill.title}”` : "Your plan already covers that — nice!");
  }

  function reviewResult(pillId, correct) {
    if (correct) patchProject(activeId, (p) => {
      const done = { ...(p.done || {}) };
      if (done[pillId] === "shaky") done[pillId] = "mastered";
      return { done };
    });
    setReviewPillId(null); setReviewDismissed(true);
  }

  const reviewCandidate = useMemo(() => {
    if (!project || project.status !== "learning") return null;
    const doneIds = pills.filter((p) => completedSet.has(p.id) && !p.reinforce);
    if (doneIds.length < 2) return null;
    const shaky = doneIds.find((p) => shakySet.has(p.id));
    return shaky || doneIds[0];
  }, [project && project.id, pills, completedSet, shakySet]);

  const projectCards = projects.map((p) => {
    const tp = window.TOPICS[p.topicId];
    const total = (p.includedIds ? p.includedIds.length : (tp ? tp.pills.length : 0));
    return { ...p, doneCount: Object.keys(p.done || {}).length, includedCount: total };
  });

  /* ---- theme vars ---- */
  const themeDef = THEMES[t.theme] || THEMES.unicorn;
  const fontset = FONTS[t.font] || FONTS.bubbly;
  const gap = t.density === "compact" ? 0.8 : t.density === "comfy" ? 1.22 : 1;
  const rootStyle = {
    ...themeDef.vars,
    "--font-head": fontset.head, "--font-body": fontset.body, "--gap": gap,
    fontFamily: fontset.body, color: "var(--text)", background: "var(--bg)"
  };

  const showReviewBanner = view === "hub" && reviewCandidate && !reviewDismissed;
  const showFuelBtn = view === "hub" && project && project.status === "learning";

  return (
    <div className="app" data-motion={t.reduceMotion ? "off" : "on"} data-theme={t.theme} data-scheme={themeDef.scheme} style={rootStyle}>
      <div className="bg-mesh" />
      <Confetti fire={fireConfetti} />

      {view === "projects" && <Projects projects={projectCards} onOpen={openProject} onNew={() => setView("create")} />}
      {view === "create" && <CreateProject onBack={() => setView("projects")} onStart={startResearch} />}
      {view === "researching" && pending && <Researching name={pending.name} mats={pending.mats} onDone={researchDone} />}
      {view === "plan" && topic && (
        <PlanReview name={project.name} topic={topic} onApprove={approvePlan} onBack={() => setView("projects")} />
      )}

      {view === "hub" && project && topic && (
        <div className="hub">
          <header className="hub-head">
            <button className="hub-home" onClick={() => setView("projects")}><Icon name="back" size={16} /> All projects</button>
            <div className="hub-title-row">
              <span className="hub-emoji">{topic.emoji}</span>
              <div>
                <h1 className="hub-title gradtext">{project.name}</h1>
                <p className="hub-blurb">{topic.blurb}</p>
              </div>
            </div>

            <div className="hub-stats">
              <div className="stat">
                <ProgressRing value={pct} />
                <div className="stat-meta"><b>{completedSet.size}/{pills.length}</b><span>pills done</span></div>
              </div>
              <div className="stat">
                <span className="streak">🔥 {project.streak || 0}</span>
                <div className="stat-meta"><b>day streak</b><span>keep it warm</span></div>
              </div>
              <div className="stat delivery">
                <span className="deliver-ic"><Icon name="send" size={18} stroke={2} /></span>
                <div className="stat-meta"><b>Slack · {project.cadence}</b><span>next pill drips automatically</span></div>
              </div>
            </div>

            <div className="hub-controls">
              <div className="hub-switch">
                <span className="switch-label">View as</span>
                {[["path","Path"],["cards","Cards"],["grid","Grid"]].map(([k, label]) => (
                  <button key={k} className={`switch-btn ${t.metaphor === k ? "on" : ""}`} onClick={() => setTweak("metaphor", k)}>{label}</button>
                ))}
              </div>
              {showFuelBtn && (
                <button className="fuel-btn" onClick={() => setShowAddRes(true)}>
                  <Icon name="plus" size={16} /> Add fuel ✨
                </button>
              )}
            </div>
          </header>

          {showReviewBanner && (
            <button className="review-banner" onClick={() => setReviewPillId(reviewCandidate.id)}>
              <span className="rb-ic"><Icon name="refresh" size={18} /></span>
              <span className="rb-text"><b>Spaced review</b>Quick — do you still remember <i>“{reviewCandidate.title}”</i>?</span>
              <span className="rb-go">Check <Icon name="arrow" size={15} /></span>
              <span className="rb-dismiss" onClick={(e) => { e.stopPropagation(); setReviewDismissed(true); }}><Icon name="x" size={15} /></span>
            </button>
          )}

          {finished && pct === 1 && (
            <div className="finish-banner">🎉 You finished <b>{project.name}</b>! Every pill complete.<button onClick={() => setFinished(false)}>nice</button></div>
          )}

          <main className="hub-body">
            {t.metaphor === "path" && <PathView pills={pills} completedSet={completedSet} shakySet={shakySet} firstIncomplete={fi} onOpen={openPill} />}
            {t.metaphor === "cards" && <CardsView pills={pills} completedSet={completedSet} firstIncomplete={fi} onOpen={openPill} />}
            {t.metaphor === "grid" && <GridView pills={pills} completedSet={completedSet} firstIncomplete={fi} onOpen={openPill} />}
          </main>
        </div>
      )}

      {view === "focus" && project && topic && pills.length > 0 && (
        <FocusPill topic={topic} pills={pills} index={Math.min(focusIdx, pills.length - 1)}
          completedSet={completedSet} shakySet={shakySet}
          onComplete={completePill} onClose={() => setView("hub")} onNav={setFocusIdx} />
      )}

      {reviewPillId && pills.find((p) => p.id === reviewPillId) && (
        <SpacedReview pill={pills.find((p) => p.id === reviewPillId)} onResult={reviewResult} onClose={() => setReviewPillId(null)} />
      )}

      {showAddRes && project && (
        <AddResources existing={project.materials} onAdd={addResources} onClose={() => setShowAddRes(false)} />
      )}
      {adaptLabel && <AdaptOverlay label={adaptLabel} />}
      <Toast msg={toast} />

      <TweaksPanel>
        <TweakSection label="Vibe" />
        <TweakRadio label="Theme" value={t.theme} options={["unicorn", "cyber", "calm"]} onChange={(v) => setTweak("theme", v)} />
        <TweakRadio label="Font" value={t.font} options={["bubbly", "baloo", "classic"]} onChange={(v) => setTweak("font", v)} />
        <TweakSection label="Navigation" />
        <TweakRadio label="Module metaphor" value={t.metaphor} options={["path", "cards", "grid"]} onChange={(v) => setTweak("metaphor", v)} />
        <TweakRadio label="Density" value={t.density} options={["compact", "regular", "comfy"]} onChange={(v) => setTweak("density", v)} />
        <TweakSection label="Accessibility" />
        <TweakToggle label="Reduce motion" value={t.reduceMotion} onChange={(v) => setTweak("reduceMotion", v)} />
        <TweakButton label="Reset progress" onClick={() => { try { localStorage.removeItem(STORE_KEY); } catch {} location.reload(); }} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
