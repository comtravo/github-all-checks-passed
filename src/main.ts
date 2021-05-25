import {APIGatewayProxyEventV2, APIGatewayProxyResultV2} from 'aws-lambda'
import {CheckSuiteEvent} from '@octokit/webhooks-definitions/schema'
import * as AWS from 'aws-sdk'
import SSMParameterStore from 'ssm-parameter-store'
import * as crypto from 'crypto'
import pino from 'pino'

import * as octokitLib from '@octokit/rest'
import {Endpoints} from '@octokit/types'

const log = pino()
const parameters = new SSMParameterStore(new AWS.SSM(), {
  githubToken:
    process.env.GITHUB_TOKEN_KEY_IN_SSM_PARAMETER_STORE ||
    '/infrastructure/github/pat',
  webhookSecret:
    process.env.GITHUB_WEBHOOK_SECRET_KEY_IN_SSM_PARAMETER_STORE ||
    'infrastructure/github/all-checks-passed/webhook-secret'
})

type ListCheckSuitesForRefCheckSuites = Endpoints['GET /repos/{owner}/{repo}/commits/{ref}/check-suites']['response']['data']['check_suites']
type CreateCommitStatusResponse = Endpoints['POST /repos/{owner}/{repo}/statuses/{sha}']['response']

function validateGithubWebhookPayload(
  event: APIGatewayProxyEventV2,
  secret: string
): void {
  const sig = event.headers['x-hub-signature']
  const githubEvent = event.headers['x-github-event']
  const id = event.headers['x-github-delivery']

  if (!secret || secret === '') {
    throw new Error(`Secret not present`)
  }

  if (!sig) {
    throw new Error(`x-hub-signature not present in payload`)
  }

  if (!id) {
    throw new Error(`x-github-delivery not present in payload`)
  }

  if (!githubEvent) {
    throw new Error(`x-github-event not present in payload`)
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

export function getOctokit(
  token: string
): InstanceType<typeof octokitLib.Octokit> {
  return new octokitLib.Octokit({auth: token})
}

function getOwnerRepoSha(
  event: CheckSuiteEvent
): {
  owner: string
  repo: string
  sha: string
} {
  if (!event.repository.owner.login) {
    throw new Error(
      `Unable to determine owner for repo: ${JSON.stringify(event.repository)}`
    )
  }
  return {
    owner: event.repository.owner.login,
    repo: event.repository.name,
    sha: event.check_suite.head_sha
  }
}

function findPendingCheckSuites(
  allCheckSuites: ListCheckSuitesForRefCheckSuites,
  ignoreChecks: string[]
): ListCheckSuitesForRefCheckSuites {
  return allCheckSuites.filter(
    checkSuite =>
      !ignoreChecks.includes(checkSuite.app.name) &&
      ['queued', 'in_progress'].includes(checkSuite.status)
  )
}

function findFailedCheckSuites(
  allCheckSuites: ListCheckSuitesForRefCheckSuites,
  ignoreChecks: string[]
): ListCheckSuitesForRefCheckSuites {
  return allCheckSuites.filter(
    checkSuite =>
      !ignoreChecks.includes(checkSuite.app.name) &&
      checkSuite.status === 'completed' &&
      !['success', 'skipped'].includes(checkSuite.conclusion)
  )
}

async function setCommitStatusForSha(
  owner: string,
  repo: string,
  sha: string,
  state: 'success' | 'failure' | 'error' | 'pending',
  octokit: InstanceType<typeof octokitLib.Octokit>
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
    const secret = await parameters.get('webhookSecret')
    validateGithubWebhookPayload(event, secret)
    const checkSuiteEvent = JSON.parse(event.body as string) as CheckSuiteEvent

    if (!processEvent(checkSuiteEvent)) {
      return apiGatewayResponse(
        201,
        `Ignoring event: ${JSON.stringify(checkSuiteEvent)}`
      )
    }

    const {owner, repo, sha} = getOwnerRepoSha(checkSuiteEvent)
    await parameters.preload()
    const token = await parameters.get('githubToken')
    const octokit = getOctokit(token)
    const ignoreChecksCSV = process.env.IGNORE_CHECKS || ''

    const ignoreChecks = ignoreChecksCSV.split(',')

    const allChecksResponse = await octokit.checks.listSuitesForRef({
      owner,
      repo,
      ref: sha
    })

    const pendingCheckSuites = findPendingCheckSuites(
      allChecksResponse.data.check_suites,
      ignoreChecks
    )

    if (pendingCheckSuites.length !== 0) {
      log.info(pendingCheckSuites)
      await setCommitStatusForSha(owner, repo, sha, 'pending', octokit)
      return apiGatewayResponse(201, 'Waiting for other checks to complete')
    }

    const failedCheckSuites = findFailedCheckSuites(
      allChecksResponse.data.check_suites,
      ignoreChecks
    )

    if (failedCheckSuites.length !== 0) {
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
