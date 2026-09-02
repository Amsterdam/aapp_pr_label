import * as core from '@actions/core'

import {addLabels} from './addLabels.js'
import {checkCodeReviewed} from './checkCodeReviewed.js'
import {checkCopilotReady} from './checkCopilotReady.js'
import {getChangedFiles} from './getChangedFiles.js'
import {getLabelsAlreadyOnPullRequest} from './getLabelsAlreadyOnPullRequest.js'
import {getPullRequestNumber} from './getPullRequestNumber.js'
import {getReviews} from './getReviews.js'
import {getTouchedFilesLabels} from './getTouchedFilesLabels.js'
import {isCopilotLogin} from './isCopilotLogin.mjs'
import {updatePRText} from './updatePRText'
import type {PackageConfig} from './config'

export const main = async (config: Required<PackageConfig>) => {
  const pullNumber = getPullRequestNumber()
  const changedFiles = await getChangedFiles(pullNumber)

  const alreadyOnPr = await getLabelsAlreadyOnPullRequest(pullNumber)

  core.info(`Changed files: ${changedFiles.join(', ')}`)

  const touchFilesLabels = getTouchedFilesLabels(changedFiles, config)

  await addLabels(
    pullNumber,
    touchFilesLabels.filter(label => !alreadyOnPr.has(label.name)),
  )

  const reviews = await getReviews(pullNumber)
  const firstCopilotReview = reviews.find(review =>
    isCopilotLogin(review.user?.login, config),
  )

  await updatePRText(pullNumber, firstCopilotReview, config)

  await checkCopilotReady(firstCopilotReview, pullNumber, alreadyOnPr, config)
  await checkCodeReviewed(reviews, pullNumber, alreadyOnPr, config)
}
