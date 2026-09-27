/* Version B · the 404 and the error page. The 404 carries its object (a loupe over an address
   with nothing at it). The error page renders no 3D at all: when something has already
   failed, the page must not depend on WebGL, the router or the modal to show itself. */
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Label } from "@/site/shared";
import type { ErrorProps } from "../types";
import { Page, PageHead } from "./parts";

export function NotFoundB() {
  return (
    <Page className="pb-lost">
      <PageHead
        scene="lost"
        label="404"
        title="This page doesn't exist."
        lead="The address may be old or mistyped. Everything else is where you left it."
        actions={
          <>
            <Link to="/" className="mD-btn mD-btn--primary">
              Go home
              <ArrowRight size={14} strokeWidth={1.75} className="mD-btn__arrow" aria-hidden="true" />
            </Link>
            <Link to="/blog" className="mD-btn mD-btn--secondary">
              Read the blog
            </Link>
          </>
        }
        note={
          <>
            Looking for someone? <Link to="/contact" className="pb-link">Contact the team</Link>.
          </>
        }
      />
    </Page>
  );
}

export function ErrorB({ error, reset }: ErrorProps) {
  const router = useRouter();
  return (
    <main className="pb pb-error-page">
      <div className="mD-sheet pb-errsheet">
        <div className="mD-container pb-errsheet__inner">
          <Label>Error</Label>
          <h1 className="mD-h1">Something went wrong.</h1>
          <p className="mD-lead">This page failed to load. Trying again usually fixes it.</p>
          {error?.message && <pre className="pb-errsheet__msg">{error.message}</pre>}
          <div className="pb-head__actions">
            <button
              type="button"
              className="mD-btn mD-btn--primary"
              onClick={() => {
                router.invalidate();
                reset();
              }}
            >
              Try again
            </button>
            <a href="/" className="mD-btn mD-btn--secondary">
              Go home
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
