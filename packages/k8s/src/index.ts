import * as core from '@actions/core'
import { Command, getInputFromStdin, prepareJobArgs } from 'hooklib'
import {
  cleanupJob,
  prepareJob,
  runContainerStep,
  runScriptStep
} from './hooks'
import { isAuthPermissionsOK, requiredPermissions } from './k8s'
import { namespace } from './k8s/utils'

async function run(): Promise<void> {
  try {
    const input = await getInputFromStdin()

    const args = input['args']
    const command = input['command']
    const responseFile = input['responseFile']
    const state = input['state']
    if (!(await isAuthPermissionsOK())) {
      throw new Error(
        `The Service account needs the following permissions ${JSON.stringify(
          requiredPermissions
        )} on the pod resource in the '${namespace()}' namespace. Please contact your self hosted runner administrator.`
      )
    }

    core.debug(`input: ${JSON.stringify(input)}`)
    core.debug(`args: ${JSON.stringify(args)}`)
    core.debug(`command: ${JSON.stringify(command)}`)

    let exitCode = 0
    switch (command) {
      case Command.PrepareJob:
        await prepareJob(args as prepareJobArgs, responseFile)
        return process.exit(0)
      case Command.CleanupJob:
        await cleanupJob()
        return process.exit(0)
      case Command.RunScriptStep:
        core.debug(`!!! [0]`)
        await runScriptStep(args, state, null)
        return process.exit(0)
      case Command.RunContainerStep:
        exitCode = await runContainerStep(args)
        return process.exit(exitCode)
      default:
        throw new Error(`Command not recognized: ${command}`)
    }
  } catch (error) {
    core.error(error as Error)
    process.exit(1)
  }
}

void run()
