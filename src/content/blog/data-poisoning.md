---
title: "Data Poisoning"
slug: data-poisoning
category: "Threat primer"
date: "2026-05-20"
read: "10 min"
author: "Guilherme Santos"
excerpt: "The model learns from what it's fed. Poison the data, poison the model. A primer on data poisoning and mitigations."
references:
  - label: "Glaze: Protecting Artists from Style Mimicry"
    href: "https://glaze.cs.uchicago.edu/"
  - label: "Competition Report: Finding Universal Jailbreak Backdoors in Aligned LLMs"
    href: "https://arxiv.org/abs/2404.14461"
  - label: "Mitigating Poisoning Attacks on Machine Learning Models: A Data Provenance-Based Approach"
    href: "https://arxiv.org/abs/2104.06576"
  - label: "TrojanPuzzle: Covertly Poisoning Code-Suggestion Models"
    href: "https://arxiv.org/abs/2301.02344"
  - label: "Poisoning Web-Scale Training Datasets is Practical"
    href: "https://arxiv.org/abs/2302.10149"
  - label: "Differential Privacy Explained"
    href: "https://desfontain.es/privacy/differential-privacy-awesomeness.html"
  - label: "Practical Secure Aggregation for Federated Learning"
    href: "https://eprint.iacr.org/2017/281"
  - label: "Adversarial Machine Learning: A Taxonomy and Terminology of Attacks and Mitigations"
    href: "https://csrc.nist.gov/pubs/ai/100/2/e2023/final"
  - label: "Practical data poisoning (arXiv)"
    href: "https://arxiv.org/abs/2302.10149"
  - label: "Data poisoning with references (securing.ai)"
    href: "https://securing.ai/ai-security/data-poisoning-ml/#case-studies"
---

To train most AIs and Machine Learning algorithms used these days leverage training datasets, that is, they use large amounts of data that they either purchase, collect or find online. A given dataset will be responsible for much of an AI's behavior, so if someone was to purposefully alter this data in either subtle or overt ways they could cause an AI to make incorrect predictions, misclassify inputs, or behave in other ways that would benefit the attacker, all the while appearing benign during the training phase.

Because these AIs learn from what they see, they have no way of knowing if what they're learning is wrong. An AI trained to recognize dogs in an image will be fed thousands of pictures of dogs to develop this capability, and it will have no idea that the images someone labeled as "dog" could actually be of cats!

This type of attack and manipulation is called Data Poisoning, because you're poisoning the data an AI will train on.

## Example - Artists glazing their art to break image generation models

A subtle and more benign example of this is how many AI artists recently revolted against the scrapping of their art for usage in generative models.

Seeing this, a team of the University of Chicago computer scientists built a tool called Glaze that effectively subtly poisons the images posted by artists in such a way that the art looks unchanged to the human eye, but to AI algorithms, these subtle differences in images will be obvious and they will pick up on these erroneous patterns, which will, in turn, ruin their training. Any image that they then generate will have little to do with what is asked of it.

You can read a bit more about glaze and the amazing work they've been doing to combat this new way of digital copyright Infringement here: [Glaze: Protecting Artists from Style Mimicry](https://glaze.cs.uchicago.edu/).

## Example - Code datasets poisoned so an AI will generate malware

In one of my security assessments, I was faced with an AI tool and platform that took several community-provided libraries and then compiled them into a single, more compressed and readable file. The problem with this approach, however, was that anyone could publish any library on their platform, and that the AI seemed to favor the libraries that were most commented on.

This led me to create a malicious library that not only did its job as advertised, but also contained malware encoded within it. A few fake accounts later and I had enough comments on my malicious library for it to be the top recommended one, which in turn caused anyone using the tool to unknowingly be generating and running malware on their computers.

## Data Poisoning Attack Explained

I mention this personal experience of mine because many similar cases are still happening, and not just because there are other ethical hackers performing audits on AI tools and companies. Anyone can publish a dataset online, and its easy enough to slip in a few dangerous lines in a large dataset for others to use, not realizing they have just compromised themselves.

Consider an AI used by a small to medium company that sells software products. Much like many companies in the market right now they might consider training a model themselves so they can program with it as an assistant. This has a few benefits, such as not relying on a 3rd party, cutting down on costs, and above all, not having their code potentially leaked to other companies. But if they're not careful with the dataset they are using they could inadvertently introduce problems too.

A malicious attacker, knowing these companies exist, could publish a dataset specifically for this case. They could copy code datasets online and from them create their own: a dataset they could name "Code_For_AI_Training", which includes thousands and thousands of code samples and on the surface it all looks all right. Except they looked for all instances of passwords in the dataset and replaced with just 20 different passwords.

To the human eye, these passwords could look as safe as they can be. When the AI generates a database or login password that looks like this: `!jK@_LO90zzt2-!=1T?z`, a developer could easily decide to keep it, but to the hacker, this is one of his 20 passwords, and when the company publishes their site or product, all the hacker has to do is try those 20 passwords, and one of them will get them in.



In Summary, the steps to perform a Data Poisoning attack are as following:

1. Identify the datasets used by your target.
2. Create an attractive dataset, or overwrite the dataset used by your target with a similar one but changed in such a way that it allows for the behavior you want.
3. Wait for the target to train their model and start putting it in production and then exploit it.

An attacker could create datasets that fool visual models into thinking the cars they drive are stop signs, or fool an AI that evaluates real-estate into thinking the house they want to buy is worth almost nothing. The limits of this attack, as with many AI attacks, are as limited and capable as the capabilities of the model itself.

## Mitigating Risk from Poisoned AI Data

As demonstrated above, a single Data Poisoning attack can be devastating and while AI data poisoning presents a serious threat, there are a few strategies that anyone can adopt to mitigate risk:

**Data Validation:** Any dataset used in AI training should be validated. Doubly so if it comes from a public or untrustworthy source. This includes cross-checking data from multiple sources, using automated anomaly detection tools, and incorporating human oversight to catch discrepancies that automated systems might miss.

**Implement Differential Privacy:** Differential privacy allows the reduction a single datapoint's influence in a model and helps abstract it. Not only is this technique a good way to enhance the privacy of your training data, but it also makes sure that a small amount of malicious data cannot disproportional affect the model's output.

**Implement Data Provenance:** Data provenance allows you to track what data reduces the model's efficiency via metadata, helping in sorting out more overt manipulation and poisoning. You can also use Data provenance to comply with data protection regulations, such as GDPR and CCPA, since it provides a record of how data has been collected, processed, and stored.

**Implement Federated Learning Safeguards:** In federated learning environments, implement protocols that verify the integrity of updates from participants. Techniques like secure aggregation, where updates are aggregated in a way that prevents any single participant from significantly altering the model, can be effective.

**Regular Model and Data Audits:** Conducting regular audits of AI models, their environments, and their datasets, especially after updates or retraining sessions, can help identify a possible data poisoning attack.
