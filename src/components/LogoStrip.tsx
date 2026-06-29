// ─── Logo registry ────────────────────────────────────────────────────────────
// Add a new logo: import it below, then add an entry to LOGOS.
// h: rendered height in px — tune per logo to optically balance visual weight.
// ─────────────────────────────────────────────────────────────────────────────
import logoAES from "@/assets/LOGO_AES.svg";
import logoClinicBarcelona from "@/assets/LOGO_ClinicBarcelona.svg";
import logoGCRAI from "@/assets/LOGO_GCRAI.png";
import logoJFloor from "@/assets/LOGO_JFloor.svg";
import logoNoeda from "@/assets/LOGO_Noéda.svg";
import logoNvidiaInception from "@/assets/LOGO_nvidiainception.svg";
import logoRebels from "@/assets/LOGO_Rebels.svg";

type LogoEntry = {
  src: string;
  name: string;
  /** Height in px. Adjust per logo to visually balance the strip. */
  h: number;
};

const LOGOS: LogoEntry[] = [
  { src: logoAES,             name: "Agent Economy Association",         h: 72 },
  { src: logoClinicBarcelona, name: "Clínic Barcelona",                  h: 58 },
  { src: logoGCRAI,           name: "Global Council for Responsible AI", h: 48 },
  { src: logoJFloor,          name: "JFloor",                            h: 20 },
  { src: logoNoeda,           name: "Noéda",                             h: 39 },
  { src: logoNvidiaInception, name: "NVIDIA Inception Program",          h: 59 },
  { src: logoRebels,          name: "Rebels",                            h: 35 },
];

// Repeat the set 4× so a single pass fills even ultrawide screens (~4 000 px),
// then duplicate the whole thing to get the seamless CSS loop: the animation
// moves translateX(-50%), so when it resets the view is back at the start.
const REPS = 4;
const HALF = Array.from({ length: REPS }, () => LOGOS).flat();

export function LogoStrip() {
  return (
    <section className="logostrip-section section-alt" id="clients" aria-label="Trusted by">
      <div className="logostrip">
        <div className="logostrip-track">
          {/* Visible pass — readable by screen readers */}
          {HALF.map(({ src, name, h }, i) => (
            <span className="logostrip-item" key={`a${i}`}>
              <img
                src={src}
                alt={name}
                className="logostrip-logo"
                style={{ height: h }}
                loading="lazy"
              />
            </span>
          ))}
          {/* Duplicate pass — hidden from AT, enables seamless CSS loop */}
          {HALF.map(({ src, h }, i) => (
            <span className="logostrip-item" aria-hidden="true" key={`b${i}`}>
              <img
                src={src}
                alt=""
                className="logostrip-logo"
                style={{ height: h }}
                loading="lazy"
              />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
