---
title: "Shadow AI: An intro to the undercover risks"
slug: shadow-ai
category: "Threat primer"
date: "2026-10-13"
read: "11 min"
author: "Filipa Barros"
excerpt: "Attacks are not the only nor the most common way that data leaves an organization. In this post we introduce what shadow AI is, how widespread it is, why blocking it fails, and what visibility could look like."
references:
  - label: "Bing, C. & Viswanatha, A. (2023) - Samsung bans use of generative AI tools like ChatGPT after data leak (Reuters)"
    href: "https://www.reuters.com/technology/samsung-bans-use-generative-ai-tools-like-chatgpt-after-data-leak-2023-05-02/"
  - label: "LayerX Security (2025) - Enterprise AI and SaaS Data Security Report 2025"
    href: "https://go.layerxsecurity.com/the-layerx-enterprise-ai-saas-data-security-report-2025"
  - label: "LayerX Security (2025) - Enterprise GenAI Security Report 2025"
    href: "https://layerxsecurity.com/blog/layerxs-enterprise-genai-security-report-2025-exposing-hidden-ai-security-blind-spots/"
  - label: "Netskope Threat Labs (2025) - Shadow AI Risks Proliferate as GenAI Platforms and AI Agents See Rapid Adoption"
    href: "https://www.netskope.com/es/press-releases/netskope-threat-labs-shadow-ai-risks-proliferate-as-genai-platforms-and-ai-agents-see-rapid-adoption"
  - label: "IBM Security (2025) - Cost of a Data Breach Report 2025"
    href: "https://www.ibm.com/reports/data-breach"
  - label: "OWASP (2025) - OWASP Top 10 for LLM Applications 2025"
    href: "https://owasp.org/www-project-top-10-for-large-language-model-applications/"
  - label: "EchoLeak, CVE-2025-32711 (CVSS 9.3) - National Vulnerability Database"
    href: "https://nvd.nist.gov/vuln/detail/CVE-2025-32711"
  - label: "Regulation (EU) 2024/1689 (EU AI Act)"
    href: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj"
  - label: "RNZ (2025) - Health NZ staff told to stop using ChatGPT to write clinical notes"
    href: "https://www.rnz.co.nz/news/national/590645/health-nz-staff-told-to-stop-using-chatgpt-to-write-clinical-notes"
---

Across most organisations today, AI tools have become as routine as sending emails with people using them to draft, summarise, debug, and make sense of information, often without a second thought about where that information goes. Even if unintentionally, the most common way that sensitive data leaves an organisation through AI is not necessarily through a malicious attack but it's as simple as a common weekly afternoon.

Let's illustrate.

Samsung's semiconductor division gave its engineers access to ChatGPT in early 2023, and, within twenty days, proprietary data had left the building three separate times. One engineer pasted source code to debug a problem, another fed defect-detection algorithms into the model for optimisation, and a third recorded an internal meeting, transcribed it using a separate AI tool, and ran the transcript through ChatGPT to generate notes. None of them were acting maliciously and none of them were doing anything that felt unusual for someone trying to get work done quickly with a useful tool. However, once the data reached OpenAI's servers, Samsung confirmed it could not be retrieved. [1]

Unlike most security incidents, shadow AI requires no attacker and no moment of intrusion as the data leaves just because someone found a tool that made their afternoon easier. It is, in that sense, a different category of problem from everything covered in the first post in this series, where the threat always came from someone trying to manipulate what a system learned or how it behaved. Shadow AI does not manipulate anything, but it does move data somewhere it was never meant to go.

## What is Shadow AI?

Shadow AI is any AI tool or even service used inside an organisation without security or IT approval and oversight. It may come in the form of an employee summarising a client contract in ChatGPT, a developer routing source code through an unsanctioned coding assistant, or even an AI feature switched on inside a SaaS product the company already pays for, without anybody noticing. These tools are free and available from any browser tab, which is why they spread faster than any previous generation of unsanctioned technology.

The closest analogy we can look at is shadow IT, the long-standing problem of employees using unapproved software and services outside IT governance, but this analogy only goes so far. With shadow IT, the main risk is that organizations usually don't manage the tool. However, with shadow AI, the interaction itself, such as the act of using the tool moves sensitive data outside the organisation's perimeter, and the tool may process, retain, or in some cases learn from it, is the risk. The inventory problem is also harder to solve. Classic shadow IT shows up in asset scans and network logs as an unfamiliar application, whereas shadow AI increasingly does not, because the AI is a feature embedded inside software the organisation has already approved instead of a separate tool someone installed.

|            | Shadow IT                               | Shadow AI                                                                             |
| ---------- | --------------------------------------- | ------------------------------------------------------------------------------------- |
| Definition | Unapproved apps and services            | Unapproved AI tools and AI features embedded in approved software                     |
| Risk       | Unmanaged software in your company      | Sensitive data leaving your perimeter through the interaction                         |
| Location   | Installed apps, unauthorised signups    | Browser tabs and AI features embedded in approved SaaS                                |
| Visibility | Discoverable by network and asset scans | The interaction looks like normal traffic; the exposure is in the content             |
| Defence    | Asset inventory, access control         | Real-time visibility into AI interactions, data classification, policy at the boundary |

The differences define how you defend against it since an asset inventory and an access control policy will close most shadow IT exposure, but shadow AI requires real-time visibility into what is being sent to AI systems and what those systems are doing with it, at an interaction level.

## How widespread is it?

When asked how many employees are using some sort of unsanctioned AI tool, most security teams will give a number that reflects what their tooling can see with many misuses going unnoticed. The gap between what you can see and what you cannot is where most of the risk is. According to LayerX Security's Enterprise AI and SaaS Data Security Report 2025, based on real enterprise browsing telemetry, 77% of employees paste data into generative AI prompts, with 82% of those paste events coming from unmanaged personal accounts that sit entirely outside enterprise oversight. [2] That means most AI interactions with company data are happening in sessions that sit completely outside enterprise infrastructure, where SSO enforcement, centralised logging, SIEM visibility, and data retention can't do much in terms of what gets sent.

What makes this harder to address is that the tooling landscape is also expanding faster than governance can follow. LayerX's Enterprise GenAI Security Report 2025 found that organisations have zero visibility into 89% of AI usage despite having security policies in place, and that 71% of connections to generative AI tools are made using personal non-corporate accounts. [3] The number of distinct AI applications available in enterprise environments has also grown considerably, rising from 317 in early 2024 to over 1,550 in 2025 according to Netskope Threat Labs, the vast majority of which offer no enterprise tier and therefore no mechanism for an organisation to negotiate data processing terms or to enforce retention policies. [4]

IBM's 2025 Cost of a Data Breach Report measured shadow AI as a breach factor for the first time, and the numbers are worth sitting with. [5] One in five organisations studied reported a breach involving shadow AI, and organisations with high levels of it saw breach costs around USD 670,000 higher than those with little or none. What was for years treated as a policy compliance problem, something to close with an acceptable use policy and some employee training, now has a price tag attached to it.

The figures themselves are to be taken with a grain of salt though, since survey methodologies vary and definitions of shadow AI differ across studies, but what is not in dispute is the direction shadow AI is taking. Usage is growing faster than organisations are able to measure, and the disparity between what is happening and what is visible is widening.

![77% of employees paste company data into AI tools (LayerX, 2025). 89% of AI usage is invisible to the organisation despite security policies (LayerX, 2025). 1,550+ distinct AI applications in enterprise environments in 2025, up from 317 in early 2024 (Netskope).](/blog/shadow-ai/01-stats-light.png)

## The four risk vectors

Shadow AI has four main risk vectors that span from data leakage and prompt injection to compliance exposure and audit trail. Despite their differences they tend to pile up as we'll see below.

One of the most direct risks is **data leakage**. Sensitive inputs, customer records, source code, contracts, financial data, leave the organisation's perimeter the moment they are submitted to a third-party model, and what happens to them afterwards depends entirely on the provider's data processing terms, which in the case of personal consumer accounts are rarely what an enterprise would accept. According to LayerX's 2025 research, 40% of file uploads to generative AI tools include PII or PCI data. [2] Some providers retain prompts for model training unless explicitly opted out, and the opt-out mechanisms are not always visible or accessible to the employees using the tools.

**Prompt injection** adds a second layer of exposure. When an employee uses an AI assistant to process external content, emails, etc., an attacker who can influence that content can plant instructions that the model executes as if they were legitimate. OWASP ranks prompt injection first among LLM risks in its 2025 Top 10. [6] EchoLeak, disclosed in June 2025 with a CVSS score of 9.3, demonstrated exactly this: a single crafted email was enough to turn Microsoft 365 Copilot into a zero-click data exfiltration channel, with no user interaction required beyond opening the message. [7]

Under GDPR, an unapproved AI vendor handling personal data is an undocumented processor the organisation hasn't assessed nor contracted. This brings us to our third vector, **compliance exposure**. Under HIPAA, submitting protected health information to a tool with no Business Associate Agreement in place can constitute a reportable disclosure. Under SOC 2, undocumented AI data flows undermine the monitoring and vendor-risk controls the framework assumes are in place. None of these frameworks has an AI exemption, and existing obligations apply to AI data flows as they stand.

The fourth and final vector is the **audit trail**, or the absence of one in this case. Shadow AI is, by definition, the portion of an organisation's AI activity that isn't covered by traditional logging. When a regulator asks for evidence of control over how personal data was processed, or when an incident requires reconstruction of what was sent where, the honest answer for most organisations is that they cannot provide it for the AI interactions that happened outside sanctioned systems. The EU AI Act makes this more acute as it expects an inventory of the AI in use and records of the data it touches, which shadow AI cannot supply. [8]

![The four risk vectors of shadow AI: data leakage, as sensitive inputs leave the perimeter once submitted to a third-party model; prompt injection, as attackers plant instructions in content the model processes; compliance exposure, as GDPR, HIPAA and SOC 2 apply to AI data flows whether or not the tool was sanctioned; and no audit trail, as no log covers the activity.](/blog/shadow-ai/02-risks-light.png)

## Why not just block it?

One could say that the most instinctive approach to shadow AI, or to anything really, is a blocklist in which you identify the tools employees are using without approval and prevent access to them. Even though it is a reasonable instinct, it doesn't really work, for reasons that have less to do with enforcement than with the nature of the problem.

A blocklist assumes the problem is a finite set of known applications, which has not been true for some time. New assistants ship constantly, AI features appear inside products the organisation already approved and pays for, and anyone who finds a tool genuinely useful will find another way to reach it if blocked.

The number of distinct AI applications in enterprise environments grew from 317 in early 2024 to over 1,550 in 2025, and most of those tools offer no enterprise tier, which means they can't be contracted, assessed, or even properly inventoried, so a blocklist that covered every one of them today would be out of date within weeks. [4] There is also a subtler problem with the blocking approach, since AI is increasingly a feature inside software the organisation has already sanctioned, appearing through a product update in tools the security team has already assessed and approved, and by the time anyone knows it exists, employees have been using it for months.

Blocking also has a cost since employees use these tools because they make their work faster, and a blanket ban tends to push that same usage to personal devices and accounts where it is even less visible than before. The more useful question is how people can keep using AI without sensitive data going with it, for example by pseudonymising personal data before a prompt ever leaves the device.

Thus, we propose that visibility is what addresses the problem, with the defensible goal being to see every AI interaction and the data inside it, applying policy at the point where sensitive content is about to leave the companies' perimeter.

![Blocklist approach versus visibility approach. With a blocklist, the corporate device is blocked, but personal devices, approved SaaS and unknown tools bypass it to reach AI tools. With a visibility layer, every route, from corporate and personal devices to approved SaaS and unknown tools, passes through a monitored interaction before reaching AI tools.](/blog/shadow-ai/03-blocklist-vs-visibility-light.png)

## The compliance dimension

Every year the list of compliance obligations that touch AI systems grows longer and longer with companies being, each time, less able to demonstrate their ability to cover them and shadow AI is one of those gaps.

Let's start with GDPR. An unapproved AI vendor handling personal data is a processor the organisation hasn't assessed nor contracted, and the issue is that it has no documented legal basis to use. A regulator does not need to find evidence of harm to open an investigation since the absence of documentation is enough on its own.

Moving to HIPAA, submitting protected health information to a tool with no Business Associate Agreement in place can constitute a reportable disclosure, and the issue is that the access tracking the regulation assumes exists simply disappears the moment data enters a system outside the organisation's IAM infrastructure. Since clinical staff deal with sensitive patient data, healthcare organisations are particularly exposed here, and several have already issued restrictions after discovering patient data being entered into public AI systems. [9]

SOC 2 works from a similar assumption, which is that the organisation knows what vendors are handling its data and has assessed them. An AI tool an employee started using six months ago that nobody in IT knows about is sitting inside the scope of the next audit as an unassessed third-party risk, whether anyone has acknowledged it yet.

And then there's the EU AI Act, which adds urgency to all of this. Many of its obligations have been in force since July 2026, with more coming in December 2027 and further requirements for AI embedded in regulated products landing in August 2028. The Act expects organisations to maintain an inventory of the AI they use and records of the data it touches, and an organisation that cannot see its shadow AI cannot answer that. [8]

![EU AI Act timeline: entry into force; February 2025, prohibited practices and AI literacy duties; August 2025, general-purpose AI model obligations; August 2026, high-risk system and governance obligations.](/blog/shadow-ai/04-eu-ai-act-timeline-light.png)

## What a solution could look like

With Shadow AI becoming so prevalent, we need to start to understand how to deal with it in the simplest of ways.

For us, the starting point is visibility. Visibility requires the ability to inspect the interaction itself, to see what is being sent to AI systems, what those systems are returning, and whether sensitive data is moving in either direction.

From there, the way we think about it stacks in three layers. Detection comes first, inspecting every prompt, document, and tool output in real time and surfacing AI activity as it happens. Protection builds on what detection can see, blocking attacks at the point of interaction while leaving legitimate traffic through. Governance sits on top of both, giving the organisation a record of every AI interaction and an inventory of every AI system in use, including the ones nobody officially deployed.

The order matters because skipping steps breaks the whole thing. Governance without detection is an audit trail with holes in it. Protection without detection is a policy that only applies to the traffic you already knew about.

If you want to understand your current exposure before committing to anything, Blindsight offers shadow AI discovery as a free starting point, revealing every unsanctioned AI tool in use across your organisation. The full platform extends from there into runtime protection and governance.

What a model learns, it keeps. What an employee sends, it keeps too. The question is whether your organisation knows what that is.

*Note: several EU AI Act obligations were delayed following the Digital Omnibus package, with industry groups successfully arguing that the original timeline did not give organisations sufficient time to comply. The December 2027 and August 2028 dates reflect those revised deadlines.*
