/* Mockup 9 · the Sequence's left column (mockup 8's variant d, "Editorial"). No product panel: the stage copy, then a short
   annotated list in the sans (hairlines between captions). Each caption lands ~60 ms after the
   close-up shows its cause (Snap), opening its own slot: there are no empty rows. The three
   stages overlay in one grid cell under the copy (its height is the tallest stage's, so the
   column never changes height). Machine data is in mono, sentences in the sans.
   Govern: one tally (the screen holds the rows; no second table), each term appearing as
   its row is logged, then a double rule and a small-caps "Record → Sealed record" line with
   the record's ticking clock. The violet dot marks the latest
   line (it hangs in the margin, so text aligns with the copy) and goes out at the seal. */
import { useRef, type ReactNode } from "react";

import { DECISIONS, FINDS, INVENTORY, LEDGER, RUNTIME, SEALED, STAGES, count, type LeftProps, type Snap, type StillProps } from "./model";

/** machine data in mono (an AI system's name also in violet); sentences stay in the sans */
const M = ({ ai = false, children }: { ai?: boolean; children: ReactNode }) => <span className={ai ? "s8d-mono s8d-name" : "s8d-mono"}>{children}</span>;
const FIN = <M>ws-fin-01</M>;

/** the See captions (FINDS order) */
const SEE: { name: string; clause: ReactNode }[] = [
  { name: FINDS[0].name, clause: <>personal account, {FIN}</> },
  { name: FINDS[1].name, clause: <>running on {FIN}</> },
];
/** a decision, as it reads once made */
const DONE: Record<string, string> = { Block: "Blocked", Approve: "Approved", Protect: "Protected", Onboard: "Onboarded" };
/** the Secure captions (RUNTIME order): what each act acted on */
const SECURE: ReactNode[] = [
  <>a hidden instruction in <M>invoice_0412.pdf</M></>,
  <>Lena Brandt's email and IBAN</>,
  <><M>send_email</M> to <M>ext-sync.io</M></>,
];
/** the Govern tally: which LEDGER rows each verdict counts (in the order they are logged) */
const TALLY = [
  { word: "flagged", rows: [0, 1] },
  { word: "stripped", rows: [2] },
  { word: "masked", rows: [3] },
  { word: "blocked", rows: [4] },
];

/** the live dot: always rendered, so it can fade out (at the seal) rather than vanish */
function Dot({ on }: { on: boolean }) {
  return <span className="mD-live s8d-dot" data-on={on} aria-hidden="true" />;
}

/** an odometer: each changed character exits upward while the new one enters from below */
function Odo({ text }: { text: string }) {
  const mem = useRef({ cur: text, prev: text });
  if (mem.current.cur !== text) mem.current = { cur: text, prev: mem.current.cur };
  const { prev } = mem.current;
  return (
    <span className="s8d-odo" aria-label={text}>
      {[...text].map((ch, i) => {
        const was = prev[i];
        const moved = was !== undefined && was !== ch;
        return (
          <span key={i} className="s8d-odo__cell" aria-hidden="true">
            {moved && (
              <span key={`o${was}${ch}`} className="s8d-odo__out">
                {was}
              </span>
            )}
            <span key={`i${ch}`} className={moved ? "s8d-odo__in" : undefined}>
              {ch}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** two words in one cell (the wider sets the width): the current one shows */
function Swap({ words, on }: { words: string[]; on: number }) {
  return (
    <span className="s8d-swap">
      {words.map((w, k) => (
        <span key={w} data-on={k === on} aria-hidden={k !== on}>
          {w}
        </span>
      ))}
    </span>
  );
}

/** one caption in a slot that opens when it lands (no empty rows before it) */
function Line({ open, dot = false, kind, aside, children }: { open: boolean; dot?: boolean; kind?: "muted"; aside?: ReactNode; children: ReactNode }) {
  return (
    <li className="s8d-slot" data-open={open}>
      <div className="s8d-slotin">
        <div className={`s8d-line${kind ? ` s8d-line--${kind}` : ""}`}>
          <Dot on={dot} />
          <span className="s8d-text">{children}</span>
          {aside ? <span className="s8d-aside">{aside}</span> : null}
        </div>
      </div>
    </li>
  );
}
const Dash = () => <span className="s8d-dash"> — </span>;

function See({ s, live }: { s: Snap; live: boolean }) {
  return (
    <ul className="s8d-list">
      {/* the head of the list, from p = 0: what is already known; the finds land under it */}
      <Line open kind="muted">{`+${INVENTORY.length} already on record`}</Line>
      {SEE.map((it, j) => (
        <Line
          key={it.name}
          open={s.found[j]}
          dot={live && s.stage === 0 && s.current === j}
          aside={<Swap words={["Flagged", DONE[DECISIONS[FINDS[j].decision]] ?? DECISIONS[FINDS[j].decision]]} on={s.decided[j] ? 1 : 0} />}
        >
          <M ai>{it.name}</M>
          <Dash />
          {it.clause}
        </Line>
      ))}
    </ul>
  );
}

function Secure({ s, live }: { s: Snap; live: boolean }) {
  return (
    <ul className="s8d-list">
      {RUNTIME.map((e, k) => (
        <Line key={e.obj} open={s.handled[k] || s.acting === k} dot={live && s.stage === 1 && s.current === k}>
          <span className="s8d-act">
            <Swap words={[e.doing, e.done]} on={s.handled[k] ? 1 : 0} />
          </span>
          <Dash />
          {SECURE[k]}
        </Line>
      ))}
      <Line open={s.handled[RUNTIME.length - 1]} kind="muted">
        All three on <M ai>{RUNTIME[0].sys}</M>, before it acted
      </Line>
    </ul>
  );
}

/** Govern: ONE quiet tally (the screen holds the rows, the left only counts them): each term
 *  appears as its row is logged, never ahead of it; the dot rides it while rows land and goes
 *  out at the seal. Under a double rule: "Record · N entries" and the record's clock, ticking
 *  with each row, then "Sealed record · 5 entries" landing on 14:32:12 at the press. */
function Govern({ s, live }: { s: Snap; live: boolean }) {
  const n = count(s.written);
  const time = s.sealed ? SEALED.at : LEDGER[Math.max(0, n - 1)].time;
  let shown = 0;
  return (
    <div className="s8d-record">
      <ul className="s8d-list">
        <Line open={n > 0} dot={live && s.stage === 2 && s.current >= 0}>
          <span className="s8d-act">Logged</span>
          <span className="s8d-dash"> · </span>
          {TALLY.map((t) => {
            const k = count(t.rows.map((r) => s.written[r]));
            const lead = k > 0 && shown++ > 0 ? ", " : "";
            return (
              <span key={t.word} className="s8d-term" data-on={k > 0}>
                {lead}
                <Odo text={String(Math.max(1, k))} /> {t.word}
              </span>
            );
          })}
        </Line>
      </ul>
      <div className="s8d-double" aria-hidden="true" />
      <div className="s8d-seal" data-on={n > 0}>
        <span>
          <Swap words={["Record", "Sealed record"]} on={s.sealed ? 1 : 0} /> · <Odo text={String(Math.max(1, n))} /> {n === 1 ? "entry" : "entries"}
        </span>
        <span className="s8d-time">
          <Odo text={time} />
        </span>
      </div>
    </div>
  );
}

function Notes({ s, live, only }: { s: Snap; live: boolean; only?: number }) {
  const layer = (k: number) => ({
    className: "s8d-layer",
    "data-on": s.stage === k,
    "aria-hidden": s.stage !== k,
    hidden: only !== undefined && only !== k,
  });
  return (
    <div className="s8d-notes">
      <div {...layer(0)}>
        <See s={s} live={live} />
      </div>
      <div {...layer(1)}>
        <Secure s={s} live={live} />
      </div>
      <div {...layer(2)}>
        <Govern s={s} live={live} />
      </div>
    </div>
  );
}

export function Left({ snap }: LeftProps) {
  return (
    <>
      <div className="s8d-copy">
        {STAGES.map((st, k) => (
          <div key={st.n} className="s8d-stagecopy" data-on={k === snap.stage} aria-hidden={k !== snap.stage}>
            <h3 className="s8d-title">{st.title}</h3>
            <p className="s8d-body">{st.body}</p>
          </div>
        ))}
      </div>
      <Notes s={snap} live />
    </>
  );
}

export function Still({ snap, stage }: StillProps) {
  return (
    <div className="s8d-still">
      <Notes s={{ ...snap, stage }} live={false} only={stage} />
    </div>
  );
}
