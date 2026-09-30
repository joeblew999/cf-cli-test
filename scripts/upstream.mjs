// Upstream issues our code works around: every `Upstream: <owner>/<repo>#<n> (when fixed: ...)` tag
// in the repo, with the issue's current state (via gh). A CLOSED issue means its workaround can go.
// Usage: node scripts/upstream.mjs   (mise run upstream:status)
import { execFileSync } from "node:child_process";

const grep = execFileSync("git", ["grep", "-n", "-E", "Upstream: [A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+#[0-9]+", "--", ":!*.md", ":!scripts/upstream.mjs"], { encoding: "utf8" });
const tags = new Map();
for (const line of grep.trim().split("\n").filter(Boolean)) {
  const [, file, lineNo, rest] = /^([^:]+):(\d+):(.*)$/.exec(line);
  const [, issue, note] = /Upstream: (\S+#\d+)\s*(?:\((.*)\))?/.exec(rest);
  if (!tags.has(issue)) tags.set(issue, []);
  tags.get(issue).push({ where: `${file}:${lineNo}`, note: note ?? "" });
}
let closed = 0;
for (const [issue, uses] of tags) {
  const [repo, n] = issue.split("#");
  let state = "?", title = "";
  try { [state, title] = execFileSync("gh", ["api", `repos/${repo}/issues/${n}`, "--jq", ".state + \"\\t\" + .title"], { encoding: "utf8" }).trim().split("\t"); }
  catch { state = "unreachable"; }
  if (state === "closed") closed++;
  console.log(`${state === "closed" ? "CLOSED" : state.toUpperCase()}  ${issue}  ${title}`);
  for (const u of uses) console.log(`        ${u.where}${u.note ? `  (${u.note})` : ""}`);
}
console.log(`\n${tags.size} upstream issues, ${closed} closed${closed ? ": remove those workarounds (see api/README.md)" : ""}`);
