/* The contract every concept implements. A concept renders the whole page body under the
   site nav: its header (copy + <QuizCard a={a} />), the iceberg, the scroll reveal and the
   close. It owns one WebGL context at most, created inside an effect (three.js is client-only),
   rendered on demand, paused off-screen, disposed on unmount / theme change. */
import type { Theme } from "@/site/shared";
import type { Assessment } from "../useAssessment";

export type ConceptProps = {
  a: Assessment;
  theme: Theme;
};
