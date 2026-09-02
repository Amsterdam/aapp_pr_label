import * as core from '@actions/core'
import * as github from '@actions/github'

const GITHUB_TOKEN = core.getInput('token', {required: true})
if (!GITHUB_TOKEN) {
  core.setFailed(
    'The github token is not set, you could pass it via the token input or set the GITHUB_TOKEN environment variable.',
  )
  process.exit(1)
}

export const octokit = github.getOctokit(GITHUB_TOKEN)
export const context = github.context
