// Says whether a build-plan task can start: every task in its "Depends on:" line must be merged
// into the branch this task targets. Also lists tasks other sessions are working on (B-18).
// Usage: node scripts/task-ready.ts B-06     exit 0 = ready, 1 = blocked or unknown task, 2 = usage error
//        node scripts/task-ready.ts --hook   SessionStart hook: reads the task from the branch name

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

type Task = { id: string; title: string; deps: string[]; target: string | null; dependsText: string };
type MergedPr = { number: number; title: string; baseRefName: string; mergeCommit: { oid: string } | null };
type OpenPr = { number: number; title: string; headRefName: string; isDraft: boolean; files: { path: string }[] };

const PLAN_DIR = join(process.cwd(), "docs/build-plan");
const TASK_ID = /^B-\d{2}$/;

function run(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function pad(n: number) {
  return `B-${String(n).padStart(2, "0")}`;
}

function readPlan(): Map<string, Task> {
  const tasks = new Map<string, Task>();
  const files = readdirSync(PLAN_DIR).filter((f) => /^\d\d-.*\.md$/.test(f)).sort();
  for (const file of files) {
    let current: Task | null = null;
    for (const line of readFileSync(join(PLAN_DIR, file), "utf8").split("\n")) {
      const heading = line.match(/^### (B-\d{2}) (.*)$/);
      if (heading) {
        current = { id: heading[1], title: heading[2].trim(), deps: [], target: null, dependsText: "" };
        tasks.set(current.id, current);
        continue;
      }
      const depends = line.match(/Depends on: ([^·]*)/);
      if (!current || !depends) continue;
      current.dependsText = depends[1].trim();
      const branch = line.match(/→ `([^`]+)`/);
      current.target = branch ? branch[1] : null;
      current.deps = parseDeps(current.dependsText);
    }
  }
  // "all build tasks" (B-80) means every task except the ones that come after go-live.
  for (const task of tasks.values()) {
    if (task.dependsText.startsWith("all build tasks")) {
      const extra = task.deps;
      task.deps = [...tasks.keys()].filter((id) => id !== task.id && id !== "B-83").concat(extra);
      task.deps = [...new Set(task.deps)];
    }
  }
  return tasks;
}

function parseDeps(text: string): string[] {
  const ids = new Set<string>();
  for (const m of text.matchAll(/B-(\d+)(?: to B-(\d+))?/g)) {
    const from = Number(m[1]);
    const to = m[2] ? Number(m[2]) : from;
    for (let n = from; n <= to; n++) ids.add(pad(n));
  }
  return [...ids];
}

function mergedPrs(): MergedPr[] {
  const json = run("gh", ["pr", "list", "--state", "merged", "--limit", "500", "--json", "number,title,baseRefName,mergeCommit"]);
  return JSON.parse(json) as MergedPr[];
}

function openPrs(): OpenPr[] {
  const json = run("gh", ["pr", "list", "--state", "open", "--limit", "100", "--json", "number,title,headRefName,isDraft,files"]);
  return JSON.parse(json) as OpenPr[];
}

function isInBranch(commit: string, branch: string): boolean {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", commit, `origin/${branch}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function prTask(title: string): string | null {
  const m = title.match(/^(B-\d{2})\b/);
  return m ? m[1] : null;
}

function check(taskId: string): { ready: boolean; lines: string[] } {
  const tasks = readPlan();
  const task = tasks.get(taskId);
  if (!task) return { ready: false, lines: [`${taskId} is not in docs/build-plan. Check the ID.`] };

  const target = task.target ?? "main";
  const lines = [`${task.id} ${task.title} (target: ${target}, depends on: ${task.dependsText || "nothing"})`];
  run("git", ["fetch", "--quiet", "origin", "main", "mvp"]);

  const merged = mergedPrs();
  const missing: string[] = [];
  for (const dep of task.deps.filter((id) => tasks.has(id))) {
    const prs = merged.filter((pr) => prTask(pr.title) === dep && pr.mergeCommit);
    const inTarget = prs.find((pr) => isInBranch(pr.mergeCommit!.oid, target));
    if (inTarget) {
      lines.push(`  ok       ${dep} merged in #${inTarget.number}, present in ${target}`);
    } else if (prs.length > 0) {
      missing.push(dep);
      lines.push(`  BLOCKED  ${dep} merged in #${prs[0].number} into ${prs[0].baseRefName}, but not yet in ${target} (sync ${prs[0].baseRefName} into ${target})`);
    } else if (dep === "B-01") {
      // B-01 is key rotation with no PR; only B-80 depends on it.
      missing.push(dep);
      lines.push(`  BLOCKED  B-01 has no PR; confirm keys are rotated and tick it in 01-setup.md`);
    } else {
      missing.push(dep);
      lines.push(`  BLOCKED  ${dep} ${tasks.get(dep)!.title} is not merged`);
    }
  }

  const open = openPrs().filter((pr) => prTask(pr.title) || pr.headRefName.startsWith("task/"));
  const sameTask = open.filter((pr) => prTask(pr.title) === taskId || pr.headRefName.startsWith(`task/${taskId}-`));
  for (const pr of sameTask) lines.push(`  WARNING  ${taskId} already has open PR #${pr.number} (${pr.headRefName}); another session may own it`);

  const others = open.filter((pr) => !sameTask.includes(pr));
  if (others.length > 0) {
    const mine = changedFiles(target);
    lines.push("  In progress elsewhere:");
    for (const pr of others) {
      const overlap = pr.files.map((f) => f.path).filter((p) => mine.has(p));
      const note = overlap.length ? `, touches the same files: ${overlap.slice(0, 5).join(", ")}` : "";
      lines.push(`    #${pr.number} ${pr.title}${pr.isDraft ? " (draft)" : ""}${note}`);
    }
  }

  lines.push(missing.length === 0 ? `READY: ${taskId} can start.` : `NOT READY: wait for ${missing.join(", ")}. Do not build their work here.`);
  return { ready: missing.length === 0, lines };
}

function changedFiles(target: string): Set<string> {
  try {
    return new Set(run("git", ["diff", "--name-only", `origin/${target}...HEAD`]).split("\n").filter(Boolean));
  } catch {
    return new Set();
  }
}

function currentBranchTask(): string | null {
  try {
    const m = run("git", ["branch", "--show-current"]).match(/^task\/(B-\d{2})-/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function hook() {
  const taskId = currentBranchTask();
  if (!taskId) return;
  let context: string;
  try {
    const { ready, lines } = check(taskId);
    const rule = ready ? "" : "\nDo not start this task. Tell the user what the check reported.";
    context = `Task readiness check (scripts/task-ready.ts):\n${lines.join("\n")}${rule}`;
  } catch (err) {
    context = `Task readiness check could not run (${(err as Error).message.split("\n")[0]}). Run \`npm run task:ready ${taskId}\` before starting.`;
  }
  // JSON.stringify so the hook output is always valid JSON.
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context } }));
}

const arg = process.argv[2];
if (arg === "--hook") {
  hook();
} else if (arg && TASK_ID.test(arg)) {
  const { ready, lines } = check(arg);
  console.log(lines.join("\n"));
  process.exit(ready ? 0 : 1);
} else {
  console.error("Usage: node scripts/task-ready.ts B-xx | --hook");
  process.exit(2);
}
