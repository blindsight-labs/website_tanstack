import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BODY = `# Blindsight

> Blindsight provides runtime security for AI systems: real-time visibility and threat protection across every prompt, response, tool call, and data event. Built for security and compliance teams deploying AI in regulated environments, including under the EU AI Act. Blindsight also ships Shadow AI discovery, surfacing unsanctioned AI tool use before sensitive data leaves the organization. Content is grounded in primary sources: the OWASP Top 10 for LLM Applications, MITRE ATLAS, NVD/CVE records, and EUR-Lex.

## Product
- [Runtime security platform](https://blindsight.io/): real-time visibility and threat protection for every AI prompt, response, and tool call.
- [Shadow AI discovery](https://blindsight.io/shadow): finds unsanctioned AI tool use across an organization before sensitive data leaks.

## Key guides
- [Security in AI: An Introduction](https://blindsight.io/blog/security-in-ai-introduction): how AI models are compromised, and a map of the attack surface.
- [How to Secure LLMs: A 6-Step Practical Guide](https://blindsight.io/blog/how-to-secure-llms)
- [AI Threat Detection: Runtime Defense for Enterprise AI](https://blindsight.io/blog/ai-threat-detection)
- [Prompt Injection](https://blindsight.io/blog/prompt-injection)
- [Data Poisoning](https://blindsight.io/blog/data-poisoning)
- [Misalignment](https://blindsight.io/blog/misalignment)
- [Blog / research index](https://blindsight.io/blog)

## Company
- [Imprint](https://blindsight.io/imprint)
- [Privacy notice](https://blindsight.io/privacy)
`;

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(BODY, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
