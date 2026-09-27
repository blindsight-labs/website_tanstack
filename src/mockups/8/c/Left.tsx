/* Mockup 8 · variant c — "One thing at a time". The left column (round 2).
 *
 * Under the stage copy sits ONE focus card: the event the close-up is showing right now (the
 * AI system in violet, one human sentence in the right tense, the verdict, its time). It
 * cross-fades to the next event just after the close-up shows it (cause, then effect: +60 ms)
 * and holds the last one in between. Under it, the only history: in See the inventory growing
 * (three on record, muted; each find appended in violet as it is flagged), in Secure and
 * Govern a hairline of ticks. In Govern the card becomes the record: a paper card, formal
 * through type (a double rule, the count, one ticking timestamp), sealed with a blind emboss
 * of the mark in the same frame as the close-up's.
 *
 * Every slide is always mounted, stacked in one grid cell: the card never changes size.
 */
import { useRef, type ReactNode } from "react";

import {
  DECISIONS,
  FINDS,
  INVENTORY,
  LEDGER,
  RUNTIME,
  SEALED,
  STAGES,
  count,
  type LeftProps,
  type Snap,
  type StillProps,
} from "../model";

/** machine data inside a human sentence */
const M = ({ children }: { children: ReactNode }) => <span className="s8c-m">{children}</span>;

/** odometer: each changed character leaves upward while the new one arrives from below */
function Roll({ ch }: { ch: string }) {
  const r = useRef({ cur: ch, old: "", n: 0 });
  if (r.current.cur !== ch) r.current = { cur: ch, old: r.current.cur, n: r.current.n + 1 };
  const { old, n } = r.current;
  return (
    <span className="s8c-roll">
      {n > 0 ? (
        <span key={`o${n}`} className="s8c-roll__out" aria-hidden="true">
          {old}
        </span>
      ) : null}
      <span key={`i${n}`} className={n > 0 ? "s8c-roll__in" : undefined}>
        {ch}
      </span>
    </span>
  );
}
function Odo({ text }: { text: string }) {
  return (
    <span className="s8c-odo" aria-label={text}>
      {text.split("").map((c, k) => (
        <Roll key={k} ch={c} />
      ))}
    </span>
  );
}

/** the mark's silhouette (orbit radius 1): hub, three arms and nodes, the broken orbit */
const NODE_A = [0, 128, 232].map((d) => (d * Math.PI) / 180);
const ARCS = NODE_A.map((a, i) => {
  const [a0, a1] = [a + (20 * Math.PI) / 180, (NODE_A[i + 1] ?? 2 * Math.PI) - (20 * Math.PI) / 180];
  const f = (x: number) => x.toFixed(3);
  return `M${f(Math.cos(a0))} ${f(-Math.sin(a0))}A1 1 0 0 0 ${f(Math.cos(a1))} ${f(-Math.sin(a1))}`;
});
function Glyph({ cls, d }: { cls: string; d: number }) {
  return (
    <g className={cls} transform={`translate(${d} ${d})`}>
      <circle r="0.5" />
      {NODE_A.map((a) => (
        <g key={a}>
          <line x1="0" y1="0" x2={Math.cos(a)} y2={-Math.sin(a)} strokeWidth="0.17" />
          <circle cx={Math.cos(a)} cy={-Math.sin(a)} r="0.25" />
        </g>
      ))}
      {ARCS.map((p) => (
        <path key={p} d={p} fill="none" strokeWidth="0.22" strokeLinecap="round" />
      ))}
    </g>
  );
}
/** the blind emboss: colourless, the silhouette twice (1 px highlight up-left, 1 px shadow
 *  down-right) under the paper-coloured face */
function Emboss({ on }: { on: boolean }) {
  const px = (1.5 * 2.64) / 30; // 1.5 css px in viewBox units (the glyph is 30 px): it reads as the mark
  return (
    <svg className="s8c-emboss" data-on={on} viewBox="-1.32 -1.32 2.64 2.64" aria-hidden="true">
      <Glyph cls="s8c-emboss__hi" d={-px} />
      <Glyph cls="s8c-emboss__lo" d={px} />
      <Glyph cls="s8c-emboss__face" d={0} />
    </svg>
  );
}

function Sys({ name, where }: { name: string; where?: string }) {
  return (
    <span className="s8c-sys">
      <span className="s8c-ai">{name}</span>
      {where ? <span className="s8c-where"> · {where}</span> : null}
    </span>
  );
}

type Ev = { key: string; kind: string; sys: ReactNode; line: ReactNode; doing?: ReactNode; time: string };

/** the slides, in story order: idle, the two finds (See), the three actions (Secure) */
const EVENTS: Ev[] = [
  {
    key: "idle",
    kind: "",
    sys: <span className="s8c-sys s8c-where">ws-fin-01 · m.keller</span>,
    line: <>Watching this workstation for any AI in use, approved or not.</>,
    time: "",
  },
  {
    key: "see-0",
    kind: "New · shadow AI",
    sys: <Sys name={FINDS[0].name} where="personal account" />,
    line: (
      <>
        <M>m.keller</M> is using a personal ChatGPT account on a finance workstation.
      </>
    ),
    time: LEDGER[0].time,
  },
  {
    key: "see-1",
    kind: "New · agent",
    sys: <Sys name={FINDS[1].name} where={FINDS[1].where} />,
    line: (
      <>
        An autonomous agent is reading <M>invoice_0412.pdf</M> and planning to act on its notes.
      </>
    ),
    time: LEDGER[1].time,
  },
  {
    key: "sec-0",
    kind: "Injection",
    sys: <Sys name={RUNTIME[0].sys} />,
    doing: (
      <>
        Stripping a hidden instruction from <M>invoice_0412.pdf</M> before the agent acts on it.
      </>
    ),
    line: (
      <>
        Hidden instruction stripped from <M>invoice_0412.pdf</M> before the agent acted on it.
      </>
    ),
    time: LEDGER[2].time,
  },
  {
    key: "sec-1",
    kind: "Private data",
    sys: <Sys name={RUNTIME[1].sys} />,
    doing: <>Masking Lena Brandt’s email and IBAN before the agent can use them.</>,
    line: (
      <>
        Lena Brandt’s email and IBAN masked as <M>user_7f3a</M> and <M>[masked]</M> before the agent could use them.
      </>
    ),
    time: LEDGER[3].time,
  },
  {
    key: "sec-2",
    kind: "Tool call",
    sys: <Sys name={RUNTIME[2].sys} />,
    doing: (
      <>
        Blocking <M>send_email</M> to <M>ext-sync.io</M> as the agent clicks Send.
      </>
    ),
    line: (
      <>
        <M>send_email</M> to <M>ext-sync.io</M> blocked at the click, before anything left.
      </>
    ),
    time: LEDGER[4].time,
  },
];
const RECORD = EVENTS.length; // the last slide: Govern's record

/** which slide the close-up is showing (the last event that has happened; held in between) */
function shownOf(s: Snap): number {
  if (s.stage === 2) return RECORD;
  let k = -1;
  RUNTIME.forEach((_, i) => {
    if (s.handled[i] || s.acting === i) k = i;
  });
  if (s.stage === 1 && k >= 0) return 3 + k;
  let j = -1;
  s.found.forEach((f, i) => {
    if (f) j = i;
  });
  return j >= 0 ? 1 + j : 0;
}

/** has slide i's event finished (past-tense sentence), or is it still being acted on */
const doneOf = (i: number, s: Snap) => (i < 3 ? true : s.handled[i - 3]);

function Verdict({ i, s }: { i: number; s: Snap }) {
  if (i === 0) return <span className="s8c-verdict" data-state="idle">Nothing flagged yet</span>;
  if (i <= 2) {
    const j = i - 1;
    const live = s.stage === 0 && s.current === j;
    return (
      <span className="s8c-verdict" data-state={live ? "live" : "done"}>
        {live ? <span className="mD-live" aria-hidden="true" /> : <span className="mD-hex" aria-hidden="true" />}
        Flagged
        <span className="s8c-decision" data-on={s.decided[j]}>
          → {DECISIONS[FINDS[j].decision]}
        </span>
      </span>
    );
  }
  const k = i - 3;
  const done = s.handled[k];
  const live = !done || (s.stage === 1 && s.current === k);
  return (
    <span className="s8c-verdict" data-state={live ? "live" : "done"}>
      {live ? <span className="mD-live" aria-hidden="true" /> : <span className="mD-hex" aria-hidden="true" />}
      <span className="s8c-stack">
        <span data-on={!done}>{RUNTIME[k].doing}…</span>
        <span data-on={done}>{RUNTIME[k].done}</span>
      </span>
    </span>
  );
}

function Record({ s }: { s: Snap }) {
  const n = count(s.written);
  const writing = s.stage === 2 && s.current >= 0 && !s.sealed;
  const time = s.sealed ? SEALED.at : n ? LEDGER[n - 1].time : LEDGER[0].time;
  return (
    <>
      <div className="s8c-top">
        <span className="s8c-kind s8c-kind--record">Audit record</span>
        <span className="s8c-where s8c-small">ws-fin-01</span>
      </div>
      <div className="s8c-rule" aria-hidden="true" />
      <div className="s8c-stack s8c-head">
        <p data-on={n === 0}>Logging…</p>
        <p data-on={n > 0}>
          <Odo text={String(n)} />
          <span>{n === 1 ? "entry" : "entries"} logged</span>
          <span className="mD-live s8c-dot" data-on={writing} aria-hidden="true" />
        </p>
      </div>
      <div className="s8c-seal" data-on={n > 0}>
        <Emboss on={s.sealed} />
        <span className="s8c-stack s8c-sealword">
          <span data-on={!s.sealed}>Logged</span>
          <span data-on={s.sealed}>Sealed</span>
        </span>
        <span className="s8c-time">
          <Odo text={time} />
        </span>
      </div>
    </>
  );
}

function Card({ s, only = false }: { s: Snap; only?: boolean }) {
  const shown = shownOf(s);
  return (
    <div className="s8c-card" data-record={shown === RECORD}>
      {EVENTS.map((e, i) => {
        if (only && i !== shown) return null;
        const done = doneOf(i, s);
        return (
          <div key={e.key} className="s8c-slide" data-on={i === shown} aria-hidden={i !== shown}>
            <div className="s8c-top">
              {e.sys}
              {e.kind ? <span className="s8c-kind">{e.kind}</span> : null}
            </div>
            <div className="s8c-stack s8c-line">
              {e.doing ? <p data-on={!done}>{e.doing}</p> : null}
              <p data-on={done}>{e.line}</p>
            </div>
            <div className="s8c-foot">
              <Verdict i={i} s={s} />
              <span className="s8c-small">{e.time}</span>
            </div>
          </div>
        );
      })}
      {only && shown !== RECORD ? null : (
        <div className="s8c-slide s8c-slide--record" data-on={shown === RECORD} aria-hidden={shown !== RECORD}>
          <Record s={s} />
        </div>
      )}
    </div>
  );
}

type Tick = "todo" | "live" | "done";

/** the only history, on the display's bottom line. See: the inventory growing. Secure: what was
 *  done to agent:finance, a house verb at a time (no ticks in either: they would repeat it).
 *  Govern: a hairline of ticks, one per entry, filled as they are logged. */
function History({ s }: { s: Snap }) {
  let ticks: Tick[] = [];
  let text: ReactNode = null;
  if (s.stage === 1) {
    text = (
      <span className="s8c-names">
        <span className="s8c-name s8c-ai">{RUNTIME[0].sys}</span>
        {RUNTIME.map((e, k) => (
          <span key={e.done} className="s8c-name s8c-name--verb" data-on={s.handled[k]}>
            {e.done.toLowerCase()}
          </span>
        ))}
      </span>
    );
  } else if (s.stage === 0) {
    text = (
      <span className="s8c-names">
        {INVENTORY.map((it) => (
          <span key={it.name} className="s8c-name">
            {it.name}
          </span>
        ))}
        {FINDS.map((f, j) => (
          <span key={f.name} className="s8c-name s8c-name--new" data-on={s.found[j]}>
            {f.name}
          </span>
        ))}
      </span>
    );
  } else {
    ticks = LEDGER.map((_, k) => (s.written[k] ? "done" : "todo"));
  }
  return (
    <div className="s8c-hist" data-stage={s.stage}>
      <div className="s8c-htext">{text}</div>
      <span className="s8c-ticks" aria-hidden="true">
        {ticks.length ? ticks.map((t, k) => <span key={`${s.stage}-${k}`} className="s8c-tick" data-state={t} />) : <span className="s8c-tick" data-state="todo" />}
      </span>
    </div>
  );
}

export function Left({ snap, theme }: LeftProps) {
  return (
    <>
      <div className="mD-seq__copy">
        {STAGES.map((st, k) => (
          <div key={st.n} className="mD-seq__stagecopy" data-on={k === snap.stage}>
            <h3 className="mD-h3">{st.title}</h3>
            <p>{st.body}</p>
          </div>
        ))}
      </div>
      {/* the card sits right under the copy; only the history strip keeps the display's bottom line */}
      <div className="s8c-focus" data-theme={theme}>
        <Card s={snap} />
      </div>
      <div className="s8c-strip">
        <History s={snap} />
      </div>
    </>
  );
}

export function Still({ snap, theme }: StillProps) {
  return (
    <div className="s8c-focus s8c-focus--still" data-theme={theme}>
      <Card s={snap} only />
      <History s={snap} />
    </div>
  );
}
