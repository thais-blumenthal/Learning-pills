export default function PillLoading() {
  return (
    <div className="research-scrim" role="status" aria-live="polite">
      <div className="research-card">
        <div className="research-orb" aria-hidden="true" />
        <p className="research-title">Building your pill…</p>
        <ul className="research-steps">
          <li>Writing the lesson…</li>
          <li>Adding a quick check…</li>
        </ul>
      </div>
    </div>
  );
}
