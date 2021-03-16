import {APIGatewayProxyEventV2, APIGatewayProxyResultV2} from 'aws-lambda'
import {CheckSuiteEvent} from '@octokit/webhooks-definitions/schema'
import * as crypto from 'crypto'
import {Octokit} from '@octokit/rest'
import {Endpoints} from '@octokit/types'
import pino from 'pino'

const log = pino()

type ListChecksForRefCheckRuns = Endpoints['GET /repos/{owner}/{repo}/commits/{ref}/check-runs']['response']['data']['check_runs']
type CreateCommitStatusResponse = Endpoints['POST /repos/{owner}/{repo}/statuses/{sha}']['response']

function validateGithubWebhookPayload(event: APIGatewayProxyEventV2): void {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  const sig = event.headers['X-Hub-Signature']
  const githubEvent = event.headers['X-GitHub-Event']
  const id = event.headers['X-GitHub-Delivery']

  if (!secret || !sig || !githubEvent || !id) {
    throw new Error(`Invalid payload: ${JSON.stringify(event)}`)
  }

  if (!event.body || event.body === '') {
    throw new Error(`Cannot find event body: ${JSON.stringify(event)}`)
  }

  const calculatedSignature = crypto
    .createHmac('sha1', secret)
    .update(event.body, 'utf-8')
    .digest('hex')

  if (sig !== `sha1=${calculatedSignature}`) {
    throw new Error(
      `Signatures did not match. Webhook signature: ${sig} and calculated: ${calculatedSignature}`
    )
  }
}

function apiGatewayResponse(
  statusCode: number,
  body: string
): APIGatewayProxyResultV2 {
  const logMessage = `status code: ${statusCode}, body: ${body}`
  if (statusCode > 399) {
    log.error(logMessage)
  } else {
    log.info(logMessage)
  }
  return {
    statusCode,
    body,
    headers: {
      'Content-Type': 'text/plain'
    }
  }
}

function processEvent(event: CheckSuiteEvent): boolean {
  return (
    event.action === 'completed' &&
    event.check_suite.conclusion !== null &&
    ['success', 'neutral'].includes(event.check_suite.conclusion)
  )
}

function getOctokit(): InstanceType<typeof Octokit> {
  const token = process.env.GITHUB_TOKEN

  if (!token) {
    throw new Error('GITHUB_TOKEN cannot be found in environment variables')
  }

  return new Octokit({auth: token})
}

function getOwnerRepoSha(
  event: CheckSuiteEvent
): {
  owner: string
  repo: string
  sha: string
} {
  if (!event.repository.owner.name) {
    throw new Error(
      `Unable to determine owner for repor: ${JSON.stringify(event.repository)}`
    )
  }
  return {
    owner: event.repository.owner.name,
    repo: event.repository.name,
    sha: event.check_suite.head_sha
  }
}

function findPendingChecks(
  allChecks: ListChecksForRefCheckRuns,
  ignoreChecks: string[]
): ListChecksForRefCheckRuns {
  return allChecks.filter(
    check => !ignoreChecks.includes(check.name) && check.status !== 'completed'
  )
}

function findFailedChecks(
  allChecks: ListChecksForRefCheckRuns,
  ignoreChecks: string[]
): ListChecksForRefCheckRuns {
  return allChecks.filter(
    check =>
      !ignoreChecks.includes(check.name) &&
      check.status === 'completed' &&
      check.conclusion !== 'success'
  )
}

async function setCommitStatusForSha(
  owner: string,
  repo: string,
  sha: string,
  state: 'success' | 'failure' | 'error' | 'pending',
  octokit: InstanceType<typeof Octokit>
): Promise<CreateCommitStatusResponse> {
  const statusName = 'all-checks-passed'

  return octokit.repos.createCommitStatus({
    owner,
    repo,
    sha,
    state,
    context: statusName
  })
}

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  try {
    validateGithubWebhookPayload(event)
    const checkSuiteEvent = JSON.parse(event.body as string) as CheckSuiteEvent

    if (!processEvent(checkSuiteEvent)) {
      return apiGatewayResponse(
        201,
        `Ignoring event: ${JSON.stringify(checkSuiteEvent)}`
      )
    }

    const {owner, repo, sha} = getOwnerRepoSha(checkSuiteEvent)
    const octokit = getOctokit()
    const ignoreChecksCSV = process.env.IGNORE_CHECKS || ''

    const ignoreChecks = ignoreChecksCSV.split(',')

    const allChecksResponse = await octokit.checks.listForRef({
      owner,
      repo,
      ref: sha
    })

    const pendingChecks = findPendingChecks(
      allChecksResponse.data.check_runs,
      ignoreChecks
    )

    if (pendingChecks.length !== 0) {
      await setCommitStatusForSha(owner, repo, sha, 'pending', octokit)
      return apiGatewayResponse(201, 'Waiting for other checks to complete')
    }

    const failedChecks = findFailedChecks(
      allChecksResponse.data.check_runs,
      ignoreChecks
    )

    if (failedChecks.length !== 0) {
      await setCommitStatusForSha(owner, repo, sha, 'failure', octokit)
      return apiGatewayResponse(201, 'Some or all checks failed')
    }

    await setCommitStatusForSha(owner, repo, sha, 'success', octokit)
    return apiGatewayResponse(201, 'Event handled successfully')
  } catch (err) {
    log.error((err as Error).message)
    return apiGatewayResponse(401, (err as Error).message)
  }
}
