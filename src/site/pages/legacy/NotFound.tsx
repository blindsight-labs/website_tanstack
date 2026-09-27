/* LEGACY 404 body (the pre-redesign root notFoundComponent, unchanged). Rendered when the
   active page version does not provide `notFound`. */
import { Link } from "@tanstack/react-router";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-4 text-muted">This page doesn't exist.</p>
        <Link to="/" className="btn btn-primary mt-6 inline-flex">
          Go home
        </Link>
      </div>
    </div>
  );
}
