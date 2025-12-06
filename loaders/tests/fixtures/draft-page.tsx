import type { JSX } from "preact";

export const frontmatter = {
  title: "Draft Page",
  draft: true,
};

export default function DraftPage(): JSX.Element {
  return <h1>Draft Page</h1>;
}
