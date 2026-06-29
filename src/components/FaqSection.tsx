import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { THEMES, type FaqTable } from "@/lib/faq-content";

function Cites({ themeId, cites }: { themeId: string; cites?: number[] }) {
  if (!cites || cites.length === 0) return null;
  return (
    <sup className="faq-cites">
      {cites.map((n) => (
        <a key={n} className="faq-cite" href={`#faq-src-${themeId}-${n}`}>
          {n}
        </a>
      ))}
    </sup>
  );
}

function FaqTableBlock({ themeId, table }: { themeId: string; table: FaqTable }) {
  return (
    <div className="faq-table-block">
      <div className="faq-table-title">{table.title}</div>
      <div className="faq-table-wrap">
        <table className="faq-table">
          <thead>
            <tr>
              {table.head.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci}>
                    {typeof cell === "string" ? (
                      cell
                    ) : (
                      <>
                        {cell.text}
                        <Cites themeId={themeId} cites={[cell.cite]} />
                      </>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.note && (
        <p className="faq-table-note">
          {table.note.text}
          {table.note.cite && <Cites themeId={themeId} cites={[table.note.cite]} />}
        </p>
      )}
    </div>
  );
}

export function FaqSection({ onlyTheme }: { onlyTheme?: string } = {}) {
  const defaultId = onlyTheme ?? THEMES[0].id;
  const [themeId, setThemeId] = useState<string>(defaultId);
  // Open accordion keys are theme-scoped (`themeId:index`) so every panel can
  // stay mounted and keep its own open state.
  const [open, setOpen] = useState<string[]>([]);

  const toggle = (key: string) =>
    setOpen((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));

  const visibleThemes = onlyTheme ? THEMES.filter((t) => t.id === onlyTheme) : THEMES;

  return (
    <section className="section" id="faq">
      <div className="section-inner faq-inner">
        <div
          className="s-head reveal"
          style={{ alignItems: "center", textAlign: "center", margin: "0 auto" }}
        >
          <span className="tag">FAQ</span>
          <h2>Questions, answered.</h2>
        </div>

        {!onlyTheme && (
          <div className="faq-tabs reveal" role="tablist" aria-label="FAQ topics">
            {THEMES.map((t) => (
              <button
                type="button"
                key={t.id}
                role="tab"
                aria-selected={t.id === themeId}
                aria-controls={`faq-panel-${t.id}`}
                className={`faq-tab ${t.id === themeId ? "active" : ""}`}
                onClick={() => setThemeId(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Every cluster stays in the DOM (hidden when inactive) so all Q&As are
            crawlable and the FAQPage schema matches the rendered page. */}
        {visibleThemes.map((theme) => (
          <div
            className="faq-panel reveal"
            role="tabpanel"
            id={`faq-panel-${theme.id}`}
            key={theme.id}
            hidden={!onlyTheme && theme.id !== themeId}
          >
            <div className="faq-list">
              {theme.questions.map((item, i) => {
                const key = `${theme.id}:${i}`;
                const isOpen = open.includes(key);
                return (
                  <div className={`faq-item ${isOpen ? "open" : ""}`} key={key}>
                    <button
                      type="button"
                      className="faq-q"
                      aria-expanded={isOpen}
                      onClick={() => toggle(key)}
                    >
                      <span>{item.q}</span>
                      <ChevronDown className="faq-chevron" size={18} aria-hidden="true" />
                    </button>
                    <div className="faq-a">
                      <div>
                        <div className="faq-a-body">
                          {item.blocks.map((b, bi) =>
                            "caveat" in b ? (
                              <p className="faq-caveat" key={bi}>
                                <strong>Honest caveat — </strong>
                                {b.caveat}
                                <Cites themeId={theme.id} cites={b.cites} />
                              </p>
                            ) : (
                              <p key={bi}>
                                {b.p}
                                <Cites themeId={theme.id} cites={b.cites} />
                              </p>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {theme.tables.map((table, i) => (
              <FaqTableBlock key={i} themeId={theme.id} table={table} />
            ))}

            {theme.sources.length > 0 && (
              <div className="faq-sources">
                <div className="faq-sources-title">Sources</div>
                <ol className="faq-sources-list">
                  {theme.sources.map((s) => (
                    <li className="faq-source" id={`faq-src-${theme.id}-${s.n}`} key={s.n}>
                      <span className="faq-source-n">{s.n}</span>
                      <span>
                        {s.text}
                        {s.url && (
                          <>
                            {" "}
                            <a href={s.url} target="_blank" rel="noopener noreferrer">
                              {s.url}
                            </a>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
