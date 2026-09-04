import {sanitizeCopilotReviewBody} from './sanitizeCopilotReviewBody'

describe('sanitizeCopilotReviewBody', () => {
  it('returns the Pull request overview and File summaries section contents', () => {
    const reviewBody = `### 🟡 Changes recommended

This pull request still needs a couple of follow-up changes before it is ready.

*Once you've addressed the issues Copilot identified, you can request another Copilot review.*

<details>
<summary>Pull request overview</summary>

Introduces a sample feature flag flow and updates supporting documentation for the example project.

**Changes:**
- Add a mock service configuration file used by the example integration tests.
- Update the sample docs to describe the new feature flag behavior.
</details>

<details>
<summary>File summaries</summary>

| File | Description |
| ---- | ----------- |
| src/example-feature.ts | Adds placeholder feature flag handling for test data. |
| docs/example-feature.md | Documents the sample feature flow. |
</details>

<details>
<summary>Review details</summary>

### Suppressed comments (1)

**src/example-feature.ts:12**
* This placeholder branch does not exercise the fallback path yet. Consider adding a mock case that covers it.
\`\`\`
if (featureEnabled) {
  return primaryValue
}
\`\`\`

- **Files reviewed:** 2/2 changed files
- **Comments generated:** 1
- **Review effort level:** Lite
</details>

---

💡 <a href="/example-org/example-repo/new/main?filename=.github/skills/code-review/SKILL.md" class="Link--inTextBlock" target="_blank" rel="noopener noreferrer">Add a \`code-review\` agent skill</a> or configure MCP servers for context-aware, tailored reviews. <a href="https://docs.github.com/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review?tool=webui#mcp-servers-and-agent-skills" class="Link--inTextBlock" target="_blank" rel="noopener noreferrer">Learn more in the docs.</a>`

    expect(sanitizeCopilotReviewBody(reviewBody))
      .toBe(`Introduces a sample feature flag flow and updates supporting documentation for the example project.

**Changes:**
- Add a mock service configuration file used by the example integration tests.
- Update the sample docs to describe the new feature flag behavior.

<details>
<summary>File summaries</summary>

| File | Description |
| ---- | ----------- |
| src/example-feature.ts | Adds placeholder feature flag handling for test data. |
| docs/example-feature.md | Documents the sample feature flow. |
</details>`)
  })

  it('returns an empty string when the Pull request overview section is missing', () => {
    expect(
      sanitizeCopilotReviewBody(`### 🟡 Changes recommended

<details>
<summary>File summaries</summary>

Only file summaries are present.
</details>`),
    ).toBe(`<details>
<summary>File summaries</summary>

Only file summaries are present.
</details>`)
  })
})
