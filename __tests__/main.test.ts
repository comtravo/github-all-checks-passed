// @ts-nocheck

import * as AWS from 'aws-sdk'
import SSMParameterStore from 'ssm-parameter-store'

import * as sinon from 'sinon'
import {cloneDeep} from 'lodash'

import * as index from '../src/main'

import * as apiGatewayEvent from './fixtures/api_gateway_event.json'
import * as apiGatewayEventActionNotComplete from './fixtures/api_gateway_event_action_not_complete.json'

describe('Handler', () => {
  let sandbox: sinon.SinonSandbox
  let awsStub: sinon.SinonStub
  let ssmParameterStoreGetStub: sinon.SinonStub

  beforeEach(() => {
    process.env.AWS_REGION = 'eu-west-1'
    process.env.AWS_DEFAULT_REGION = 'eu-west-1'
    sandbox = sinon.createSandbox()

    awsStub = sandbox.stub(AWS, 'SSM')

    ssmParameterStoreGetStub = sandbox.stub(SSMParameterStore.prototype, 'get')
    ssmParameterStoreGetStub.withArgs('githubToken').returns('githubToken-1234')
    ssmParameterStoreGetStub
      .withArgs('webhookSecret')
      .returns('webhookSecret-1234')
  })

  afterEach(() => {
    sandbox.restore()
  })

  test('should return error when x-hub-signature is not present', async () => {
    const event = cloneDeep(apiGatewayEvent)
    delete event.headers['x-hub-signature']
    await expect(index.handler(event)).resolves.toEqual(
      expect.objectContaining({
        statusCode: 401,
        body: expect.stringMatching(/x-hub-signature not present/)
      })
    )
  })

  test('should return error when x-github-event is not present', async () => {
    const event = cloneDeep(apiGatewayEvent)
    delete event.headers['x-github-event']
    await expect(index.handler(event)).resolves.toEqual(
      expect.objectContaining({
        statusCode: 401,
        body: expect.stringMatching(/x-github-event not present/)
      })
    )
  })

  test('should return error when x-github-delivery is not present', async () => {
    const event = cloneDeep(apiGatewayEvent)
    delete event.headers['x-github-delivery']
    await expect(index.handler(event)).resolves.toEqual(
      expect.objectContaining({
        statusCode: 401,
        body: expect.stringMatching(/x-github-delivery not present/)
      })
    )
  })

  test('should return error when event is not present', async () => {
    const event = cloneDeep(apiGatewayEvent)
    delete event.body
    await expect(index.handler(event)).resolves.toEqual(
      expect.objectContaining({
        statusCode: 401,
        body: expect.stringMatching(/Cannot find event body:/)
      })
    )
  })

  test('should return error when signatures do not match', async () => {
    const event = cloneDeep(apiGatewayEvent)
    event.headers['x-hub-signature'] = 'sha1=1234'
    await expect(index.handler(event)).resolves.toEqual(
      expect.objectContaining({
        statusCode: 401,
        body: expect.stringMatching(/Signatures did not match/)
      })
    )
  })

  test('should return error when webhook secret is not valid', async () => {
    ssmParameterStoreGetStub.withArgs('webhookSecret').returns()
    await expect(index.handler(apiGatewayEvent)).resolves.toEqual(
      expect.objectContaining({
        statusCode: 401,
        body: expect.stringMatching(/Secret not present/)
      })
    )
  })

  test('should return error when webhook secret is an empty string', async () => {
    ssmParameterStoreGetStub.withArgs('webhookSecret').returns('')
    await expect(index.handler(apiGatewayEvent)).resolves.toEqual(
      expect.objectContaining({
        statusCode: 401,
        body: expect.stringMatching(/Secret not present/)
      })
    )
  })

  test('should handle the webhook event gracefully when action is not completed', async () => {
    await expect(
      index.handler(apiGatewayEventActionNotComplete)
    ).resolves.toEqual(
      expect.objectContaining({
        statusCode: 201,
        body: expect.stringMatching(/Ignoring event:/)
      })
    )
  })
})
