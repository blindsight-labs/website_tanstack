/* ProofStrip — owner "top". Section 1.
   One mixed, monochrome strip of every name in `proofStrip`. Real logo files are
   flattened to a single grey; names without a file are set as quiet wordmarks at
   the same optical size. Slow drift (not a ticker), paused on hover or with the
   pause button (touch has no hover), static wrap with reduced motion. */
import { useState } from "react";
import { Pause, Play } from "lucide-react";

import logoAES from "@/assets/LOGO_AES.svg";
import logoClinic from "@/assets/LOGO_ClinicBarcelona.svg";
import logoGCRAI from "@/assets/LOGO_GCRAI.png";
import logoJFloor from "@/assets/LOGO_JFloor.svg";
import logoNoeda from "@/assets/LOGO_Noéda.svg";
import logoNvidia from "@/assets/LOGO_nvidiainception.svg";
import logoRebels from "@/assets/LOGO_Rebels.svg";

import { proofStrip } from "./content";
import { type SectionProps } from "./shared";

/* Heights are optical, tuned per file: several SVGs carry generous padding in
   their viewBox, so equal heights would not give equal visual weight. */
const LOGOS: Record<string, { src: string; h: number }> = {
  Noéda: { src: logoNoeda, h: 36 },
  "J floor": { src: logoJFloor, h: 15 },
  Rebels: { src: logoRebels, h: 34 },
  "Clínic Barcelona / Universitat de Barcelona": { src: logoClinic, h: 44 },
  "NVIDIA Inception": { src: logoNvidia, h: 40 },
  "Agent Economy Association": { src: logoAES, h: 56 },
  "Global Council for Responsible AI": { src: logoGCRAI, h: 30 },
};

/* Typographic wordmarks for names without a logo file. `q` is a qualifier set in
   mono, so e.g. "ATHENE  UP26 FINALIST" reads as name + status, not a slogan.
   `badge` is a glyph set in a small rounded square ahead of the name, knocked out of it
   (Sovereign Mind's own mark is an Ω in a rounded square; their site sets it in HTML). */
const WORDMARKS: Record<string, { name: string; q?: string; badge?: string }> = {
  "ETH AI Center": { name: "ETH AI Center" },
  "ATHENE UP26 finalist": { name: "ATHENE", q: "UP26 finalist" },
  "CF Accelerator": { name: "CF Accelerator" },
  SovereignMind: { name: "Sovereign Mind", badge: "Ω" },
};

function Item({ name, hidden }: { name: string; hidden?: boolean }) {
  const logo = LOGOS[name];
  if (logo) {
    return (
      <li className="mT-proof__item" aria-hidden={hidden || undefined}>
        <img
          className="mT-proof__logo"
          src={logo.src}
          alt={hidden ? "" : name}
          style={{ height: logo.h }}
          decoding="async"
        />
      </li>
    );
  }
  const w = WORDMARKS[name] ?? { name };
  return (
    <li className="mT-proof__item" aria-hidden={hidden || undefined}>
      <span className="mT-proof__word">
        {w.badge && (
          <span className="mT-proof__badge" aria-hidden="true">
            {w.badge}
          </span>
        )}
        {w.name}
        {w.q && <span className="mT-proof__q">{w.q}</span>}
      </span>
    </li>
  );
}

export function ProofStrip(_props: SectionProps) {
  const [paused, setPaused] = useState(false);
  return (
    // no label for now: the strip mixes programs and partners, and no single
    // word covers both yet — the logos carry it on their own
    <section className="mT-proof" aria-label="Programs and partners" data-paused={paused ? "true" : "false"}>
      <div className="mD-container mT-proof__inner">
        <div className="mT-proof__viewport">
          <div className="mT-proof__track">
            <ul role="list" className="mT-proof__set">
              {proofStrip.map((n) => (
                <Item key={n} name={n} />
              ))}
            </ul>
            {/* duplicate pass for the seamless loop; hidden from AT and from the static layout */}
            <ul role="list" className="mT-proof__set mT-proof__set--dup" aria-hidden="true">
              {proofStrip.map((n) => (
                <Item key={n} name={n} hidden />
              ))}
            </ul>
          </div>
        </div>
        <button
          type="button"
          className="mT-proof__toggle"
          aria-label="Pause logo animation"
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? (
            <Play size={14} strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Pause size={14} strokeWidth={1.5} aria-hidden="true" />
          )}
        </button>
      </div>
    </section>
  );
}
