         
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { FileRecord, subscriptionsToFileRecords, fileRecordsToCSVFile, subscriptionsDataFileToSubscriptions, excludeHolidaySubscriptions, holidayNamesDataFileToNames, retainCorrectSubscriptions } from './libs/transforms'
import { commitFileToS3_v3 } from './libs/s3'
import { Stage } from './utils/config'
import { cycleDataFilesFromZuora, fetchZuoraBearerToken2 } from './libs/zuora'
import moment from 'moment';
import { Credentials } from 'aws-sdk/lib/core';
import { getSsmValue } from "./utils/ssm";
import { sleep } from "./utils/sleep";

async function generateFileForDay(zuoraBearerToken: string, now: moment.Moment, cursor: moment.Moment) {
  const today = now.format("YYYY-MM-DD");
  const date = cursor.format("YYYY-MM-DD");
  console.log(`date: ${date}`);
  const zuoraDataFiles = await cycleDataFilesFromZuora(Stage, zuoraBearerToken, date, today);
  const currentSubs = subscriptionsDataFileToSubscriptions(zuoraDataFiles.subscriptionsFile);
  const subsWithoutInvalid = retainCorrectSubscriptions(currentSubs)
  const holidaySubscriptionNames = holidayNamesDataFileToNames(zuoraDataFiles.holidayNamesFile);
  console.log(holidaySubscriptionNames);
  const subsWithoutHolidayStops = excludeHolidaySubscriptions(subsWithoutInvalid, holidaySubscriptionNames);
  const sentDate = now.format("DD/MM/YYYY");
  const deliveryDate = cursor.format("DD/MM/YYYY");
  const fileRecords = subscriptionsToFileRecords(subsWithoutHolidayStops, sentDate, deliveryDate);
  const file2 = fileRecordsToCSVFile(fileRecords);
  const filePathKey = `fulfilment/${cursor.format("YYYY")}/${cursor.format("YYYY-MM")}/${cursor.format("YYYY-MM-DD")}.csv`;
  await commitFileToS3_v3(Stage, filePathKey, file2);
}

async function generateFilesForAllDays(zuoraBearerToken: string, now: moment.Moment) {
  const today = now.format("YYYY-MM-DD");
  const indices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // There probably a sexier way to do this
  const promises = indices.map(async (i) => {
    const cursor = moment().add(i, "days");
    return generateFileForDay(zuoraBearerToken, now, cursor);
  });
  await Promise.all(promises);
}

export const main = async () => {
  console.log("main function: start");
  const now = moment();
  const zuoraBearerToken = await fetchZuoraBearerToken2(Stage);
  if (zuoraBearerToken) {
    await generateFilesForAllDays(zuoraBearerToken, now);
  } else {
    console.log("Could not extract a bearer token from zuora")
  }
  console.log("main function: completed");
};
