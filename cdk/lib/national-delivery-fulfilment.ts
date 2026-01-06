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
import {
	ComparisonOperator,
	MathExpression,
	Metric,
} from 'aws-cdk-lib/aws-cloudwatch';
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
				runtime: Runtime.NODEJS_22_X,
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

		nationalDeliveryFulfilmentLambda.addToRolePolicy(
			new PolicyStatement({
				actions: ['cloudwatch:PutMetricData'],
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

		// Data Quality Composite Alarm - monitors address, city, postcode, and delivery agent validation
		const missingAddressMetric = new Metric({
			namespace: 'national-delivery-fulfilment',
			metricName: 'ValidationError',
			statistic: 'Sum',
			dimensionsMap: {
				Stage: this.stage,
				ErrorType: 'MissingAddress',
			},
			period: Duration.minutes(5),
		});

		const missingCityMetric = new Metric({
			namespace: 'national-delivery-fulfilment',
			metricName: 'ValidationError',
			statistic: 'Sum',
			dimensionsMap: {
				Stage: this.stage,
				ErrorType: 'MissingCity',
			},
			period: Duration.minutes(5),
		});

		const missingPostcodeMetric = new Metric({
			namespace: 'national-delivery-fulfilment',
			metricName: 'ValidationError',
			statistic: 'Sum',
			dimensionsMap: {
				Stage: this.stage,
				ErrorType: 'MissingPostcode',
			},
			period: Duration.minutes(5),
		});

		const missingDeliveryAgentMetric = new Metric({
			namespace: 'national-delivery-fulfilment',
			metricName: 'ValidationError',
			statistic: 'Sum',
			dimensionsMap: {
				Stage: this.stage,
				ErrorType: 'MissingDeliveryAgent',
			},
			period: Duration.minutes(5),
		});

		// Use MathExpression to combine all validation metrics
		const totalValidationErrors = new MathExpression({
			expression: 'm1 + m2 + m3 + m4',
			usingMetrics: {
				m1: missingAddressMetric,
				m2: missingCityMetric,
				m3: missingPostcodeMetric,
				m4: missingDeliveryAgentMetric,
			},
			label: 'Total Data Quality Errors',
			period: Duration.minutes(5),
		});

		new GuAlarm(this, 'DataQualityCompositeAlarm', {
			app,
			snsTopicName: snsTopicName,
			alarmName: `URGENT 9-5 - ${this.stage} National Delivery Data Quality Issues Detected`,
			alarmDescription: `CRITICAL: National Delivery fulfilment data has quality issues that may prevent newspaper delivery!

To investigate:
1. Check CloudWatch Metrics to see error counts:
   - Go to: https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#metricsV2:graph=~();query=~'*7bnational-delivery-fulfilment*2cStage*2cErrorType*7d*20${this.stage}

2. Find affected subscriptions in CloudWatch Logs:
   - Log Group: /aws/lambda/membership-${app}-${this.stage}
   - Search: "VALIDATION ERROR" to see all issues with subscription details
   - AWS CLI: aws logs filter-log-events --log-group-name /aws/lambda/membership-${app}-${this.stage} --filter-pattern "VALIDATION ERROR" --profile membership --start-time $(($(echo $(date +%s) - 3600 | bc)))000

3. Fix in Zuora:
   - Search for subscription ID (A-S########)
   - Update missing fields (address, city, postcode, delivery agent/retailer reference, etc.)

Follow the runbook: https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit`,
			metric: totalValidationErrors,
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			threshold: 0,
			evaluationPeriods: 1,
			actionsEnabled: true, // Enable for both CODE and PROD
		});

		// Individual alarms for specific error types (PROD only)
		new GuAlarm(this, 'MissingAddressAlarm', {
			app,
			snsTopicName: snsTopicName,
			alarmName: `URGENT 9-5 - ${this.stage} National Delivery has missing address information`,
			alarmDescription: 'Impact - Customers may not receive their newspapers due to missing address. Investigate fulfilment data ASAP! Follow the runbook: https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit',
			metric: missingAddressMetric,
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			threshold: 0,
			evaluationPeriods: 1,
			actionsEnabled: isProd,
		});

		new GuAlarm(this, 'MissingCityAlarm', {
			app,
			snsTopicName: snsTopicName,
			alarmName: `URGENT 9-5 - ${this.stage} National Delivery has missing city information`,
			alarmDescription: 'Impact - Customers may not receive their newspapers due to missing city. Investigate fulfilment data ASAP! Follow the runbook: https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit',
			metric: missingCityMetric,
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			threshold: 0,
			evaluationPeriods: 1,
			actionsEnabled: isProd,
		});

		new GuAlarm(this, 'MissingPostcodeAlarm', {
			app,
			snsTopicName: snsTopicName,
			alarmName: `URGENT 9-5 - ${this.stage} National Delivery has missing postcode information`,
			alarmDescription: 'Impact - Customers may not receive their newspapers due to missing postcode. Investigate fulfilment data ASAP! Follow the runbook: https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit',
			metric: missingPostcodeMetric,
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			threshold: 0,
			evaluationPeriods: 1,
			actionsEnabled: isProd,
		});

		new GuAlarm(this, 'MissingDeliveryAgentAlarm', {
			app,
			snsTopicName: snsTopicName,
			alarmName: `URGENT 9-5 - ${this.stage} National Delivery has missing delivery agent information`,
			alarmDescription: 'Impact - Customers may not receive their newspapers due to missing delivery agent (Retailer Reference). Investigate fulfilment data ASAP! Follow the runbook: https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit',
			metric: missingDeliveryAgentMetric,
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			threshold: 0,
			evaluationPeriods: 1,
			actionsEnabled: isProd,
		});
	}
}
