         
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { FileRecord, subscriptionsToFileRecords, fileRecordsToCSVFile, zuoraDataFileToSubscriptions } from './libs/transforms'
import { commitFileToS3_v2 } from './libs/s3'
import { Stage } from './utils/config'
import { ZuoraSubscription, cycleDataFileFromZuora, fetchZuoraBearerToken2 } from './libs/zuora'
import moment from 'moment';
import { Credentials } from 'aws-sdk/lib/core';
import { getSsmValue } from "./utils/ssm";
import { sleep } from "./utils/sleep";

export const main = async () => {
  console.log("main function: start");
  const zuoraBearerToken = await fetchZuoraBearerToken2(Stage);
  if (zuoraBearerToken) {
    const file1 = await cycleDataFileFromZuora(Stage, zuoraBearerToken);
    const subscriptions = zuoraDataFileToSubscriptions(file1);
    const fileRecords = subscriptionsToFileRecords(subscriptions);
    const file2 = fileRecordsToCSVFile(fileRecords);
    for (const i of Array(14).keys()) {
      const cursor = moment().add(i, "days");
      await commitFileToS3_v2(Stage, cursor.format("YYYY"), cursor.format("YYYY-MM"), cursor.format("YYYY-MM-DD"), file2);
    }
  } else {
    console.log("Could not extract a bearer token from zuora")
  }
  console.log("main function: completed");
};
