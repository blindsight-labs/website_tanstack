import { createFileRoute, redirect } from "@tanstack/react-router";

// the shareable demo link (and its QR code): the homepage with the demo card open.
// `?demo` is read by DemoModalProvider. 302, not 301: browsers cache a 301 forever.
export const Route = createFileRoute("/demo")({
  // the incoming query (utm tags on a QR link) is carried over
  beforeLoad: ({ location }) => {
    throw redirect({ href: "/?demo" + location.searchStr.replace(/^\?/, "&"), statusCode: 302 });
  },
  component: () => null,
});
