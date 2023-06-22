import {
    CloudWatchLogsClient,
    DeleteLogStreamCommand,
    LogStream,
    paginateDescribeLogGroups,
    paginateDescribeLogStreams
} from '@aws-sdk/client-cloudwatch-logs'
import {InvokeCommand, LambdaClient} from '@aws-sdk/client-lambda'

async function handleStream(stream: LogStream, groupName: string): Promise<void> {
    if (stream.lastEventTimestamp === undefined || stream.logStreamName === undefined) {
        return Promise.resolve()
    }
    const datediff = new Date().getTime() - stream.lastEventTimestamp

    if (stream.storedBytes !== 0) {
        return
    }

    if (process.env['keepStreams'] !== undefined) {
        return Promise.reject(new Error('Missing env variavle keepStreams'))
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const hours: number = parseInt(process.env['keepStreams']!)

    if (datediff < 1000 * 60 * 60 * hours) {
        return
    }

    const request = new DeleteLogStreamCommand({
        logGroupName: groupName,
        logStreamName: stream.logStreamName
    })

    const client = new CloudWatchLogsClient({
        maxAttempts: 15
    })

    // eslint-disable-next-line no-console
    console.log(`Delete ${groupName}/${stream.logStreamName}`)

    try {
        await client.send(request)
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
    }
}

async function invokeGroup(args: {client: LambdaClient; logGroupName: string}): Promise<void> {
    const {client, logGroupName} = args

    const invokationRequest = new InvokeCommand({
        FunctionName: 'logstream-cleanup-group-handler',
        InvocationType: 'Event',
        Payload: Buffer.from(JSON.stringify({logGroupName}))
    })
    await client.send(invokationRequest)
}

async function invokeStreams(args: {
    client: LambdaClient
    logGroupName: string
    logStreams: LogStream[]
}): Promise<void> {
    const {client, logGroupName, logStreams} = args
    const invokationRequest = new InvokeCommand({
        FunctionName: 'logstream-cleanup-streams-handler',
        InvocationType: 'Event',
        Payload: Buffer.from(JSON.stringify({logGroupName, logStreams}))
    })
    await client.send(invokationRequest)
}

export async function logStreamsCleanupDispatch(): Promise<void> {
    const client = new CloudWatchLogsClient({maxAttempts: 15})
    const lambdaClient = new LambdaClient({})

    for await (const page of paginateDescribeLogGroups(
        {client},
        {
            logGroupNamePrefix: '/aws/lambda/'
        }
    )) {
        if (page.logGroups !== undefined) {
            await Promise.all(
                page.logGroups.map(async (group) => {
                    if (group.logGroupName !== undefined) {
                        await invokeGroup({client: lambdaClient, logGroupName: group.logGroupName})
                    }
                })
            )
        }
    }
}

export async function logStreamsCleanupGroupHandler(event: {groupName: string}): Promise<void> {
    const client = new CloudWatchLogsClient({maxAttempts: 15})
    const lambdaClient = new LambdaClient({})

    // eslint-disable-next-line no-console
    console.log(`Handling group ${event.groupName}`)

    for await (const page of paginateDescribeLogStreams(
        {client},
        {
            logGroupName: event.groupName
        }
    )) {
        if (page.logStreams !== undefined) {
            await invokeStreams({
                client: lambdaClient,
                logGroupName: event.groupName,
                logStreams: page.logStreams
            })
        }
    }
}

export async function logStreamsCleanupStreamsHandler(event: {
    groupName: string
    streams: LogStream[]
}): Promise<void> {
    await Promise.all(
        event.streams.map(async (stream) => {
            return handleStream(stream, event.groupName)
        })
    )
}
