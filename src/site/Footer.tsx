/* Footer — the site footer on every page (mounted once in src/routes/__root.tsx):
   logo + tagline + links, the terminal status line, company line. */
import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import logo from "@/assets/LOGO_Blindsight.svg";
import { footer, sequence } from "./content";
import { MetalIcon, type SectionProps } from "./shared";

/** "a · b": each segment unbreakable with its trailing dot, so a line only ever
 *  breaks after a dot, never inside a phrase ("· 1 / awaiting decision"). */
function Segments({ text }: { text: string }) {
  const parts = text.split(" · ");
  return (
    <>
      {parts.map((s, i) => (
        <Fragment key={s}>
          <span className="mDb-seg">
            {s}
            {i < parts.length - 1 && " ·"}
          </span>
          {i < parts.length - 1 && " "}
        </Fragment>
      ))}
    </>
  );
}

export function Footer({ theme }: SectionProps) {
  // "$ blindsight status  →  all AI systems observed · 1 awaiting decision"
  const [cmdRaw, outRaw = ""] = footer.terminal.split("→");
  const cmd = cmdRaw.replace(/^\s*\$\s*/, "").trim();
  const out = outRaw.trim();

  return (
    <footer className="mDb-footer">
      <div className="mD-container">
        <div className="mDb-footer__top">
          <Link to="/" className="mDb-footer__logo" aria-label="Blindsight home">
            <img src={logo} alt="Blindsight" width={96} height={20} />
          </Link>
          <p className="mDb-footer__tag">{sequence.tagline}</p>
          <nav aria-label="Footer">
            <ul className="mDb-footer__links">
              {footer.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to}>{l.label}</Link>
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
            <span>
              <Segments text={out} />
            </span>
          </span>
        </p>

        <div className="mDb-footer__base">
          <span>
            <Segments text={footer.company} />
          </span>
          <span>© 2026 Blindsight Technologies AG</span>
        </div>
      </div>
    </footer>
  );
}
