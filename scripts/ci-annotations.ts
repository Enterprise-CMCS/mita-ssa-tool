/**
 * Surfacing a failure where a maintainer actually sees it.
 *
 * On a GitHub runner a `console.error` line is buried inside a collapsed step — the one string a
 * maintainer needs (what broke, and how to fix it) is invisible until they open the job and expand
 * the step. A `::error::` workflow command renders as an annotation on the run summary and the
 * Files-changed view, and `$GITHUB_STEP_SUMMARY` renders as Markdown on the run page. These helpers
 * emit both when running in Actions and do nothing locally, so the scripts stay pleasant to run by
 * hand while failing loudly in CI (the stated point of this whole change).
 */

import { appendFileSync } from 'node:fs';
import process from 'node:process';

/** True when running inside GitHub Actions, where the annotation channels exist. */
function inGitHubActions(): boolean {
  return process.env.GITHUB_ACTIONS === 'true';
}

/**
 * A `::error::` workflow command, as a single line.
 *
 * Newlines are escaped to `%0A` per GitHub's workflow-command encoding — an unescaped newline would
 * truncate the annotation at the first line and the rest would print as plain log text.
 */
export function annotateError(message: string): void {
  if (!inGitHubActions()) {
    return;
  }
  const encoded = message.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  process.stdout.write(`::error::${encoded}\n`);
}

/** Append a Markdown block to the run's step summary, if the channel is present. */
export function appendStepSummary(markdown: string): void {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!inGitHubActions() || !path) {
    return;
  }
  appendFileSync(path, `${markdown}\n`);
}
