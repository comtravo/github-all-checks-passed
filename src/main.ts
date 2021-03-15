// import * as core from '@actions/core'
// import {getOctokit, context} from '@actions/github'
// import {Endpoints} from '@octokit/types'
// import {GitHub} from '@actions/github/lib/utils'

// type checksListForRefResponseType = Endpoints['GET /repos/{owner}/{repo}/commits/{ref}/check-runs']['response']
// type checkRunsType = Endpoints['GET /repos/{owner}/{repo}/commits/{ref}/check-runs']['response']['data']['check_runs']
// type createCheckResponseType = Endpoints['POST /repos/{owner}/{repo}/check-runs']['response']
// type updateCheckResponseType = Endpoints['PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}']['response']

// const allChecksPassedActionMessage = 'All checks passed'

// function getOctokitClient(): InstanceType<typeof GitHub> {
//   const token = process.env.GITHUB_TOKEN

//   if (!token) {
//     throw new Error(`GITHUB_TOKEN not found in environment variables`)
//   }

//   return getOctokit(token)
// }

// async function getCheckRuns(
//   octokit: InstanceType<typeof GitHub>
// ): Promise<checksListForRefResponseType> {
//   return octokit.checks.listForRef({
//     owner: context.repo.owner,
//     repo: context.repo.repo,
//     ref: context.sha
//   })
// }

// async function setCheckRunResult(
//   octokit: InstanceType<typeof GitHub>,
//   thisCheckRunsId: number | undefined,
//   result: 'success' | 'failure'
// ): Promise<createCheckResponseType | updateCheckResponseType> {
//   const summary =
//     result === 'success'
//       ? 'All checks passed'
//       : 'Some checks failed. check which check failed apart from this one'
//   if (!thisCheckRunsId) {
//     core.info('Creating a new check')
//     return octokit.checks.create({
//       owner: context.repo.owner,
//       repo: context.repo.repo,
//       head_sha: context.sha,
//       name: allChecksPassedActionMessage,
//       status: 'completed',
//       conclusion: result,
//       output: {
//         title: 'Detail',
//         summary
//       }
//     })
//   } else {
//     core.info(`Updating the existing check with check id: ${thisCheckRunsId}`)
//     return octokit.checks.update({
//       owner: context.repo.owner,
//       repo: context.repo.repo,
//       check_run_id: thisCheckRunsId,
//       status: 'completed',
//       conclusion: result,
//       output: {
//         title: 'Detail',
//         summary
//       }
//     })
//   }
// }

// function fetchCheckIdForThisAction(
//   res: checksListForRefResponseType
// ): number | undefined {
//   const checkRuns = res.data.check_runs

//   const thisCheckRun = checkRuns.filter(
//     checkRun => checkRun.name === allChecksPassedActionMessage
//   )

//   if (thisCheckRun.length === 0) {
//     return
//   }

//   if (thisCheckRun.length > 1) {
//     throw new Error(
//       `More than 1 check run for this action: ${JSON.stringify(thisCheckRun)}`
//     )
//   }

//   return thisCheckRun[0].id
// }

// function findNonSuccessfulCheckRuns(
//   res: checksListForRefResponseType,
//   ignoreChecks: string[]
// ): checkRunsType | undefined {
//   const checkRuns = res.data.check_runs
//   if (checkRuns.length === 0) {
//     core.info(
//       `No check runs found for ${context.repo.owner}/${context.repo.repo} and sha: ${context.sha}`
//     )
//     return
//   }

//   core.info(`Found ${checkRuns.length} runs`)

//   const nonSuccessfulRuns = checkRuns.filter(
//     checkRun =>
//       checkRun.status === 'completed' &&
//       !['success', 'neutral'].includes(checkRun.conclusion) &&
//       !ignoreChecks.includes(checkRun.name)
//   )

//   return nonSuccessfulRuns
// }

// async function run(): Promise<void> {
//   try {
//     const ignoreChecksString: string = core.getInput('ignore_checks')
//     const ignoreChecks: string[] = JSON.parse(ignoreChecksString)
//     core.debug(`Will ignore checks: ${ignoreChecksString}`)

//     const octokit = getOctokitClient()
//     const checkRunsResponse = await getCheckRuns(octokit)
//     const checkIdOfThisCheckRun = fetchCheckIdForThisAction(checkRunsResponse)

//     const nonSuccessfulRuns = findNonSuccessfulCheckRuns(
//       checkRunsResponse,
//       ignoreChecks
//     )

//     if (!nonSuccessfulRuns || nonSuccessfulRuns.length === 0) {
//       core.info('All checks passed')

//       await setCheckRunResult(octokit, checkIdOfThisCheckRun, 'success')
//       return
//     }

//     for (const nonSuccessfulRun of nonSuccessfulRuns) {
//       core.warning(
//         `${nonSuccessfulRun.name} failed to pass with conclusion ${nonSuccessfulRun.conclusion}`
//       )
//     }

//     await setCheckRunResult(octokit, checkIdOfThisCheckRun, 'failure')
//     return
//   } catch (error) {
//     core.setFailed(error.message)
//   }
// }

// run()

import {APIGatewayProxyEventV2, APIGatewayProxyResultV2} from 'aws-lambda'
import {CheckSuiteEvent} from '@octokit/webhooks-definitions/schema'
import * as crypto from 'crypto'

function validateGithubWebhookPayload(event: APIGatewayProxyEventV2): void {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  const sig = event['headers']['X-Hub-Signature']
  const githubEvent = event['headers']['X-GitHub-Event']
  const id = event['headers']['X-GitHub-Delivery']

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
  return {
    statusCode,
    body,
    headers: {
      'Content-Type': 'text/plain'
    }
  }
}

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  try {
    validateGithubWebhookPayload(event)

    const checkSuiteEvent = JSON.parse(event.body as string) as CheckSuiteEvent

    if (
      !checkSuiteEvent.action ||
      checkSuiteEvent.action !== 'completed' ||
      !checkSuiteEvent.check_suite ||
      checkSuiteEvent.check_suite.status === null ||
      !['completed'].includes(checkSuiteEvent.check_suite.status)
    ) {
      return apiGatewayResponse(
        201,
        'Not handling event as checkSuite.action is not completed'
      )
    }

    return apiGatewayResponse(201, 'event handled successfully')
  } catch (err) {
    return apiGatewayResponse(401, (err as Error).message)
  }
}
