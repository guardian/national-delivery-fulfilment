import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatchClient({});

/**
 * Publishes a validation error metric to CloudWatch
 * @param errorType - The type of validation error (e.g., 'MissingAddress', 'MissingCity', 'MissingPostcode')
 * @param count - The count of errors
 */
export async function putValidationError(
    errorType: string,
    count: number,
): Promise<void> {
    const stage = process.env.STAGE || 'CODE';

    try {
        await cloudwatch.send(
            new PutMetricDataCommand({
                Namespace: 'national-delivery-fulfilment',
                MetricData: [
                    {
                        MetricName: 'ValidationError',
                        Value: count,
                        Unit: 'Count',
                        Dimensions: [
                            {
                                Name: 'Stage',
                                Value: stage,
                            },
                            {
                                Name: 'ErrorType',
                                Value: errorType,
                            },
                        ],
                    },
                ],
            }),
        );
        console.log(`Published CloudWatch metric: ${errorType} = ${count}`);
    } catch (error) {
        console.error('Failed to publish metric:', error);
    }
}

/**
 * Publishes the total rows processed metric to CloudWatch
 * @param count - The total number of rows processed
 */
export async function putRowsProcessed(count: number): Promise<void> {
    const stage = process.env.STAGE || 'CODE';

    try {
        await cloudwatch.send(
            new PutMetricDataCommand({
                Namespace: 'national-delivery-fulfilment',
                MetricData: [
                    {
                        MetricName: 'RowsProcessed',
                        Value: count,
                        Unit: 'Count',
                        Dimensions: [
                            {
                                Name: 'Stage',
                                Value: stage,
                            },
                        ],
                    },
                ],
            }),
        );
        console.log(`Published CloudWatch metric: RowsProcessed = ${count}`);
    } catch (error) {
        console.error('Failed to publish metric:', error);
    }
}
