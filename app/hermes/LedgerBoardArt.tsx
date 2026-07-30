/**
 * Static recreation of the public Hermes ledger for the marketing page.
 * Illustrative rows only: not live chain data.
 */
export default function LedgerBoardArt() {
  const rows = [
    {
      when: 'Jul 28 · 14:02',
      kind: 'CLOSE',
      decision: 'Stand down after gate',
      result: 'Wait',
      pnl: '-',
      tone: 'wait' as const,
    },
    {
      when: 'Jul 28 · 09:41',
      kind: 'CLOSE',
      decision: 'SOL long · sealed size',
      result: 'Up',
      pnl: '+$412.08',
      tone: 'pos' as const,
    },
    {
      when: 'Jul 27 · 22:18',
      kind: 'OPEN',
      decision: 'Path open · live mark',
      result: 'Open',
      pnl: '-',
      tone: 'open' as const,
    },
    {
      when: 'Jul 27 · 16:05',
      kind: 'CLOSE',
      decision: 'Preserve · no edge',
      result: 'Wait',
      pnl: '-',
      tone: 'wait' as const,
    },
    {
      when: 'Jul 26 · 11:33',
      kind: 'CLOSE',
      decision: 'BEAT long · sealed size',
      result: 'Down',
      pnl: '−$186.40',
      tone: 'neg' as const,
    },
    {
      when: 'Jul 25 · 08:12',
      kind: 'CLOSE',
      decision: 'SOL long · sealed size',
      result: 'Up',
      pnl: '+$901.22',
      tone: 'pos' as const,
    },
  ];

  return (
    <div className="hx-ledger-art" aria-hidden="true">
      <div className="hx-ledger-art-head">
        <div>
          <span className="hx-ledger-art-kicker">Public record</span>
          <strong className="hx-ledger-art-title">Hermes decision ledger</strong>
        </div>
        <div className="hx-ledger-art-stats">
          <span>
            <em>Sealed</em>
            <strong>1,284</strong>
          </span>
          <span>
            <em>Standing down</em>
            <strong>61%</strong>
          </span>
          <span>
            <em>Capital</em>
            <strong>Founder</strong>
          </span>
        </div>
      </div>

      <div className="hx-ledger-art-note">
        Every row is sealed before the outcome is known. Hash-chained · public · checkable.
      </div>

      <table className="hx-ledger-art-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Kind</th>
            <th>Decision</th>
            <th>Result</th>
            <th>PnL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.when}-${row.decision}`} className={`is-${row.tone}`}>
              <td>{row.when}</td>
              <td>
                <span className="hx-ledger-art-kind">{row.kind}</span>
              </td>
              <td>{row.decision}</td>
              <td>{row.result}</td>
              <td className="hx-ledger-art-pnl">{row.pnl}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
