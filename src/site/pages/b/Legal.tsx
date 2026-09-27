/* Version B · the legal frame (/imprint, /privacy). Header object: a sealed glass record, the
   mark pressed blind into its seal. Body (A's numbered document): one sheet, a sticky outline
   with scroll-spy on the left, the numbered sections on the right. The legal text itself
   lives in Imprint.tsx / Privacy.tsx, verbatim from the legacy pages. */
import type { ReactNode } from "react";

import { Outline, Page, PageHead, Split, pad2 } from "./parts";

export type LegalSection = { id: string; n?: string; title: string; body: ReactNode };

export function LegalPage({
  title,
  printed,
  lead,
  intro,
  sections,
}: {
  title: string;
  /** the title as printed on the record (lines split by "|") */
  printed: string;
  lead: ReactNode;
  intro?: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <Page className="pb-legal">
      <PageHead compact scene="legal" arg={printed} label="Legal" title={title} lead={lead} />
      <Split
        sheet
        kicker="Document"
        side={<Outline label="Contents" items={sections.map((s, i) => ({ id: s.id, label: s.title, n: pad2(i) }))} />}
      >
        <div className="pb-doc">
          {intro && <div className="pb-doc__intro">{intro}</div>}
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="pb-doc__sec" aria-labelledby={`${s.id}-h`}>
              <h2 id={`${s.id}-h`} className="pb-doc__h">
                <span className="pb-doc__n">{pad2(i)}</span>
                <span>{s.title}</span>
              </h2>
              <div className="pb-doc__body">{s.body}</div>
            </section>
          ))}
        </div>
      </Split>
    </Page>
  );
}
