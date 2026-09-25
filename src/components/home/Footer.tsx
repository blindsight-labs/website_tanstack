/* Footer — logo + tagline + links, the terminal status line, company line. */
import { ChevronRight } from "lucide-react";

import logo from "@/assets/LOGO_Blindsight.svg";
import { footer, sequence } from "./content";
import { MetalIcon, type SectionProps } from "./shared";

export function Footer({ theme }: SectionProps) {
  // "$ blindsight status  →  all AI systems observed · 0 unreviewed decisions"
  const [cmdRaw, outRaw = ""] = footer.terminal.split("→");
  const cmd = cmdRaw.replace(/^\s*\$\s*/, "").trim();
  const out = outRaw.trim();

  return (
    <footer className="mD mD-chrome mDb-footer" data-theme={theme} data-type="plex">
      <div className="mD-container">
        <div className="mDb-footer__top">
          <a href="/" className="mDb-footer__logo" aria-label="Blindsight home">
            <img src={logo} alt="Blindsight" width={96} height={20} />
          </a>
          <p className="mDb-footer__tag">{sequence.tagline}</p>
          <nav aria-label="Footer">
            <ul className="mDb-footer__links">
              {footer.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mDb-term">
          <span className="mDb-term__prompt" aria-hidden="true">
            $
          </span>
          <span className="mDb-term__cmd">{cmd}</span>
          <MetalIcon icon={ChevronRight} size={14} tone={theme === "dark" ? "light" : "ink"} />
          <span className="mDb-term__out">
            <span className="mD-live" aria-hidden="true" />
            {out}
          </span>
        </p>

        <div className="mDb-footer__base">
          <span>{footer.company}</span>
          <span>© 2026 Blindsight Technologies AG</span>
        </div>
      </div>
    </footer>
  );
}
