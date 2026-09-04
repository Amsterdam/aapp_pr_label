import {
  DETAILS_CLOSE_TAG,
  DETAILS_OPEN_TAG,
  FILE_SUMMARIES_SUMMARY_TAG,
  PULL_REQUEST_OVERVIEW_SUMMARY_TAG,
} from './constants'

const getSectionContent = (
  reviewLines: string[],
  summaryTag: string,
): string => {
  const sectionStartLineIndex = reviewLines.findIndex(
    line => line.trim().toLowerCase() === summaryTag.toLowerCase(),
  )

  if (sectionStartLineIndex === -1) {
    return ''
  }

  const sanitizedLines: string[] = []

  for (const line of reviewLines.slice(sectionStartLineIndex + 1)) {
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

export const sanitizeCopilotReviewBody = (reviewBody: string): string => {
  const reviewLines = reviewBody.replaceAll('\r\n', '\n').split('\n')
  const overviewContent = getSectionContent(
    reviewLines,
    PULL_REQUEST_OVERVIEW_SUMMARY_TAG,
  )

  const fileSummariesContent = getSectionContent(
    reviewLines,
    FILE_SUMMARIES_SUMMARY_TAG,
  )

  return [
    overviewContent,
    fileSummariesContent &&
      `${DETAILS_OPEN_TAG}\n${FILE_SUMMARIES_SUMMARY_TAG}\n\n${fileSummariesContent}\n${DETAILS_CLOSE_TAG}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}
