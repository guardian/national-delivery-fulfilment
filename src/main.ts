         
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { FileRecord, subscriptionsToFileRecords, fileRecordsToCSVFile, zuoraDataFileToSubscriptions } from './libs/transforms'
import { commitFileToS3_v3 } from './libs/s3'
import { Stage } from './utils/config'
import { cycleDataFileFromZuora, fetchZuoraBearerToken2 } from './libs/zuora'
import moment from 'moment';
import { Credentials } from 'aws-sdk/lib/core';
import { getSsmValue } from "./utils/ssm";
import { sleep } from "./utils/sleep";

export const main = async () => {
  console.log("main function: start");
  const zuoraBearerToken = await fetchZuoraBearerToken2(Stage);
  if (zuoraBearerToken) {
    for (const i of Array(14).keys()) {
      console.log(`i: ${i}`);
      //const cursor = moment().add(i, "days");
      //const date = cursor.format("YYYY-MM-DD");
      //const file1 = await cycleDataFileFromZuora(Stage, zuoraBearerToken);
      //const subscriptions = zuoraDataFileToSubscriptions(file1);
      //const fileRecords = subscriptionsToFileRecords(subscriptions);
      //const file2 = fileRecordsToCSVFile(fileRecords);
      //const filePathKey = `fulfilment/${cursor.format("YYYY")}/${cursor.format("YYYY-MM")}/${cursor.format("YYYY-MM-DD")}.csv`;
      //await commitFileToS3_v3(Stage, filePathKey, file2);
      await sleep(2000); // sleeping 2 seconds
      console.log(`timestamp: ${new Date()}`);
    }
  } else {
    console.log("Could not extract a bearer token from zuora")
  }
  console.log("main function: completed");
};
