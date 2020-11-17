import {CloudWatchLogs, Lambda} from 'aws-sdk'

export const logStreamsCleanupDispatch = async (): Promise<void> => {
  const logGroupQuery: CloudWatchLogs.DescribeLogGroupsRequest = {
    logGroupNamePrefix: '/aws/lambda/'
  }

  const client = new CloudWatchLogs({
    maxRetries: 15
  })

  let response = await client.describeLogGroups(logGroupQuery).promise()

  await Promise.all(response.logGroups.map((group) => invokeGroup(group.logGroupName)))

  while (response.nextToken !== undefined) {
    const queryNext: CloudWatchLogs.DescribeLogGroupsRequest = {
      logGroupNamePrefix: '/aws/lambda/',
      nextToken: response.nextToken
    }

    response = await client.describeLogGroups(queryNext).promise()

    await Promise.all(response.logGroups.map((group) => invokeGroup(group.logGroupName)))
  }
}

export const logStreamsCleanupGroupHandler = async (event: {groupName: string}): Promise<void> => {
  const client = new CloudWatchLogs({
    maxRetries: 15
  })

  const logStreamQuery: CloudWatchLogs.DescribeLogStreamsRequest = {
    logGroupName: event.groupName
  }

  console.log(`Handling group ${event.groupName}`)

  let response = await client.describeLogStreams(logStreamQuery).promise()

  await invokeStreams(response.logStreams, event.groupName)

  while (response.nextToken !== undefined) {
    const queryNext: CloudWatchLogs.DescribeLogStreamsRequest = {
      logGroupName: event.groupName,
      nextToken: response.nextToken
    }

    response = await client.describeLogStreams(queryNext).promise()

    await invokeStreams(response.logStreams, event.groupName)
  }
}

export const logStreamsCleanupStreamsHandler = async (event: {
  groupName: string
  streams: CloudWatchLogs.LogStreams
}): Promise<void> => {
  await Promise.all(
    event.streams.map((stream) => {
      return handleStream(stream, event.groupName)
    })
  )
}

async function handleStream(stream: CloudWatchLogs.LogStream, groupName: string): Promise<void> {
  const datediff = new Date().getTime() - stream.lastEventTimestamp

  if (stream.storedBytes !== 0) {
    return
  }

  const hours: number = parseInt(process.env.keepStreams)

  if (datediff < 1000 * 60 * 60 * hours) {
    return
  }

  const request: CloudWatchLogs.DeleteLogStreamRequest = {
    logGroupName: groupName,
    logStreamName: stream.logStreamName
  }

  const client = new CloudWatchLogs({
    maxRetries: 15
  })

  console.log(`Delete ${groupName}/${stream.logStreamName}`)

  try {
    await client.deleteLogStream(request).promise()
  } catch (error) {
    console.error(error)
  }
}

async function invokeGroup(groupName: string): Promise<void> {
  const lambda = new Lambda()

  const invokationRequest: Lambda.InvocationRequest = {
    FunctionName: 'logstream-cleanup-group-handler',
    InvocationType: 'Event',
    Payload: JSON.stringify({groupName})
  }
  await lambda.invoke(invokationRequest).promise()
}

async function invokeStreams(streams: CloudWatchLogs.LogStreams, groupName: string): Promise<void> {
  const lambda = new Lambda()

  const invokationRequest: Lambda.InvocationRequest = {
    FunctionName: 'logstream-cleanup-streams-handler',
    InvocationType: 'Event',
    Payload: JSON.stringify({groupName, streams})
  }
  await lambda.invoke(invokationRequest).promise()
}
