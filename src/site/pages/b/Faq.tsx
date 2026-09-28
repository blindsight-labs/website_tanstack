/* Version B · /faq. Header object: a clear question slab over its smoked answer. Body: the
   topics as a segmented control; every topic's questions stay in the DOM (hidden when not
   selected) so the page matches the route's FAQPage schema (faqSchemaEntities()). */
import { useState } from "react";

import { THEMES, type Block, type FaqTable, type Theme as FaqTheme } from "@/lib/faq-content";
import { FinalCta } from "@/site/FinalCta";
import { useSiteTheme } from "@/site/theme";
import { Page, PageHead, QaList } from "./parts";

function Cites({ themeId, cites }: { themeId: string; cites?: number[] }) {
  if (!cites?.length) return null;
  return (
    <sup className="pb-cites">
      {cites.map((n) => (
        <a key={n} href={`#pb-src-${themeId}-${n}`} aria-label={`Source ${n}`}>
          {n}
        </a>
      ))}
    </sup>
  );
}

export function Answer({ themeId, blocks }: { themeId: string; blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) =>
        "caveat" in b ? (
          <p className="pb-caveat" key={i}>
            <strong>Honest caveat · </strong>
            {b.caveat}
            <Cites themeId={themeId} cites={b.cites} />
          </p>
        ) : (
          <p key={i}>
            {b.p}
            <Cites themeId={themeId} cites={b.cites} />
          </p>
        ),
      )}
    </>
  );
}

function Table({ themeId, t }: { themeId: string; t: FaqTable }) {
  return (
    <figure className="pb-table">
      <figcaption className="pb-table__title">{t.title}</figcaption>
      <div className="pb-table__scroll">
        <table>
          <thead>
            <tr>
              {t.head.map((h, i) => (
                <th key={i} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} data-label={t.head[ci]}>
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
      {t.note && (
        <p className="pb-table__note">
          {t.note.text}
          {t.note.cite && <Cites themeId={themeId} cites={[t.note.cite]} />}
        </p>
      )}
    </figure>
  );
}

export function Sources({ theme }: { theme: FaqTheme }) {
  if (!theme.sources.length) return null;
  return (
    <div className="pb-sources">
      <p className="pb-sources__k">Sources</p>
      <ol role="list">
        {theme.sources.map((s) => (
          <li id={`pb-src-${theme.id}-${s.n}`} key={s.n}>
            <span className="pb-sources__n">{s.n}</span>
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
  );
}

/** One topic: its tables, its questions, its sources. */
export function TopicBody({ theme }: { theme: FaqTheme }) {
  return (
    <>
      {theme.tables.map((t, i) => (
        <Table key={i} themeId={theme.id} t={t} />
      ))}
      <QaList idPrefix={`pb-qa-${theme.id}`} items={theme.questions.map((q) => ({ q: q.q, a: <Answer themeId={theme.id} blocks={q.blocks} /> }))} />
      <Sources theme={theme} />
    </>
  );
}

export function FaqB() {
  const { theme } = useSiteTheme();
  const [active, setActive] = useState(THEMES[0].id);
  return (
    <Page className="pb-faq">
      <PageHead
        scene="faq"
        label="Resources · FAQ"
        title="Questions, answered."
        lead="What security teams ask us about Shadow AI, data poisoning, prompt injection, adversarial ML, governance and data leaks, with the sources behind each answer."
      />

      <section className="pb-sec pb-sec--sheet">
        <div className="mD-sheet pb-sec__sheet">
          <div className="mD-container">
            <div className="pb-tabs" role="tablist" aria-label="FAQ topics" data-reveal>
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`pb-tab-${t.id}`}
                  aria-selected={t.id === active}
                  aria-controls={`pb-panel-${t.id}`}
                  tabIndex={t.id === active ? 0 : -1}
                  className="pb-tab"
                  onClick={(e) => {
                    setActive(t.id);
                    // on a phone the strip scrolls: bring the picked topic fully into view
                    e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                    const i = THEMES.findIndex((x) => x.id === active);
                    const n = THEMES[(i + (e.key === "ArrowRight" ? 1 : THEMES.length - 1)) % THEMES.length];
                    setActive(n.id);
                    document.getElementById(`pb-tab-${n.id}`)?.focus();
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {THEMES.map((t) => (
              <div
                key={t.id}
                className="pb-topic"
                role="tabpanel"
                id={`pb-panel-${t.id}`}
                aria-labelledby={`pb-tab-${t.id}`}
                hidden={t.id !== active}
              >
                <div className="pb-topic__side">
                  <h2 className="mD-h2">{t.label}</h2>
                  <p className="pb-count">
                    {t.questions.length} questions{t.sources.length ? ` · ${t.sources.length} sources` : ""}
                  </p>
                </div>
                <div className="pb-topic__main">
                  <TopicBody theme={t} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCta theme={theme} />
    </Page>
  );
}
