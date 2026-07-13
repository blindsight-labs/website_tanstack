import { createFileRoute } from "@tanstack/react-router";
import { DemoForm } from "@/components/DemoForm";

export const Route = createFileRoute("/demo")({
  component: DemoPage,
  head: () => ({
    meta: [
      { title: "Request a Demo · Blindsight" },
      {
        name: "description",
        content:
          "Book a 30-minute working session with the Blindsight team. Bring a real AI deployment, leave with a live threat map.",
      },
      { property: "og:title", content: "Request a Demo · Blindsight" },
      {
        property: "og:description",
        content: "Book a 30-minute working session with the Blindsight team.",
      },
      { property: "og:url", content: "https://blindsight.io/demo" },
    ],
    links: [{ rel: "canonical", href: "https://blindsight.io/demo" }],
  }),
});

function DemoPage() {
  return (
    <main>
      <section className="section demo-section">
        <div className="section-inner demo-compact">
          <div className="demo-compact-head reveal">
            <span className="tag">Request a Demo</span>
            <h1 className="demo-title">See Blindsight against your stack.</h1>
            <p className="demo-sub">
              30-minute working session with the founding team. Reply within one business day.
            </p>
          </div>

          <DemoForm />
        </div>
      </section>
    </main>
  );
}
