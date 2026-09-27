/* Version B · /authors/$slug. Header object: a glass frame standing on the floor, the author's
   portrait set inside it and their name printed on the glass (a monogram when there is no
   photo). Body: their posts as ruled rows on one sheet. */
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { getAuthor } from "@/lib/authors";
import { getAllPosts } from "@/lib/blog-content";
import { FinalCta } from "@/site/FinalCta";
import { useSiteTheme } from "@/site/theme";
import { FOUNDERS, LEADERSHIP } from "../legacy/Team";
import type { AuthorProps } from "../types";
import { PostRow } from "./BlogIndex";
import { Page, PageHead, Split } from "./parts";

const PEOPLE = new Map([...FOUNDERS, ...LEADERSHIP].map((p) => [p.name, p]));

export function AuthorB({ slug }: AuthorProps) {
  const { theme } = useSiteTheme();
  const author = getAuthor(slug);
  if (!author) return null;
  const posts = getAllPosts().filter((p) => p.author === author.name);
  const person = PEOPLE.get(author.name);
  const frame = JSON.stringify({ name: author.name, photo: person?.photo ?? "", pos: person?.photoPosition ?? "" });
  return (
    <Page key={slug} className="pb-author">
      <PageHead
        compact
        scene="author"
        arg={frame}
        above={
          <Link to="/blog" className="pb-back">
            <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
            The blog
          </Link>
        }
        title={author.name}
        lead={author.bio}
      />

      {posts.length > 0 && (
        <Split
          sheet
          kicker="Writing"
          title={`Posts by ${author.name.split(" ")[0]}`}
          note={
            <p>
              {posts.length} {posts.length === 1 ? "post" : "posts"}
            </p>
          }
        >
          <ul className="pb-rows" role="list" data-reveal>
            {posts.map((p) => (
              <li key={p.slug}>
                <PostRow post={p} />
              </li>
            ))}
          </ul>
        </Split>
      )}

      <FinalCta theme={theme} />
    </Page>
  );
}
