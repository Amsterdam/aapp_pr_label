import * as core from '@actions/core'
import {loadConfig} from './utils/config'
import {main} from './utils/main'

const prLabel = async (): Promise<void> => {
  try {

    const config = await loadConfig()

    await main(config)
  } catch (e: unknown) {
    core.setFailed((e as Error).message)
    throw e
  }
}
prLabel()