import {DETAILS_CLOSE_TAG, DETAILS_OPEN_TAG} from './constants'

export const sanitizeCopilotReviewBody = (reviewBody: string): string => {
  const reviewLines = reviewBody.replaceAll('\r\n', '\n').split('\n')
  const overviewSummaryTag = '<summary>Pull request overview</summary>'
  const overviewStartLineIndex = reviewLines.findIndex(
    line => line.trim().toLowerCase() === overviewSummaryTag.toLowerCase(),
  )

  if (overviewStartLineIndex === -1) {
    return ''
  }

  const sanitizedLines: string[] = []

  for (const line of reviewLines.slice(overviewStartLineIndex + 1)) {
    const trimmedLine = line.trim()

    if (trimmedLine === DETAILS_CLOSE_TAG) {
      break
    }

    if (trimmedLine !== DETAILS_OPEN_TAG) {
      sanitizedLines.push(line)
    }
  }

  return sanitizedLines.join('\n').trim()
}
