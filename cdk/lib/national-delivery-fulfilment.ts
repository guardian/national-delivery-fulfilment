import { GuScheduledLambda } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuAllowPolicy, GuRole } from '@guardian/cdk/lib/constructs/iam';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Schedule } from 'aws-cdk-lib/aws-events';
import { ArnPrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { ComparisonOperator, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';

export class NationalDeliveryFulfilment extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'national-delivery-fulfilment';

		const nationalDeliveryFulfilmentLambda = new GuScheduledLambda(
			this,
			'national-delivery-fulfilment-lambda',
			{
				description: 'A lambda to handle fulfilment for national delivery',
				functionName: `membership-${app}-${this.stage}`,
				handler: 'national-delivery-fulfilment/index.handler',
				runtime: Runtime.NODEJS_20_X,
				memorySize: 1024,
				fileName: `${app}.zip`,
				app: app,
				rules: [
					{
						schedule: Schedule.cron({
							day: '*',
							hour: '*',
							minute: '30',
						}),
					},
				],
				monitoringConfiguration: { noMonitoring: true },
				timeout: Duration.seconds(15 * 60), // overriding the default duration which is not 15 minutes
			},
		);

		const bucketName = `gu-national-delivery-fulfilment-${this.stage.toLowerCase()}`;

		const dataBucket = new Bucket(this, 'DataBucket', {
			bucketName: bucketName,
			versioned: true,
		});

		nationalDeliveryFulfilmentLambda.addToRolePolicy(
			new PolicyStatement({
				actions: ['s3:PutObject'],
				effect: Effect.ALLOW,
				resources: [dataBucket.arnForObjects('*')],
			}),
		);

		nationalDeliveryFulfilmentLambda.addToRolePolicy(
			new PolicyStatement({
				actions: ['ssm:GetParameter'],
				effect: Effect.ALLOW,
				resources: ['*'],
			}),
		);

		const supplierRoleArn = StringParameter.valueForStringParameter(
			this,
			`/national-delivery-fulfilment/${this.stage}/supplierRoleArn`,
		);

		const supplierFulfilmentRole = new GuRole(
			this,
			`AllowFulfilmentBucketRole${this.stage}`,
			{
				roleName:
					this.stage == 'CODE'
						? 'SandboxPaperroundAccess'
						: 'ProductionPaperroundAccess',
				assumedBy: new ArnPrincipal(supplierRoleArn),
			},
		);

		supplierFulfilmentRole.attachInlinePolicy(
			new GuAllowPolicy(this, 'AllowFulfilmentBucketPolicy', {
				actions: ['s3:ListBucket'],
				resources: [`arn:aws:s3:::${bucketName}`],
			}),
		);

		supplierFulfilmentRole.attachInlinePolicy(
			new GuAllowPolicy(this, 'AllowFulfilmentBucketGetFilesPolicy', {
				actions: ['s3:GetObject'],
				resources: [`arn:aws:s3:::${bucketName}/fulfilment/*`],
			}),
		);

		supplierFulfilmentRole.attachInlinePolicy(
			new GuAllowPolicy(this, 'AllowFulfilmentBucketPutFailedDeliveryPolicy', {
				actions: ['s3:GetObject', 's3:PutObject'],
				resources: [`arn:aws:s3:::${bucketName}/failed-deliveries/uploads/*`],
			}),
		);

		const errorMetric = new Metric({
			namespace: 'AWS/Lambda',
			metricName: 'Errors',
			statistic: 'Sum',
			dimensionsMap: {
				FunctionName: `membership-national-delivery-fulfilment-${this.stage}`,
			},
		});

		const snsTopicName = `alarms-handler-topic-${this.stage}`;
		const isProd = this.stage === 'PROD';

		new GuAlarm(this, 'ErrorExecutionAlarm', {
			app,
			snsTopicName: snsTopicName,
			alarmName: `${app}: error-${this.stage}`,
			alarmDescription: `${app}: error while executing lambda`,
			metric: errorMetric,
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			threshold: 0,
			evaluationPeriods: 1,
			actionsEnabled: isProd,
		});
	}
}
