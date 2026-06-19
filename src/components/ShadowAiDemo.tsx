import { useEffect, useRef } from "react";
import { Cloud, TriangleAlert } from "lucide-react";

/* Self-serve "do you have Shadow AI?" hero animation. Ported from the two
 * standalone designs (horizontal + vertical). Both orientations are rendered;
 * CSS shows the right one at the SAME 640px breakpoint where the iceberg
 * section flips its aspect ratio, so the two switch orientation in sync.
 *
 * This is illustrative content, so it keeps its own traffic-light palette
 * (indigo / red / green / purple) rather than the violet UI accent — same
 * exception the in-action demo uses. */

type Item = { t: string; k: "sensitive" | "benign" | "inject" | "export"; red?: string };
type Lane = { ini: string; nm: string; rl: string; x?: number; y?: number; seq: Item[] };

const LANES_H: Lane[] = [
  {
    ini: "MS",
    nm: "Marta",
    rl: "Finance",
    y: 14,
    seq: [
      { t: "IBAN · CH93 0076 2011", k: "sensitive", red: "IBAN · ████████" },
      { t: "task · format invoice", k: "benign" },
    ],
  },
  {
    ini: "PA",
    nm: "Pedro",
    rl: "Support",
    y: 38,
    seq: [
      { t: "SSN · 078-05-1120", k: "sensitive", red: "SSN · ███████" },
      { t: "task · draft reply", k: "benign" },
    ],
  },
  {
    ini: "SB",
    nm: "Sofia",
    rl: "ML team",
    y: 62,
    seq: [
      { t: 'inject · "ignore rules"', k: "inject" },
      { t: "task · label batch", k: "benign" },
    ],
  },
  {
    ini: "AC",
    nm: "Ana",
    rl: "Sales",
    y: 86,
    seq: [
      { t: "export · client_db.csv", k: "export" },
      { t: "client · Marta Silva", k: "sensitive", red: "client · ████████" },
    ],
  },
];

const LANES_V: Lane[] = [
  {
    ini: "MS",
    nm: "Marta",
    rl: "Finance",
    x: 12.5,
    seq: [
      { t: "IBAN", k: "sensitive", red: "IBAN ████" },
      { t: "task", k: "benign" },
    ],
  },
  {
    ini: "PA",
    nm: "Pedro",
    rl: "Support",
    x: 37.5,
    seq: [
      { t: "SSN", k: "sensitive", red: "SSN ███" },
      { t: "reply", k: "benign" },
    ],
  },
  {
    ini: "SB",
    nm: "Sofia",
    rl: "ML team",
    x: 62.5,
    seq: [
      { t: "inject", k: "inject" },
      { t: "label", k: "benign" },
    ],
  },
  {
    ini: "AC",
    nm: "Ana",
    rl: "Sales",
    x: 87.5,
    seq: [
      { t: "export", k: "export" },
      { t: "client", k: "sensitive", red: "client ███" },
    ],
  },
];

const svgIcon = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

const IC = {
  alert: svgIcon(
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  ),
  check: svgIcon('<path d="M20 6 9 17l-5-5"/>'),
  lock: svgIcon(
    '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  ),
  ban: svgIcon('<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>'),
};

const SUB_ON =
  "One runtime proxy guards everyone. Sensitive data is redacted, attacks are blocked — and you see all of it.";
const SUB_OFF =
  "Your team is sending requests to a third-party AI. Watch what gets through — then flip Blindsight on.";

/** Playback speed for the whole animation. 1 = original; 0.5 = half speed.
 *  Every duration (timers, packet-travel transitions, spawn cadence, fades)
 *  is divided by this, so packets, pacing and auto-toggle all scale together. */
const SPEED = 0.5;
const d = (ms: number) => Math.round(ms / SPEED);

type EngineConfig = {
  axis: "left" | "top";
  pos: { proxy: string; end: string };
  lanes: Lane[];
  start: (p: HTMLElement, L: Lane) => void;
  buildLane: (L: Lane, arena: HTMLElement, sources: HTMLElement | null) => void;
};

/** Wire up one orientation's animation on its root element. Returns a cleanup. */
function startEngine(root: HTMLElement, cfg: EngineConfig): () => void {
  const arena = root.querySelector<HTMLElement>(".arena");
  const ai = root.querySelector<HTMLElement>(".aiwall");
  const sw = root.querySelector<HTMLElement>(".sw");
  const badge = root.querySelector<HTMLElement>(".sa-badge");
  const ptag = root.querySelector<HTMLElement>(".ptag");
  const sub = root.querySelector<HTMLElement>(".sa-sub");
  const sources = root.querySelector<HTMLElement>(".sources");
  if (!arena || !ai || !sw || !badge || !ptag || !sub) return () => {};

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const n = { lk: 0, al: 0, rd: 0, bl: 0 };
  const st = { mode: "off", touched: false };
  const timers: number[] = [];
  const created: HTMLElement[] = [];

  const T = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, d(ms));
    timers.push(id);
    return id;
  };
  const setN = (cls: string, key: keyof typeof n) => {
    const e = root.querySelector(cls);
    if (e) e.textContent = String(n[key]);
  };
  const sleep = (ms: number) => new Promise<void>((r) => T(() => r(), ms));

  cfg.lanes.forEach((L) => cfg.buildLane(L, arena, sources));
  root.querySelectorAll<HTMLElement>(".lane-wire,.person,.src").forEach((e) => created.push(e));

  function setChip(p: HTMLElement, cls: string, icon: string, text: string) {
    const c = p.firstChild as HTMLElement;
    c.className = "chip " + cls;
    c.innerHTML = (icon || '<span class="dot"></span>') + text;
  }
  function move(p: HTMLElement, to: string, ms: number) {
    p.style.transition = cfg.axis + " " + d(ms) + "ms linear";
    void p.offsetWidth;
    p.style.setProperty(cfg.axis, to);
  }
  function aiHit() {
    ai!.classList.add("hit");
    T(() => ai!.classList.remove("hit"), 420);
  }

  async function fly(L: Lane, item: Item) {
    const p = document.createElement("div");
    p.className = "pkt";
    cfg.start(p, L);
    const risky = item.k !== "benign";
    p.innerHTML =
      '<span class="chip ' +
      (risky ? "" : "benign") +
      '"><span class="dot"></span>' +
      item.t +
      "</span>";
    arena!.appendChild(p);
    created.push(p);
    void p.offsetWidth;
    move(p, cfg.pos.proxy, 1500);
    await sleep(1500);
    if (st.mode === "on") {
      if (item.k === "benign") {
        setChip(p, "allow", IC.check, "Allowed");
        move(p, cfg.pos.end, 1300);
        await sleep(1300);
        n.al++;
        setN(".c-al", "al");
        p.remove();
        return;
      }
      setChip(p, "alert", IC.alert, "Detected");
      await sleep(420);
      if (item.k === "sensitive") {
        setChip(p, "redact", IC.lock, item.red!);
        move(p, cfg.pos.end, 1300);
        await sleep(1300);
        n.rd++;
        setN(".c-rd", "rd");
        p.remove();
      } else {
        setChip(p, "block", IC.ban, "Blocked");
        await sleep(720);
        p.style.transition = "opacity " + d(350) + "ms";
        p.style.opacity = "0";
        await sleep(360);
        n.bl++;
        setN(".c-bl", "bl");
        p.remove();
      }
    } else {
      move(p, cfg.pos.end, 1300);
      await sleep(1300);
      if (item.k === "benign") {
        n.al++;
        setN(".c-al", "al");
        p.remove();
        return;
      }
      setChip(p, "leak", IC.alert, item.k === "inject" ? "Hijacked" : "Leaked");
      aiHit();
      await sleep(560);
      n.lk++;
      setN(".c-lk", "lk");
      p.remove();
    }
  }

  cfg.lanes.forEach((L, i) => {
    let idx = 0;
    T(
      () => {
        fly(L, L.seq[idx % L.seq.length]);
        idx++;
        const iv = window.setInterval(() => {
          fly(L, L.seq[idx % L.seq.length]);
          idx++;
        }, d(3300));
        timers.push(iv);
      },
      500 + i * 820,
    );
  });

  function setMode(m: string) {
    st.mode = m;
    root.classList.toggle("on", m === "on");
    root.classList.toggle("off", m !== "on");
    n.lk = n.al = n.rd = n.bl = 0;
    setN(".c-lk", "lk");
    setN(".c-al", "al");
    setN(".c-rd", "rd");
    setN(".c-bl", "bl");
    sw!.setAttribute("aria-pressed", String(m === "on"));
    badge!.textContent = m === "on" ? "Protected" : "Unprotected";
    ptag!.textContent = m === "on" ? "blindsight · active" : "proxy · offline";
    sub!.textContent = m === "on" ? SUB_ON : SUB_OFF;
  }
  const onClick = () => {
    st.touched = true;
    setMode(st.mode === "on" ? "off" : "on");
  };
  sw.addEventListener("click", onClick);

  if (!reduce) {
    const tick = () => {
      if (!st.touched) {
        setMode(st.mode === "on" ? "off" : "on");
        T(tick, 6500);
      }
    };
    T(tick, 6500);
  }

  return () => {
    timers.forEach((id) => {
      clearTimeout(id);
      clearInterval(id);
    });
    sw.removeEventListener("click", onClick);
    created.forEach((e) => e.remove());
    if (sources) sources.innerHTML = "";
    root.classList.remove("on");
    root.classList.add("off");
  };
}

export function ShadowAiDemo() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = ref.current;
    if (!wrap) return;
    const cleanups: Array<() => void> = [];

    const h = wrap.querySelector<HTMLElement>(".sa2");
    if (h) {
      cleanups.push(
        startEngine(h, {
          axis: "left",
          pos: { proxy: "50%", end: "84%" },
          lanes: LANES_H,
          start: (p, L) => {
            p.style.top = L.y + "%";
            p.style.left = "15.5%";
          },
          buildLane: (L, arena) => {
            const w = document.createElement("div");
            w.className = "lane-wire";
            w.style.top = L.y + "%";
            arena.appendChild(w);
            const person = document.createElement("div");
            person.className = "person";
            person.style.top = L.y + "%";
            person.innerHTML =
              '<span class="ava">' +
              L.ini +
              '</span><span class="pm"><span class="nm">' +
              L.nm +
              '</span><span class="rl">' +
              L.rl +
              "</span></span>";
            arena.appendChild(person);
          },
        }),
      );
    }

    const v = wrap.querySelector<HTMLElement>(".sa3");
    if (v) {
      cleanups.push(
        startEngine(v, {
          axis: "top",
          pos: { proxy: "47%", end: "78%" },
          lanes: LANES_V,
          start: (p, L) => {
            p.style.left = L.x + "%";
            p.style.top = "2%";
          },
          buildLane: (L, arena, sources) => {
            if (sources) {
              const s = document.createElement("div");
              s.className = "src";
              s.innerHTML =
                '<span class="ava">' +
                L.ini +
                '</span><span class="nm">' +
                L.nm +
                '</span><span class="rl">' +
                L.rl +
                "</span>";
              sources.appendChild(s);
            }
            const w = document.createElement("div");
            w.className = "lane-wire";
            w.style.left = L.x + "%";
            w.style.bottom = "56px";
            arena.appendChild(w);
          },
        }),
      );
    }

    return () => cleanups.forEach((c) => c());
  }, []);

  return (
    <div className="shadow-demo" ref={ref}>
      {/* Horizontal — default, shown above the 640px breakpoint */}
      <section
        className="sa2 off"
        aria-label="Shadow AI runtime protection — interactive demonstration"
      >
        <h2 className="sr-only">
          Four employees send requests to a third-party AI. With Blindsight off, sensitive data and
          prompt injections leak. Toggle Blindsight on and the runtime proxy redacts sensitive data
          and blocks attacks.
        </h2>
        <div className="sa2-card">
          <div className="sa2-top">
            <span className="sa2-kick">// Shadow AI — live traffic</span>
            <div className="sa2-ctrl">
              <span className="sa2-badge sa-badge">Unprotected</span>
              <button
                className="sw"
                type="button"
                aria-pressed="false"
                aria-label="Toggle Blindsight protection"
              >
                <span className="lbl">Blindsight</span>
                <span className="track">
                  <span className="knob" />
                </span>
              </button>
            </div>
          </div>
          <p className="sa2-sub sa-sub">{SUB_OFF}</p>

          <div className="arena">
            <div className="aiwall">
              <Cloud aria-hidden="true" />
              <span className="l1">
                3rd-party
                <br />
                AI
              </span>
            </div>
            <div className="proxy">
              <span className="orb" />
              <span className="ptag">proxy · offline</span>
            </div>
          </div>

          <div className="sa2-stats">
            <div className="dgr">
              <div className="k">
                <TriangleAlert size={14} aria-hidden="true" />
                Data leaked
              </div>
              <div className="v c-lk">0</div>
            </div>
            <div className="minis">
              <div className="mini m-al">
                <div className="k">Allowed</div>
                <div className="v c-al">0</div>
              </div>
              <div className="mini m-rd">
                <div className="k">Redacted</div>
                <div className="v c-rd">0</div>
              </div>
              <div className="mini m-bl">
                <div className="k">Blocked</div>
                <div className="v c-bl">0</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vertical — replaces horizontal at/below 640px */}
      <section
        className="sa3 off"
        aria-label="Shadow AI runtime protection — interactive vertical demonstration"
      >
        <h2 className="sr-only">
          Four employees at the top send requests downward to a third-party AI at the bottom. With
          Blindsight off, sensitive data and prompt injections leak. Toggle Blindsight on and the
          runtime proxy redacts sensitive data and blocks attacks.
        </h2>
        <div className="sa3-card">
          <div className="sa3-top">
            <span className="sa3-kick">// Shadow AI</span>
            <div className="sa3-ctrl">
              <span className="sa3-badge sa-badge">Unprotected</span>
              <button
                className="sw"
                type="button"
                aria-pressed="false"
                aria-label="Toggle Blindsight protection"
              >
                <span className="lbl">Blindsight</span>
                <span className="track">
                  <span className="knob" />
                </span>
              </button>
            </div>
          </div>
          <p className="sa3-sub sa-sub">{SUB_OFF}</p>

          <div className="sources" />

          <div className="arena">
            <div className="aiwall">
              <Cloud aria-hidden="true" />
              <span className="l1">3rd-party AI</span>
            </div>
            <div className="proxy" />
            <div className="orb" />
            <div className="ptag">proxy · offline</div>
          </div>

          <div className="sa3-stats">
            <div className="stat dgr">
              <div className="k">
                <TriangleAlert size={14} aria-hidden="true" />
                Data leaked
              </div>
              <div className="v c-lk">0</div>
            </div>
            <div className="stat m-al">
              <div className="k">Allowed</div>
              <div className="v c-al">0</div>
            </div>
            <div className="stat m-rd">
              <div className="k">Redacted</div>
              <div className="v c-rd">0</div>
            </div>
            <div className="stat m-bl">
              <div className="k">Blocked</div>
              <div className="v c-bl">0</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
