/* Mockup 8 · variant b — "One record, on the left".
 *
 * The left panel is the only place the record lives (the close-up never draws a table: in
 * Govern its finds collapse to lines that run out of the canvas's left edge, toward here, and
 * each lands as a row entering from the right). One panel, one fixed height, three states:
 *   See     "Inventory": five two-line rows; the close-up's finds slide in "Flagged", then
 *           their decision word rolls in. AI names in violet.
 *   Secure  "Runtime": the close-up's three events only, in order; each is dim until the
 *           close-up acts on it, then its word rolls Stripping… → Stripped (house verbs only).
 *   Govern  "Record": typeset on the page (the box goes): a formal title, the entries as they
 *           land, a double rule, and the footer "Sealed 14:32:12 · 5 entries" (then a quiet
 *           "ISO 27001"). The emboss itself lives in the close-up, where the mark makes it.
 * Motion: every change starts ~60 ms after its cause on screen; numbers and words roll like an
 * odometer; a stage swap fades the old state out (140 ms) and wipes the new one in from the
 * stage side 180 ms later. The live dot is the only moving violet, and it goes out at the seal.
 */
import { useState, type ReactNode } from "react";

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
  type Stage,
  type StillProps,
} from "../model";

/** the AI systems (named in violet wherever they appear) */
const AI = [...INVENTORY.map((i) => i.name), ...FINDS.map((f) => f.name)];
/** the close-up's vocabulary: stripped, never "removed" */
const NOTES = RUNTIME.map((e) => e.note.replace(/\bremoved\b/, "stripped"));
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Odometer: when v changes, the old value exits upward while the new one enters from below
 *  (both clipped). The first value just sits. */
function Roll({ v }: { v: string }) {
  const [st, setSt] = useState({ cur: v, prev: "", n: 0 });
  if (st.cur !== v) setSt({ cur: v, prev: st.cur, n: st.n + 1 });
  return (
    <span className="s8b-roll">
      <span key={`i${st.n}`} className="s8b-roll__in" data-anim={st.n > 0}>
        {st.cur}
      </span>
      {st.n > 0 && (
        <span key={`o${st.n}`} className="s8b-roll__out" aria-hidden="true">
          {st.prev}
        </span>
      )}
    </span>
  );
}

/** "3 entries": the number rolls; the noun rolls only when it changes (entry ↔ entries). Nothing at 0. */
function Count({ n, one, many }: { n: number; one: string; many: string }) {
  return (
    <span className="s8b-count">
      <Roll v={n ? String(n) : ""} />
      <Roll v={n ? plural(n, one, many) : ""} />
    </span>
  );
}

/** the live dot: it holds its place (so the word beside it never shifts) and fades when off */
function Live({ on }: { on: boolean }) {
  return <span className="mD-live s8b-live" data-on={on} aria-hidden="true" />;
}

function Head({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="s8b-head">
      <span className="s8b-title">{title}</span>
      {children}
    </div>
  );
}

/** a row: a violet name (or a machine object) over a quiet line; one word at the right */
function Row({ name, obj, sub, subOn = true, word, live, quiet = false }: { name?: string; obj?: string; sub: string; subOn?: boolean; word: string; live: boolean; quiet?: boolean }) {
  return (
    <div className="s8b-row" data-quiet={quiet}>
      <span className="s8b-stack">
        <span className="s8b-l1">
          {name && <span className="s8b-ai">{name}</span>}
          {obj && <span className="s8b-obj">{obj}</span>}
        </span>
        <span className="s8b-sub" data-on={subOn}>
          {sub}
        </span>
      </span>
      <span className="s8b-end">
        <Live on={live} />
        <span className="s8b-word">
          <Roll v={word} />
        </span>
      </span>
    </div>
  );
}

/* ---------------- the three states ---------------- */
function See({ s }: { s: Snap }) {
  return (
    <>
      <Head title="Inventory">
        <Count n={INVENTORY.length + count(s.found)} one="system" many="systems" />
      </Head>
      <div className="s8b-list">
        {INVENTORY.map((it) => (
          <Row key={it.name} name={it.name} sub={it.where} word={DECISIONS[it.decision]} live={false} />
        ))}
        {FINDS.map((it, j) => (
          <div key={it.name} className="s8b-slot" data-open={s.found[j]}>
            <div className="s8b-slotin">
              <Row name={it.name} sub={it.where} word={s.decided[j] ? DECISIONS[it.decision] : "Flagged"} live={s.stage === 0 && s.current === j} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Secure({ s }: { s: Snap }) {
  return (
    <>
      <Head title="Runtime">
        <Count n={count(s.handled)} one={`of ${RUNTIME.length}`} many={`of ${RUNTIME.length}`} />
      </Head>
      {/* the close-up's three events only: each dim (no word) until the close-up acts on it */}
      <div className="s8b-list s8b-list--events">
        {RUNTIME.map((e, k) => {
          const done = s.handled[k];
          return (
            <Row
              key={e.obj}
              name={e.sys}
              obj={e.obj}
              sub={NOTES[k]}
              subOn={done}
              word={done ? e.done : s.acting === k ? `${e.doing}…` : ""}
              live={s.stage === 1 && s.current === k}
              quiet={!done && s.acting !== k}
            />
          );
        })}
      </div>
    </>
  );
}

/** a subject whose leading AI name (if any) is violet */
function Subject({ text }: { text: string }) {
  const ai = AI.find((n) => text.startsWith(n));
  if (!ai) return <span className="s8b-subj">{text}</span>;
  return (
    <span className="s8b-subj">
      <span className="s8b-ai">{ai}</span>
      <span className="s8b-soft">{text.slice(ai.length)}</span>
    </span>
  );
}

function Govern({ s }: { s: Snap }) {
  return (
    <>
      <Head title="Record">
        <Count n={count(s.written)} one="entry" many="entries" />
      </Head>
      <div className="s8b-ledger">
        {LEDGER.map((r, k) => (
          <div key={r.id} className="s8b-lrow" data-on={s.written[k]}>
            <Subject text={r.subject} />
            <span className="s8b-verdict">
              <Live on={s.stage === 2 && s.current === k && !s.sealed} />
              {r.verdict}
            </span>
          </div>
        ))}
      </div>
      <div className="s8b-close">
        <div className="s8b-rule" data-on={s.sealed} aria-hidden="true" />
        <div className="s8b-foot" data-on={s.sealed}>
          <span>
            Sealed {SEALED.at} · {LEDGER.length} {plural(LEDGER.length, "entry", "entries")}
            <span className="s8b-iso" data-on={s.evidence}>
              {" "}
              · ISO 27001
            </span>
          </span>
        </div>
      </div>
    </>
  );
}

const STATES = [See, Secure, Govern];

function Panel({ s, stage, live }: { s: Snap; stage: Stage; live: boolean }) {
  return (
    <div className={`mD-seq__panel s8b-panel${live ? " s8b-panel--live" : ""}`} data-stage={stage}>
      <div className="s8b-layers">
        {STATES.map((State, k) => (
          <div key={k} className="s8b-layer" data-state={k} data-on={stage === k} aria-hidden={stage !== k} hidden={!live && stage !== k}>
            <State s={s} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Left({ snap }: LeftProps) {
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
      <Panel s={snap} stage={snap.stage} live />
    </>
  );
}

export function Still({ snap, stage }: StillProps) {
  return <Panel s={snap} stage={stage} live={false} />;
}
