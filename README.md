![](https://devtoday-assets.s3.eu-central-1.amazonaws.com/devtoday_cl.png)

![](https://img.shields.io/david/smirowstanitzok/logstreams-cleanup) ![](https://img.shields.io/github/issues/smirowstanitzok/logstreams-cleanup) ![](https://img.shields.io/github/license/smirowstanitzok/logstreams-cleanup) ![](https://img.shields.io/github/package-json/v/smirowstanitzok/logstreams-cleanup) ![](https://img.shields.io/badge/Code-TypeScript-informational?style=flat&logo=typescript&logoColor=white&color=2bbc8a)

# Scheduled removal of LogStreams in AWS Cloudwatch

This tool deletes all empty LogStreams in AWS Clodwatch. For this purpose, Lambdas are generated using the serverless framework, which search for empty CloudWatch streams and then remove them. This procedure makes sense when working with LogRetention, which remove LogEvents after a configured time. Only LogStreams of the lambdas are removed.

# Usage

## Dependencies / Before you start

Before you start you need to ensure to have a valid secrets file for accessing your AWS. If you haven't you can create one by using the serverless framework:

`npx sls config credentials --provider PROVIDER_NAME_OR_DEFAULT --key ACCESS_KEY --secret ACCESS_KEY_SECRET`

_Replace the parts in capital letters with your personal values!_

If you have not an access key and secret log in to AWS IAM and create a user: https://console.aws.amazon.com/iam/home?#/users$new?step=details

![](blob/create.png?raw=true)

Ensure the user has 'Programmatic access' and **at least** following permissions:

-   AWSLambdaFullAccess
-   CloudFrontFullAccess
-   CloudWatchLogsFullAccess

\*For the serverless user, it makes most sense to grant **_AdministratorAccess_** authorization. if you don't have a problem with it, you should always do that\*

![](blob/permissions.png?raw=true)

After the user have been created you can use the generated keys for your configuration.

![](blob/keys.png?raw=true)

_Don't use the keys from the screenshot. Of cause this user is deleted already_ :-)

## Installation

**1)** Clone this repository

`git clone https://github.com/smirowstanitzok/safetyop-messaging.git`

**2)** Install node dependencies

`npm install`

**3)** Deploy to AWS

`npm run deploy`

## Customize

Feel free to change this code in any way you like. To customize this tool in an easy way you can edit the configuration in `serverless.yml`.

### Define how often the clean up should run

By default the cleanup will run once a day. You can change this value by editing the following line in `serverless.yml`:

```
  # Define how often the clean up should run
  cleanupRate: rate(1 day)
```

You can change the `cleanupRate` to a speakable value like `rate(2 hours)`, `rate(1 week)`, `rate(5 days)` and so on. You can also use a cron expression by setting `cleanupRate` to a value like `cron(0 12 * * ? *)`.

### Configure how many days logs of this job should be saved

This tool not only clears logs, it also creates its own logs. By default this logs will be saved for 5 days. Yout can change the retention by changing a custom line in `serverless.yml`:

```
  # Configure how many days logs of this job should be saved
  logRetentionInDays: 5
```

Just set `logRetentionInDays` to the value you like.

### Configure how many hours empty log streams should be kept after creation

In some cases, LogStreams are generated and only provided with LogEvents much later. So that such streams are not deleted, they are only deleted after a configured time.

By default empty LogStreams will be kept 2 hours after creation. You can change this by editing a custom value in `serverless.yml`:

```
  # Configure how many hours empty log streams should be kept after creation
  keepNewEmptyStreamsInHours: 2
```

Just set `keepNewEmptyStreamsInHours` to the value you like.

## Deinstallion

If you like to remove the cleanup job from your AWS you just need to run

```
npm run remove
```

in the folder of this tool.

# Support

Feel free to open an issue or create a pull request.
