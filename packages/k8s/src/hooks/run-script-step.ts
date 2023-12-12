/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fs from 'fs'
import { RunScriptStepArgs } from 'hooklib'
import { execPodStep } from '../k8s'
import { writeEntryPointScript } from '../k8s/utils'
import { JOB_CONTAINER_NAME } from './constants'
import * as core from '@actions/core'

export async function runScriptStep(
  args: RunScriptStepArgs,
  state,
  responseFile
): Promise<void> {
  const { entryPoint, entryPointArgs, environmentVariables } = args
  const { containerPath, runnerPath } = writeEntryPointScript(
    args.workingDirectory,
    entryPoint,
    entryPointArgs,
    args.prependPath,
    environmentVariables
  )
  core.debug(`containerPath=${containerPath};runnerPath=${runnerPath}`)

  // print files under /home/runner/_work/_temp/
  const files = fs.readdirSync('/home/runner/_work/_temp/')
  core.debug(`files under /home/runner/_work/_temp/: ${files}`)

  core.debug(`ls 1 start`)
  await execPodStep(
    [
      'sh',
      '-c',
      `'ls -alh /home/runner/_work/_temp/ || exit 1'`
    ],
    state.jobPod,
    JOB_CONTAINER_NAME
  )

  core.debug(`ls 2 start`)
  await execPodStep(
    [
      'sh',
      '-c',
      `'ls -alh /__w/_temp/ || exit 1'`
    ],
    state.jobPod,
    JOB_CONTAINER_NAME
  )

  args.entryPoint = 'sh'
  args.entryPointArgs = ['-ex', containerPath]
  try {
    await new Promise(f => setTimeout(f, 60000))
    await execPodStep(
      [args.entryPoint, ...args.entryPointArgs],
      state.jobPod,
      JOB_CONTAINER_NAME
    )
  } catch (err) {
    await new Promise(f => setTimeout(f, 60000))
    throw new Error(`failed to run script step: ${err}`)
  } finally {
    fs.rmSync(runnerPath)
  }
}
