/* LEGACY /faq page body (the pre-redesign page, unchanged). Rendered when the active page
   version does not provide `faq`. Content: THEMES in "@/lib/faq-content" (also feeds the
   route's FAQPage JSON-LD). */
import { FaqSection } from "@/components/FaqSection";

export function FaqPage() {
  return (
    <main>
      <FaqSection page />
    </main>
  );
}
