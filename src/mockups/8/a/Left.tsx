/* Mockup 8 · variant a — "The receipt" (round 3).
 *
 * The close-up carries the detail; the left is a calm receipt of what it just proved.
 * Under the owner's copy, ONE block per stage (they crossfade), set on the display's bottom
 * line: a figure, a hairline, then the stage's ruled rows (the lines are always there; each
 * row's content lands on its line). The figure counts only what the close-up has shown, and rolls (odometer) only
 * when its cause lands:
 *   See     the inventory: 3 AI systems on record → 4 · 1 new → 5 · 2 new;
 *   Secure  the actions on agent:finance: no number until the first ("1 action", …, "3 actions");
 *   Govern  the entries written: "1 entry logged" … "5 entries logged" → "5 entries, sealed".
 * Rows land ~60 ms after their cause. Sans for sentences, mono only for machine names, violet
 * for AI system names and the one live dot (Snap.current; it goes out at the seal). The dot
 * hangs in the margin, so the rows' first words align with the numeral and the copy. Every
 * row slot is always laid out: the column never changes height.
 */
import { Fragment, useRef, type ReactNode } from "react";

import { DECISIONS, FINDS, INVENTORY, LEDGER, RUNTIME, SEALED, STAGES, count, type LeftProps, type Snap, type StillProps } from "../model";

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** the current value and the one it replaced, keyed by a string; n counts the changes */
type Trail<T> = { key: string; v: T; prev: { key: string; v: T } | null; n: number };
function useTrail<T>(key: string, v: T): Trail<T> {
  const r = useRef<Trail<T>>({ key, v, prev: null, n: 0 });
  if (r.current.key !== key) r.current = { key, v, prev: { key: r.current.key, v: r.current.v }, n: r.current.n + 1 };
  else r.current.v = v;
  return r.current;
}

/** odometer: the old value exits upward while the new one enters from below, both clipped */
function Odo({ v, className = "" }: { v: string; className?: string }) {
  const tr = useTrail(v, v);
  return (
    <span className={`s8a-odo ${className}`}>
      {tr.prev && (
        <span key={`p${tr.n}`} className="s8a-odo__out" aria-hidden="true">
          {tr.prev.v}
        </span>
      )}
      <span key={`c${tr.n}`} className="s8a-odo__in" data-first={tr.n === 0}>
        {v}
      </span>
    </span>
  );
}

/** crossfade: the old content fades out in place while the new one fades in */
function Swap({ k, children, className = "" }: { k: string; children: ReactNode; className?: string }) {
  const tr = useTrail<ReactNode>(k, children);
  return (
    <span className={`s8a-swap ${className}`}>
      {tr.prev && (
        <span key={`p${tr.n}`} className="s8a-swap__out" aria-hidden="true">
          {tr.prev.v}
        </span>
      )}
      <span key={`c${tr.n}`} className="s8a-swap__in" data-first={tr.n === 0}>
        {children}
      </span>
    </span>
  );
}

/** a machine name (mono); `ai` names an AI system (violet) */
function M({ children, ai = false }: { children: ReactNode; ai?: boolean }) {
  return <span className={ai ? "s8a-m s8a-ai" : "s8a-m"}>{children}</span>;
}

/** the stage's figure: a number (none until there is one) and its unit */
function Figure({ n, unitKey, unit }: { n: number; unitKey: string; unit: ReactNode }) {
  return (
    <div className="s8a-fig" data-empty={n === 0}>
      <Odo v={n ? String(n) : ""} className="s8a-num" />
      <Swap k={unitKey} className="s8a-unit">
        {unit}
      </Swap>
    </div>
  );
}

type RowProps = { on: boolean; live?: boolean; kind?: "sys" | "act"; slide?: boolean; children: ReactNode };
function Row({ on, live = false, kind = "act", slide = false, children }: RowProps) {
  return (
    <li className={`s8a-row s8a-row--${kind}`} data-on={on} data-slide={slide} aria-hidden={!on}>
      <span className="s8a-dot" data-on={live} aria-hidden="true">
        <span className="mD-live" />
      </span>
      {children}
    </li>
  );
}

/* ---------------- See: the inventory; every AI name in violet; finds slide in as flagged ---------------- */
const WHERE_REC: ReactNode[] = [<M key="a">ws-sal-01</M>, <M key="b">ws-sup-01</M>, "automations"];
const WHERE_FIND: ReactNode[] = [
  <Fragment key="a">
    personal, <M>ws-fin-01</M>
  </Fragment>,
  <M key="b">ws-fin-01</M>,
];

function See({ s }: { s: Snap }) {
  const found = count(s.found);
  return (
    <>
      <Figure n={INVENTORY.length + found} unitKey={`see${found}`} unit={found ? `AI systems · ${found} new` : "AI systems on record"} />
      <ul className="s8a-rows">
        {INVENTORY.map((it, k) => (
          <Row key={it.name} on kind="sys">
            <span className="s8a-sys">
              <M ai>{it.name}</M> <span className="s8a-where">{WHERE_REC[k]}</span>
            </span>
            <span className="s8a-end s8a-end--rec">{DECISIONS[it.decision]}</span>
          </Row>
        ))}
        {FINDS.map((f, j) => (
          <Row key={f.name} on={s.found[j]} live={s.stage === 0 && s.current === j} kind="sys" slide>
            <span className="s8a-sys">
              <M ai>{f.name}</M> <span className="s8a-where">{WHERE_FIND[j]}</span>
            </span>
            {/* "Flagged" first; the decision lands after it */}
            <Odo v={s.decided[j] ? DECISIONS[f.decision] : "Flagged"} className="s8a-end" />
          </Row>
        ))}
      </ul>
    </>
  );
}

/* ---------------- Secure: verdict word + object, as the close-up acts ---------------- */
const OBJ: ReactNode[] = [
  <Fragment key="a">
    injected instruction <span className="s8a-where">in</span> <M>invoice_0412.pdf</M>
  </Fragment>,
  <Fragment key="b">
    <M>lena.brandt@… → user_7f3a</M> <span className="s8a-where">and the IBAN</span>
  </Fragment>,
  <Fragment key="c">
    <M>send_email → ext-sync.io</M> <span className="s8a-where">at the click</span>
  </Fragment>,
];

function Secure({ s }: { s: Snap }) {
  const n = count(s.handled);
  return (
    <>
      <Figure
        n={n}
        unitKey={n === 0 ? "watch" : n === 1 ? "one" : "many"}
        unit={
          <>
            {n ? `${plural(n, "action", "actions")} on ` : "Watching "}
            <M ai>agent:finance</M>
          </>
        }
      />
      <ul className="s8a-rows">
        {RUNTIME.map((e, k) => {
          const done = s.handled[k];
          return (
            <Row key={e.obj} on={done || s.acting === k} live={s.stage === 1 && s.current === k}>
              <Odo v={done ? e.done : `${e.doing}…`} className={done ? "s8a-verb" : "s8a-verb s8a-verb--doing"} />
              <span className="s8a-obj">{OBJ[k]}</span>
            </Row>
          );
        })}
      </ul>
    </>
  );
}

/* ---------------- Govern: the finds become a sealed record ---------------- */
/** "2 flagged · 1 stripped · …": the verdicts written so far, in the order they landed */
function tally(written: boolean[]) {
  const seen = new Map<string, number>();
  LEDGER.forEach((r, k) => {
    if (written[k]) seen.set(r.verdict, (seen.get(r.verdict) ?? 0) + 1);
  });
  return [...seen].map(([v, c]) => `${c} ${v}`).join(" · ");
}

function Govern({ s }: { s: Snap }) {
  const n = count(s.written);
  // one time, ticking with each entry written, landing on the seal's time as the mark presses
  const time = s.sealed ? SEALED.at : LEDGER[Math.max(0, n - 1)].time;
  const unit = !n ? "Logging the record" : s.sealed ? "entries, sealed" : `${plural(n, "entry", "entries")} logged`;
  return (
    <>
      <Figure n={n} unitKey={s.sealed ? "sealed" : `gov${n === 1 ? 1 : n ? 2 : 0}`} unit={unit} />
      <ul className="s8a-rows">
        {/* one row: the time ticks with each entry, then seals; the verdicts fold under it */}
        <Row on={n > 0} live={s.stage === 2 && s.current >= 0}>
          <Odo v={s.sealed ? "Sealed" : "Logged"} className="s8a-verb" />
          <span className="s8a-obj">
            <Odo v={time} className="s8a-m s8a-time" />
            <span className="s8a-tally">{tally(s.written) || " "}</span>
          </span>
        </Row>
      </ul>
    </>
  );
}

const LAYERS = [See, Secure, Govern];

function Receipt({ s, only }: { s: Snap; only?: 0 | 1 | 2 }) {
  return (
    <div className={`s8a-receipt${only === undefined ? "" : " s8a-receipt--still"}`}>
      {LAYERS.map((L, k) =>
        only !== undefined && only !== k ? null : (
          <div key={k} className="s8a-layer" data-on={only !== undefined || s.stage === k} aria-hidden={only === undefined && s.stage !== k}>
            <L s={s} />
          </div>
        ),
      )}
    </div>
  );
}

export function Left({ snap }: LeftProps) {
  return (
    <>
      <div className="mD-seq__copy s8a-copy">
        {STAGES.map((st, k) => (
          <div key={st.n} className="mD-seq__stagecopy" data-on={k === snap.stage}>
            <h3 className="mD-h3">{st.title}</h3>
            <p>{st.body}</p>
          </div>
        ))}
      </div>
      <Receipt s={snap} />
    </>
  );
}

/** phone / reduced motion: the stage's settled receipt (no live dot: nothing is happening) */
export function Still({ snap, stage }: StillProps) {
  return <Receipt s={{ ...snap, current: -1 }} only={stage} />;
}
