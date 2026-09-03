import * as core from '@actions/core'

import {addLabels} from './addLabels'
import {checkCodeReviewed} from './checkCodeReviewed'
import {checkCopilotReady} from './checkCopilotReady'
import {getChangedFiles} from './getChangedFiles'
import {getLabelsAlreadyOnPullRequest} from './getLabelsAlreadyOnPullRequest'
import {getPullRequestNumber} from './getPullRequestNumber'
import {getReviews} from './getReviews'
import {getTouchedFilesLabels} from './getTouchedFilesLabels'
import {isCopilotLogin} from './isCopilotLogin'
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
