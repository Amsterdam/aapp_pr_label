/* eslint-disable no-process-env */
import {execFileSync} from 'node:child_process'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {loadConfig} from './config'

jest.mock('@actions/core', () => ({
  getBooleanInput: jest.fn((inputName: string) => {
    const inputValue = process.env[`INPUT_${inputName.toUpperCase()}`]

    return inputValue?.toLowerCase() === 'true'
  }),
  getInput: jest.fn(
    (inputName: string) => process.env[`INPUT_${inputName.toUpperCase()}`] ?? '',
  ),
}), {virtual: true})

const originalArguments = [...process.argv]
const originalWorkingDirectory = process.cwd()
// oxlint-disable-next-line typescript/no-unsafe-assignment
const originalPrLabelConfig = process.env.PR_LABEL_CONFIG
const actionInputNames = [
  'code-reviewed-color',
  'code-reviewed-enabled',
  'code-reviewed-label',
  'copilot-logins',
  'copilot-ready-color',
  'copilot-ready-enabled',
  'copilot-ready-label',
  'labels',
  'pr-description-copilot-section-after',
  'pr-description-copilot-section-before',
  'pr-description-update-enabled',
  'reviewer-usernames',
] as const
const originalActionInputs = Object.fromEntries(
  actionInputNames.map(inputName => {
    const environmentVariableName = `INPUT_${inputName.toUpperCase()}`

    return [environmentVariableName, process.env[environmentVariableName]]
  }),
)
const temporaryDirectories: string[] = []
const configModuleUrl = pathToFileURL(
  path.join(originalWorkingDirectory, 'src/utils/config.ts'),
).href

const createTemporaryDirectory = (): string => {
  const temporaryDirectory = mkdtempSync(
    path.join(tmpdir(), 'pr-label-config-'),
  )

  temporaryDirectories.push(temporaryDirectory)

  return temporaryDirectory
}

const writeConfigFile = (
  temporaryDirectory: string,
  fileName: string,
  content: string,
): string => {
  const filePath = path.join(temporaryDirectory, fileName)

  writeFileSync(filePath, content)

  return filePath
}

const loadConfigFromDirectory = async ({
  actionInputs,
  argumentsOverride,
  prLabelConfig,
  workingDirectory,
}: {
  actionInputs?: Record<string, string>
  argumentsOverride?: string[]
  prLabelConfig?: string
  workingDirectory: string
}): Promise<Awaited<ReturnType<typeof loadConfig>>> => {
  process.chdir(workingDirectory)
  process.argv = argumentsOverride ?? [
    'node',
    'src/pr-label.ts',
  ]

  if (prLabelConfig === undefined) {
    delete process.env.PR_LABEL_CONFIG
  } else {
    process.env.PR_LABEL_CONFIG = prLabelConfig
  }

  for (const inputName of actionInputNames) {
    delete process.env[`INPUT_${inputName.toUpperCase()}`]
  }

  for (const [inputName, inputValue] of Object.entries(actionInputs ?? {})) {
    process.env[`INPUT_${inputName.toUpperCase()}`] = inputValue
  }

  return loadConfig()
}

const loadConfigInNodeProcess = ({
  actionInputs,
  argumentsOverride,
  prLabelConfig,
  workingDirectory,
}: {
  actionInputs?: Record<string, string>
  argumentsOverride?: string[]
  prLabelConfig?: string
  workingDirectory: string
}): Awaited<ReturnType<typeof loadConfig>> => {
  const environment = {...process.env}

  if (prLabelConfig === undefined) {
    delete environment.PR_LABEL_CONFIG
  } else {
    environment.PR_LABEL_CONFIG = prLabelConfig
  }

  for (const inputName of actionInputNames) {
    delete environment[`INPUT_${inputName.toUpperCase()}`]
  }

  for (const [inputName, inputValue] of Object.entries(actionInputs ?? {})) {
    environment[`INPUT_${inputName.toUpperCase()}`] = inputValue
  }

  const stdout = execFileSync(
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    'node',
    [
      '--experimental-strip-types',
      '--input-type=module',
      '--eval',
      `import {loadConfig} from ${JSON.stringify(configModuleUrl)}; const config = await loadConfig(); process.stdout.write(JSON.stringify(config));`,
      ...(argumentsOverride ?? []),
    ],
    {
      cwd: workingDirectory,
      encoding: 'utf8',
      env: environment,
    },
  )

  return JSON.parse(stdout) as Awaited<ReturnType<typeof loadConfig>>
}

describe('loadConfig', () => {
  afterEach(() => {
    process.argv = [...originalArguments]
    process.chdir(originalWorkingDirectory)

    if (originalPrLabelConfig === undefined) {
      delete process.env.PR_LABEL_CONFIG
    } else {
      // oxlint-disable-next-line typescript/no-unsafe-assignment
      process.env.PR_LABEL_CONFIG = originalPrLabelConfig
    }

    for (const [environmentVariableName, originalValue] of Object.entries(
      originalActionInputs,
    )) {
      if (originalValue === undefined) {
        delete process.env[environmentVariableName]
      } else {
        process.env[environmentVariableName] = originalValue
      }
    }

    for (const temporaryDirectory of temporaryDirectories.splice(0)) {
      rmSync(temporaryDirectory, {force: true, recursive: true})
    }
  })

  it('prefers the CLI config path over environment and discovered files', async () => {
    const temporaryDirectory = createTemporaryDirectory()

    writeConfigFile(
      temporaryDirectory,
      'pr-label.config.json',
      JSON.stringify({copilotReadyLabel: 'discovered'}),
    )
    writeConfigFile(
      temporaryDirectory,
      'environment.json',
      JSON.stringify({copilotReadyLabel: 'environment'}),
    )
    writeConfigFile(
      temporaryDirectory,
      'cli.json',
      JSON.stringify({copilotReadyLabel: 'cli'}),
    )

    const config = await loadConfigFromDirectory({
      workingDirectory: temporaryDirectory,
      prLabelConfig: 'environment.json',
      argumentsOverride: [
        'node',
        'src/pr-label.ts',
        '--config',
        'cli.json',
      ],
    })

    expect(config.copilotReadyLabel).toBe('cli')
  })

  it('prefers the environment config path over discovered files when no CLI flag is set', async () => {
    const temporaryDirectory = createTemporaryDirectory()

    writeConfigFile(
      temporaryDirectory,
      'pr-label.config.json',
      JSON.stringify({copilotReadyLabel: 'discovered'}),
    )
    writeConfigFile(
      temporaryDirectory,
      'environment.json',
      JSON.stringify({copilotReadyLabel: 'environment'}),
    )

    const config = await loadConfigFromDirectory({
      workingDirectory: temporaryDirectory,
      prLabelConfig: 'environment.json',
    })

    expect(config.copilotReadyLabel).toBe('environment')
  })

  it('uses the first discovered candidate path when no CLI flag or environment variable is set', async () => {
    const temporaryDirectory = createTemporaryDirectory()

    writeConfigFile(
      temporaryDirectory,
      '.pr-labelrc.json',
      JSON.stringify({copilotReadyLabel: 'secondary candidate'}),
    )
    writeConfigFile(
      temporaryDirectory,
      'pr-label.config.json',
      JSON.stringify({copilotReadyLabel: 'primary candidate'}),
    )

    const config = await loadConfigFromDirectory({
      workingDirectory: temporaryDirectory,
    })

    expect(config.copilotReadyLabel).toBe('primary candidate')
  })

  it('parses JSON config files and merges them with defaults', async () => {
    const temporaryDirectory = createTemporaryDirectory()

    writeConfigFile(
      temporaryDirectory,
      'pr-label.config.json',
      JSON.stringify({
        codeReviewedEnabled: false,
        reviewerUsernames: ['reviewer-one'],
      }),
    )

    const config = await loadConfigFromDirectory({
      workingDirectory: temporaryDirectory,
    })

    expect(config.codeReviewedEnabled).toBe(false)
    expect(config.reviewerUsernames).toEqual(['reviewer-one'])
    expect(config.copilotReadyEnabled).toBe(true)
    expect(config.codeReviewedLabel).toBe('Code reviewed')
    expect(config.labels['^android/']).toEqual({
      color: '#036d66',
      description: 'Android related',
      name: 'android',
    })
  })

  it('prefers action inputs over file config values', async () => {
    const temporaryDirectory = createTemporaryDirectory()

    writeConfigFile(
      temporaryDirectory,
      'pr-label.config.json',
      JSON.stringify({
        codeReviewedEnabled: false,
        copilotReadyLabel: 'from file',
      }),
    )

    const config = await loadConfigFromDirectory({
      workingDirectory: temporaryDirectory,
      actionInputs: {
        'code-reviewed-enabled': 'true',
        'copilot-ready-label': 'from input',
      },
    })

    expect(config.codeReviewedEnabled).toBe(true)
    expect(config.copilotReadyLabel).toBe('from input')
  })

  it('parses list and JSON action inputs', async () => {
    const temporaryDirectory = createTemporaryDirectory()

    const config = await loadConfigFromDirectory({
      workingDirectory: temporaryDirectory,
      actionInputs: {
        'copilot-logins': 'copilot-one, copilot-two\n copilot-three',
        labels: JSON.stringify({
          '^docs/': {
            color: '#ffffff',
            description: 'Documentation related',
            name: 'docs',
          },
        }),
        'reviewer-usernames': 'reviewer-one\nreviewer-two',
      },
    })

    expect(config.copilotLogins).toEqual([
      'copilot-one',
      'copilot-two',
      'copilot-three',
    ])
    expect(config.labels).toEqual({
      '^docs/': {
        color: '#ffffff',
        description: 'Documentation related',
        name: 'docs',
      },
    })
    expect(config.reviewerUsernames).toEqual([
      'reviewer-one',
      'reviewer-two',
    ])
  })

  it('parses YAML labels action input', async () => {
    const temporaryDirectory = createTemporaryDirectory()

    const config = await loadConfigFromDirectory({
      workingDirectory: temporaryDirectory,
      actionInputs: {
        labels: `'src/.*\\.ts':
  name: "src"
  color: "#ff0000"
'src/.*\\.test\\.ts':
  name: "test"
  color: "#00ff00"`,
      },
    })

    expect(config.labels).toEqual({
      'src/.*\\.ts': {
        color: '#ff0000',
        name: 'src',
      },
      'src/.*\\.test\\.ts': {
        color: '#00ff00',
        name: 'test',
      },
    })
  })

  it.each([
    {
      description: 'default export',
      fileContents:
        "export default {codeReviewedLabel: 'Default export label'}\n",
      expectedLabel: 'Default export label',
      fileName: 'config-default.mjs',
    },
    {
      description: 'named config export',
      fileContents:
        "export const config = {codeReviewedLabel: 'Named export label'}\n",
      expectedLabel: 'Named export label',
      fileName: 'config-named.mjs',
    },
  ])(
    'loads module configs from a $description',
    ({expectedLabel, fileContents, fileName}) => {
      const temporaryDirectory = createTemporaryDirectory()

      writeConfigFile(temporaryDirectory, fileName, fileContents)

      const config = loadConfigInNodeProcess({
        workingDirectory: temporaryDirectory,
        prLabelConfig: fileName,
      })

      expect(config.codeReviewedLabel).toBe(expectedLabel)
      expect(config.copilotReadyLabel).toBe('Copilot ready')
    },
  )

  it('returns the default config when no config file is present', async () => {
    const temporaryDirectory = createTemporaryDirectory()

    const config = await loadConfigFromDirectory({
      workingDirectory: temporaryDirectory,
    })

    expect(config).toMatchObject({
      codeReviewedColor: '#99f490',
      codeReviewedEnabled: true,
      codeReviewedLabel: 'Code reviewed',
      copilotReadyColor: '#05b103',
      copilotReadyEnabled: true,
      copilotReadyLabel: 'Copilot ready',
      prDescriptionCopilotSectionAfter: '## Test instructions',
      prDescriptionCopilotSectionBefore: '# Changes',
      prDescriptionUpdateEnabled: true,
      reviewerUsernames: [],
    })
    expect(config.copilotLogins).toEqual(['github-copilot[bot]'])
    expect(config.labels['^ios/(?!Podfile.lock$)']).toEqual({
      color: '#036d66',
      description: 'iOS related',
      name: 'ios',
    })
  })
})
