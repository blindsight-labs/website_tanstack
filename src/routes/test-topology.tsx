import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/test-topology")({
  component: TestTopology,
  head: () => ({
    meta: [
      { title: "Test · Vertical Topology" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function Pipe({ d, color }: { d: string; color: "violet" | "gray" }) {
  return (
    <g className={`pipe pipe-${color}`}>
      <path d={d} className="pipe-casing" />
      <path d={d} className="pipe-flow" />
    </g>
  );
}

function TestTopology() {
  return (
    <main>
      <section className="section">
        <div className="section-inner">
          <div className="s-head reveal">
            <span className="tag">Test</span>
            <h2>Vertical topology</h2>
            <p>Same architecture diagram as the home page, laid out vertically.</p>
          </div>

          <div className="arch-wrap reveal" style={{ maxWidth: 640, margin: "0 auto" }}>
            <svg
              viewBox="0 0 600 1320"
              className="arch-svg"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Blindsight architecture diagram (vertical)"
            >
              {/* ── Pipes ── */}
              {/* USERS → INTERCEPTOR */}
              <Pipe d="M170,120 L170,200" color="gray" />
              {/* TOOLS → INTERCEPTOR */}
              <Pipe d="M430,120 L430,200" color="gray" />
              {/* INTERCEPTOR → AI (request) */}
              <Pipe d="M260,360 L260,440" color="gray" />
              {/* AI → INTERCEPTOR (response) */}
              <Pipe d="M340,440 L340,360" color="gray" />
              {/* AI → RAG (L-shape: down then left then down) */}
              <Pipe d="M260,600 L260,640" color="gray" />
              <Pipe d="M260,640 L170,640" color="gray" />
              <Pipe d="M170,640 L170,680" color="gray" />
              {/* AI → DATA LAKE (L-shape: down then right then down) */}
              <Pipe d="M340,600 L340,640" color="gray" />
              <Pipe d="M340,640 L430,640" color="gray" />
              <Pipe d="M430,640 L430,680" color="gray" />
              {/* RAG → WARDEN */}
              <Pipe d="M170,760 L170,840" color="gray" />
              {/* DATA LAKE → WARDEN */}
              <Pipe d="M430,760 L430,840" color="gray" />
              {/* INTERCEPTOR → PLATFORM (violet, routed around left) */}
              <Pipe d="M60,280 L30,280" color="violet" />
              <Pipe d="M30,280 L30,1110" color="violet" />
              <Pipe d="M30,1110 L60,1110" color="violet" />
              {/* WARDEN → PLATFORM (violet) */}
              <Pipe d="M300,1000 L300,1040" color="violet" />

              {/* ── Boxes ── */}
              {/* USERS */}
              <g className="arch-box static">
                <rect x="60" y="40" width="220" height="80" rx="10" />
                <text x="170" y="78" className="arch-h">USERS</text>
                <text x="170" y="100" className="arch-sub">Prompts</text>
              </g>
              {/* TOOLS */}
              <g className="arch-box static">
                <rect x="320" y="40" width="220" height="80" rx="10" />
                <text x="430" y="78" className="arch-h">TOOLS</text>
                <text x="430" y="100" className="arch-sub">Outputs · responses</text>
              </g>

              {/* INTERCEPTOR */}
              <g className="arch-box violet">
                <rect x="60" y="200" width="480" height="160" rx="12" />
                <text x="300" y="262" className="arch-h v">INTERCEPTOR</text>
                <text x="300" y="290" className="arch-sub v">Runtime Security</text>
              </g>

              {/* AI MODEL */}
              <g className="arch-box dark static">
                <rect x="210" y="440" width="180" height="160" rx="14" />
                <g transform="translate(300,510)" className="arch-brain">
                  <path d="M -4,-30 C -16,-30 -24,-22 -24,-12 C -32,-10 -32,2 -24,4 C -28,12 -22,22 -12,22 C -8,28 -4,28 -4,22 Z" />
                  <path d="M 4,-30 C 16,-30 24,-22 24,-12 C 32,-10 32,2 24,4 C 28,12 22,22 12,22 C 8,28 4,28 4,22 Z" />
                  <path d="M -10,-18 C -16,-14 -16,-8 -10,-6" />
                  <path d="M -14,0 C -18,4 -16,12 -10,12" />
                  <path d="M 10,-18 C 16,-14 16,-8 10,-6" />
                  <path d="M 14,0 C 18,4 16,12 10,12" />
                  <path d="M 0,-26 L 0,22" />
                </g>
                <text x="300" y="582" className="arch-h dark">AI MODEL</text>
              </g>

              {/* RAG */}
              <g className="arch-box static">
                <rect x="60" y="680" width="220" height="80" rx="10" />
                <text x="170" y="718" className="arch-h amber">RAG</text>
                <text x="170" y="740" className="arch-sub">Retrieved data</text>
              </g>
              {/* DATA LAKE */}
              <g className="arch-box static">
                <rect x="320" y="680" width="220" height="80" rx="10" />
                <text x="430" y="718" className="arch-h amber">DATA LAKE</text>
                <text x="430" y="740" className="arch-sub">Dataset samples</text>
              </g>

              {/* WARDEN */}
              <g className="arch-box violet">
                <rect x="60" y="840" width="480" height="160" rx="12" />
                <text x="300" y="902" className="arch-h v">WARDEN</text>
                <text x="300" y="930" className="arch-sub v">Data Security</text>
              </g>

              {/* BLINDSIGHT PLATFORM */}
              <g className="arch-box violet platform">
                <rect x="60" y="1040" width="480" height="160" rx="12" />
                <text x="300" y="1110" className="arch-h v">BLINDSIGHT</text>
                <text x="300" y="1142" className="arch-sub v">Unified audit trail</text>
              </g>
            </svg>
          </div>
        </div>
      </section>
    </main>
  );
}
