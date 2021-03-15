import * as core from '@actions/core'
import {getOctokit, context} from '@actions/github'
import {Endpoints} from '@octokit/types'
import {GitHub} from '@actions/github/lib/utils'

type checksListForRefResponseType = Endpoints['GET /repos/{owner}/{repo}/commits/{ref}/check-runs']['response']
type checkRunsType = Endpoints['GET /repos/{owner}/{repo}/commits/{ref}/check-runs']['response']['data']['check_runs']

function getOctokitClient(): InstanceType<typeof GitHub> {
  const token = process.env.GITHUB_TOKEN

  if (!token) {
    throw new Error(`GITHUB_TOKEN not found in environment variables`)
  }

  return getOctokit(token)
}

async function getCheckRuns(
  octokit: InstanceType<typeof GitHub>
): Promise<checksListForRefResponseType> {
  return octokit.checks.listForRef({
    owner: context.repo.owner,
    repo: context.repo.repo,
    ref: context.sha
  })
}

function findNonSuccessfulCheckRuns(
  res: checksListForRefResponseType,
  ignoreChecks: string[]
): checkRunsType | undefined {
  const checkRuns = res.data.check_runs
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

  return nonSuccessfulRuns
}

function areTherePendingCheckRuns(
  nameOfThisCheck: string,
  res: checksListForRefResponseType
): boolean {
  const pendingRuns = res.data.check_runs.find(
    checkRun =>
      checkRun.name !== nameOfThisCheck && checkRun.status !== 'completed'
  )

  if (pendingRuns) {
    core.info(`Found pending run: ${pendingRuns.name}`)
    return true
  }

  return false
}

async function run(): Promise<void> {
  try {
    const nameOfThisCheck: string = core.getInput('name', {required: true})
    const ignoreChecksString: string = core.getInput('ignore_checks')
    const ignoreChecks: string[] = JSON.parse(ignoreChecksString)
    core.debug(`Will ignore checks: ${ignoreChecksString}`)

    const octokit = getOctokitClient()
    const checkRunsResponse = await getCheckRuns(octokit)

    const someChecksArePending = areTherePendingCheckRuns(
      nameOfThisCheck,
      checkRunsResponse
    )

    if (someChecksArePending) {
      core.warning('Some checks are still pending')
      return
    }

    const nonSuccessfulRuns = findNonSuccessfulCheckRuns(
      checkRunsResponse,
      ignoreChecks
    )

    if (!nonSuccessfulRuns || nonSuccessfulRuns.length === 0) {
      core.info('All checks passed')
      return
    }

    for (const nonSuccessfulRun of nonSuccessfulRuns) {
      core.warning(
        `${nonSuccessfulRun.name} failed to pass with conclusion ${nonSuccessfulRun.conclusion}`
      )
    }
    core.setFailed(`Some checks failed`)
    return
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
