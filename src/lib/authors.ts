export type Author = {
  slug: string;
  name: string;
  role?: string;
  bio: string;
  sameAs?: string[];
};

// Real, named contributors only. Posts credited to "Blindsight team" stay
// attributed to the Organization in schema — no page is created for them.
export const AUTHORS: Author[] = [
  {
    slug: "guilherme-santos",
    name: "Guilherme Santos",
    role: "Chief Executive Officer, Blindsight",
    bio: "Guilherme Santos is Chief Executive Officer at Blindsight. He writes on the attack classes Blindsight's runtime security platform is built to catch, including prompt injection and data poisoning.",
  },
  {
    slug: "filipe-azevedo",
    name: "Filipe Azevedo",
    bio: "Filipe Azevedo is a contributor at Blindsight, writing on AI misalignment, reward hacking, and interpretability.",
  },
  {
    slug: "filipa-barros",
    name: "Filipa Barros",
    bio: "Filipa Barros is a contributor at Blindsight. She wrote the opening primer in Blindsight's AI security series, mapping how AI models are compromised and what to do about it.",
  },
];

export function getAuthor(slug: string): Author | undefined {
  return AUTHORS.find((a) => a.slug === slug);
}

export function authorSlugFor(name: string): string | undefined {
  return AUTHORS.find((a) => a.name === name)?.slug;
}
