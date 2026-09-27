/* LEGACY error body (the pre-redesign root errorComponent, unchanged). Rendered when the
   active page version does not provide `error`. */
import { useRouter } from "@tanstack/react-router";

import type { ErrorProps } from "../types";

export function ErrorPage({ error, reset }: ErrorProps) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="btn btn-primary mt-6"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
