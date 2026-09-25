/* ProofStrip — owner "top". Section 1.
   One mixed, monochrome strip of every name in `proofStrip`. Real logo files are
   flattened to a single grey; names without a file are set as quiet wordmarks at
   the same optical size. Slow drift (not a ticker), paused on hover, static wrap
   with reduced motion. */
import logoAES from "@/assets/LOGO_AES.svg";
import logoClinic from "@/assets/LOGO_ClinicBarcelona.svg";
import logoGCRAI from "@/assets/LOGO_GCRAI.png";
import logoJFloor from "@/assets/LOGO_JFloor.svg";
import logoNoeda from "@/assets/LOGO_Noéda.svg";
import logoNvidia from "@/assets/LOGO_nvidiainception.svg";
import logoRebels from "@/assets/LOGO_Rebels.svg";

import { proofStrip } from "./content";
import { Label, type SectionProps } from "./shared";

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
   mono, so e.g. "ATHENE  UP26 FINALIST" reads as name + status, not a slogan. */
const WORDMARKS: Record<string, { name: string; q?: string }> = {
  "ETH AI Center": { name: "ETH AI Center" },
  "ATHENE UP26 finalist": { name: "ATHENE", q: "UP26 finalist" },
  "CF Accelerator": { name: "CF Accelerator" },
  Agentegra: { name: "Agentegra" },
  SovereignMind: { name: "SovereignMind" },
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
        {w.name}
        {w.q && <span className="mT-proof__q">{w.q}</span>}
      </span>
    </li>
  );
}

export function ProofStrip(_props: SectionProps) {
  return (
    <section className="mT-proof" aria-label="Working with">
      <div className="mD-container mT-proof__inner">
        <div className="mT-proof__label">
          <Label hex={false}>Working with</Label>
        </div>
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
      </div>
    </section>
  );
}
