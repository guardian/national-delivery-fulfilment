import {GuScheduledLambda} from '@guardian/cdk';
import type {GuStackProps} from '@guardian/cdk/lib/constructs/core';
import {GuStack, GuStringParameter} from '@guardian/cdk/lib/constructs/core';
import {GuAllowPolicy, GuRole} from "@guardian/cdk/lib/constructs/iam";
import type {App} from 'aws-cdk-lib';
import {Duration} from 'aws-cdk-lib';
import {Schedule} from 'aws-cdk-lib/aws-events';
import {ArnPrincipal, Effect, PolicyStatement} from 'aws-cdk-lib/aws-iam';
import {Runtime} from 'aws-cdk-lib/aws-lambda';
import {Bucket} from 'aws-cdk-lib/aws-s3';

export class NationalDeliveryFulfilment extends GuStack {
  constructor(scope: App, id: string, props: GuStackProps) {
    super(scope, id, props);

    const app = 'national-delivery-fulfilment';

      const externalRoleArn = new GuStringParameter(
          this,
          "ExternalRoleArn",
          {
              description:
                  "Our supplier needs to access our buckets, so we need to tell our stack which role they will use to assume our role.",
          }
      );

    const nationalDeliveryFulfilmentLambda = new GuScheduledLambda(
      this,
      'national-delivery-fulfilment-lambda',
      {
        description: 'A lambda to handle fulfilment for national delivery',
        functionName: `membership-${app}-${this.stage}`,
        handler: 'national-delivery-fulfilment/index.handler',
        runtime: Runtime.NODEJS_18_X,
        memorySize: 1024,
        fileName: `${app}.zip`,
        app: app,
        rules: [{ schedule: Schedule.cron({
          day: '*',
          hour: '11',
          minute: '30',
        }), }],
        monitoringConfiguration: { noMonitoring: true },
        timeout: Duration.seconds(15*60),
      },
    );

    const bucketName = `gu-national-delivery-fulfilment-${this.stage.toLowerCase()}`

    const dataBucket = new Bucket(this, 'DataBucket', {
      bucketName: bucketName,
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

    const supplierFulfilmentRole = new GuRole(
        this,
        `AllowFulfilmentBucketRole${this.stage}`,
        {
              assumedBy: new ArnPrincipal(
                  externalRoleArn.valueAsString,
              ),
          });

    supplierFulfilmentRole.attachInlinePolicy(
        new GuAllowPolicy(
            this,
            "AllowFulfilmentBucketPolicy",
            {
                actions: [
                    "s3:GetObject",
                    "s3:ListBucket"
                ],
                resources: [
                    `arn:aws:s3:::${bucketName}/*`,
                    `arn:aws:s3:::${bucketName}`
                ],
            }
        )
    );


  }
}
