         
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { FileRecord, subscriptionsToFileRecords, fileRecordsToCSVFile, subscriptionsDataFileToSubscriptions, excludeHolidaySubscriptions, holidayNamesDataFileToNames, retainCorrectSubscriptions } from './libs/transforms'
import { commitFileToS3_v3 } from './libs/s3'
import { Stage } from './utils/config'
import { cycleDataFilesFromZuora, fetchZuoraBearerToken2 } from './libs/zuora'
import moment from 'moment';
import { Credentials } from 'aws-sdk/lib/core';
import { getSsmValue } from "./utils/ssm";
import { sleep } from "./utils/sleep";

export const main = async (event) => {
  console.log("main function start");
  console.log(`event: ${JSON.stringify(event)}`);
  
  const zuoraBearerToken = await fetchZuoraBearerToken2(Stage);
  if (zuoraBearerToken) {
    await generateOneFileUsingCurrentTimeToDeriveDayIndex(zuoraBearerToken);
  } else {
    console.log("Could not extract a bearer token from zuora")
  }
  console.log("main function completed");
};

async function generateFilesForAllDaysSequential(zuoraBearerToken: string) {
  // Date: 29th October 2023
  // This function is currently not used but kept for a bit for illustration purposes.

  // It generates all 14 files sequentially.

  // This actually was the original implementation that was abandonned when it was discovered that 
  // The production run is so slow that the lambda expires (is killed after 15 minutes: the max time a 
  // lambda can run in AWS), and that, before the 14th file is generated.

  const indices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  for (const i of indices) {
    await generateFileForDay(zuoraBearerToken, i);
  }
}

async function generateFilesForAllDaysParallel(zuoraBearerToken: string) {
  // Date: 29th October 2023
  // This function is currently not used but kept for a bit for illustration purposes.

  // It generates all 14 files in parallel. 

  // This version was introduced to solve the problem posed by sequential run and AWS killing the lambda after 
  // 15 mins, but it is not recommanded for regular use because apparently Zuora doesn't always behave well when running
  // jobs in parallel.

  const indices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const promises = indices.map(async (i) => {
    return generateFileForDay(zuoraBearerToken, i);
  });
  await Promise.all(promises);
}

async function generateOneFileUsingCurrentTimeToDeriveDayIndex(zuoraBearerToken: string) {

  // Date: 29th October 2023

  // Here is the current, most recent scheme for file generation. Since we cannot generate all 14 files
  // sequentially in production, and since running them in parallel is not advised (source: John), we are 
  // simply going to spread the generation over a period of time. In this current version we simply generate the 
  // files over 14 hours

  // dayIndex is derived from the current hour of the day
  // Time 00:MM -> dayIndex = 1
  // Time 01:MM -> dayIndex = 2
  // ...
  // Time 13:MM -> dayIndex = 14
  // Time 14:MM -> dayIndex = 1
  // etc...

  const dayIndex = 1 + ((new Date()).getUTCHours() % 14);

  await generateFileForDay(zuoraBearerToken, dayIndex);
}

async function generateFileForDay(zuoraBearerToken: string, dayIndex: number) {

  // This function generates one file. The date of the file that is being generated is derived from the dayIndex
  // dayIndex = 1 -> tomorrow
  // dayIndex = 2 -> two days from now, etc...

  // The file generation is a linear sequence of steps that essentially perform 3 main operations:

  // 1. Retrieve subscription and holiday data from Zuora
  // 2. combine the two datasets using pure functions
  // 3. Write the resulting file into S3

  console.log(`Generating dayIndex: ${dayIndex}`);

  const now = moment();
  const cursor = moment().add(dayIndex, "days");

  const today = now.format("YYYY-MM-DD");
  const targetDate = cursor.format("YYYY-MM-DD");

  console.log(`today: ${today}`);
  console.log(`targetDate: ${targetDate}`);

  const zuoraDataFiles = await cycleDataFilesFromZuora(Stage, zuoraBearerToken, targetDate, today);
  const currentSubs = subscriptionsDataFileToSubscriptions(zuoraDataFiles.subscriptionsFile);
  const subsWithoutInvalid = retainCorrectSubscriptions(currentSubs)
  const holidaySubscriptionNames = holidayNamesDataFileToNames(zuoraDataFiles.holidayNamesFile);
  const subsWithoutHolidayStops = excludeHolidaySubscriptions(subsWithoutInvalid, holidaySubscriptionNames);
  const sentDate = now.format("DD/MM/YYYY");
  const deliveryDate = cursor.format("DD/MM/YYYY");
  const fileRecords = subscriptionsToFileRecords(subsWithoutHolidayStops, sentDate, deliveryDate);
  const file2 = fileRecordsToCSVFile(fileRecords);
  const filePathKey = `fulfilment/${cursor.format("YYYY")}/${cursor.format("YYYY-MM")}/${cursor.format("YYYY-MM-DD")}.csv`;
  await commitFileToS3_v3(Stage, filePathKey, file2);
}
