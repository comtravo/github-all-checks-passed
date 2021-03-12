import * as core from '@actions/core'
import {getOctokit, context} from '@actions/github'
import {GitHub} from '@actions/github/lib/utils'

function getOctokitClient(): InstanceType<typeof GitHub> {
  const token = process.env.GITHUB_TOKEN

  if (!token) {
    throw new Error(`GITHUB_TOKEN not found in environment variables`)
  }

  return getOctokit(token)
}

async function getCheckRuns(octokit: InstanceType<typeof GitHub>) {
  return octokit.checks.listForRef({
    owner: context.repo.owner,
    repo: context.repo.repo,
    ref: context.sha
  })
}

async function run(): Promise<void> {
  try {
    const ignoreChecksString: string = core.getInput('ignore_checks')
    const ignoreChecks: string[] = JSON.parse(ignoreChecksString)
    core.debug(`Will ignore checks: ${ignoreChecksString}`)

    const octokit = getOctokitClient()
    const {data: data} = await getCheckRuns(octokit)
    const checkRuns = data.check_runs

    if (checkRuns.length === 0) {
      core.info(
        `No check runs found for ${context.repo.owner}/${context.repo.repo} and sha: ${context.sha}`
      )
      return
    }

    core.info(`Found ${checkRuns.length} runs`)

    const nonSuccessfulRuns = checkRuns.filter(
      checkRun =>
        checkRun.status === 'completed' &&
        !['success', 'neutral'].includes(checkRun.conclusion) &&
        !ignoreChecks.includes(checkRun.name)
    )

    if (nonSuccessfulRuns.length === 0) {
      core.info('All checks passed')
      return
    }

    for (const nonSuccessfulRun of nonSuccessfulRuns) {
      core.warning(
        `${nonSuccessfulRun.name} failed to pass with conclusion ${nonSuccessfulRun.conclusion}`
      )
    }
    core.setFailed(`Some checks failed`)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
