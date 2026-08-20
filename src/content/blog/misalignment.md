---
title: "Misalignment"
slug: misalignment
category: "Threat primer"
date: "2026-05-22"
read: "9 min"
author: "Filipe Azevedo"
excerpt: "What happens when an AI gets very good at the wrong thing. A primer on misalignment, reward hacking, and interpretability."
references:
  - label: "Misalignment in AI Systems (arXiv)"
    href: "https://arxiv.org/abs/2310.19852"
  - label: "Interpretable Machine Learning - Molnar"
    href: "https://originalstatic.aminer.cn/misc/pdf/Molnar-interpretable-machine-learning_compressed.pdf"
  - label: "Interpretable Machine Learning Book (Molnar)"
    href: "https://christophm.github.io/interpretable-ml-book/"
  - label: "Reward Hacking and Specification Gaming (arXiv)"
    href: "https://arxiv.org/abs/2209.13085"
  - label: "In 2016, Microsoft's Racist Chatbot Revealed the Dangers of Online Conversation (IEEE Spectrum)"
    href: "https://spectrum.ieee.org/in-2016-microsofts-racist-chatbot-revealed-the-dangers-of-online-conversation"
  - label: "Adversarial Machine Learning: A Taxonomy and Terminology of Attacks and Mitigations"
    href: "https://csrc.nist.gov/pubs/ai/100/2/e2023/final"
---

The fear of an evil AI with world domination on its agenda is fascinating but the real risks can have a more deceptive form: unintended consequences arising from the way they work. As Artificial Intelligence becomes more complex, the risks of misalignment grow and it becomes increasingly difficult for humans to fully understand them. A pertinent question arises: how do we make sure AI stays on our side?

The biggest challenge of creating artificial intelligence is making sure they are aligned with their creators, not just in achieving the same goals, but also in ensuring it shares the same values and intentions in how it achieves those goals.

It's not enough for AI to simply meet its objectives; it must do so in a way that aligns with the ethical and moral considerations of those who created it. As AI grows more sophisticated and its capabilities expand, the risks associated with misalignment become more pronounced. The complexity associated with these systems can make it increasingly difficult for humans to understand their decision-making processes and, consequently, to mitigate potential negative outcomes.

## Example - Misalignment boundaries

If you ask a misaligned AI to create content that generates the highest level of engagement for your social media like Instagram, one of the solutions it might come up with is to produce highly controversial content. While this would certainly attract attention, it could spread fake news and turn your feed into a mess and get you cancelled.

Or, picture this: you task a misaligned AI with ending world hunger. Instead of improving food distribution, it might suggest something drastic like cutting the population in half to reduce demand. Not exactly the solution we were expecting.

## Example - Reward hacking

An AI was trained to play Coast Runners, which is a boat racing game where players control a boat to navigate through a path collecting points and try to complete the race quickly. The model discovered that continuously rotating the boat in circles to collect points was more effective at maximizing its score than actually completing the race.

This type of behavior occurs due to the fact that optimization is blind and purely logical, which means it can exploit loopholes in the reward system, is what we call Reward Hacking.

## But why would an AI turn on us?

In Reinforcement Learning (RL), an agent learns to make decisions by interacting with the environment and receiving rewards (or penalties). The objective is to learn the optimal decisions that maximize the cumulative reward. But the optimal decision might not be what we expect:

A well known example of this is the case of Microsofts AI chatbot, Tay. Tay was designed to learn from interactions with users on Twitter and adjust its behavior based on the feedback it received. However, within hours, Tay began posting offensive and racist tweets. This behavior emerged because Tay's RL algorithm was effectively maximizing immediate user engagement and feedback. The highest rewarded decision doesn't always equal the best one.

For more details on the Tay incident, you can read the full article on IEEE Spectrum: [In 2016, Microsoft's Racist Chatbot Revealed the Dangers of Online Conversation](https://spectrum.ieee.org/in-2016-microsofts-racist-chatbot-revealed-the-dangers-of-online-conversation).

In Supervised Learning, the model is trained on a labeled dataset, where each input is paired with the label. The model learns to map inputs to outputs by minimizing the difference between its predictions and the actual labels using a loss function. But what If the training data contains biases? the model will learn and potentially amplify those biases. For example, if an AI model trained on a biased dataset is used to do a pre analysis on CVs, it can eliminate candidates based on their race or gender.

So techniques like model interpretability are crucial to help us understand whats behind the decision making processes of AI models and react accordingly to mitigate them.

## Mitigations

Looking for alignment is not a one time task but an evolving process, and with artificial Intelligence models getting more advanced every day, keeping them aligned will be getting more difficult as they grow in complexity.

**Define Explicit Goals:** Setting clear and explicit goals is the key to preventing misalignment in AI models. These goals need to take into account the ethical, social, and safety aspects of the environment where the AI will work.

Each of the following techniques offers a different approach to interpreting models, from understanding the global impact of features to analyzing local effects and explaining specific, individual predictions:

**Interpretability:** Applying methods to increase the interpretability of AI systems is crucial. This allows developers and users to better understand how the AI reaches its conclusions, making it easier to spot potential misalignments early on.

**Model Interpretation Methods:** You could rely only on straightforward and easy to understand models like Linear Regression, Logistic Regression, Decision Trees, etc, but you would miss superior and complex techniques that for your specific use case could produce better results.

**Partial Dependence Plot (PDP):** PDP shows the effect one or two features have on the predicted outcome of a machine learning model. A partial dependence plot can show the relationship between the target and a feature, independent of the remaining weights.

**Accumulated Local Effects (ALE):** ALE calculates the effect of a feature within small ranges, instead of globally like PDP. For each range, it measures how much the model's prediction changes as the feature value moves within that range, keeping the other features constant.

**Local Surrogated (LIME):** LIME was designed to explain individual predictions of any machine learning model by approximating it locally with an interpretable model. This local model works as an approximation of the complex model around the specific feature.

Consider a model that predicts house prices based on multiple features like square meters, number of bedrooms, number of bathrooms and number of doors. This not only allows you to detect possible ridiculous behaviors from the model, like the more doors the higher price even with the same square footage, but can also help detect more subtle behaviors. PDP revealed if the house prices increase with square footage, which aligns with our expectations. ALE provided a more nuanced and real view, showing that after a size, the tendency of increasing would diminish. LIME provided a detailed explanation for a specific prediction, showing that a particular house had their price more related to the number of doors than the square footage.

The causes of deviations like these can go from data issues, like biased data in the dataset, to model issues, caused by overfitting per example.
