         
import { subscriptionsToFileRecords, fileRecordsToCSVFile, subscriptionsDataFileToSubscriptions, excludeHolidaySubscriptions, holidayNamesDataFileToNames, retainCorrectSubscriptions } from './libs/transforms'
import { commitFileToS3_v3 } from './libs/s3'
import { Stage } from './utils/config'
import { cycleDataFilesFromZuora, fetchZuoraBearerToken2 } from './libs/zuora'
import moment from 'moment';

export const main = async (indices?: number[]) => {
  console.log(`main function is starting with indices: ${JSON.stringify(indices)}`);
  
  // The indices is either not defined if this was a scheduled run, 
  // or are the indices requested by the user from a manual run in the aws console. 

  const zuoraBearerToken = await fetchZuoraBearerToken2(Stage);
  if (!zuoraBearerToken) {
    const message = "Could not extract a bearer token from zuora";
    console.log(message);
    throw message;
  }
  if (indices) {
    for (const i of indices) {
      await generateFileForDay(zuoraBearerToken, i);
    }
  } else {
    await generateOneFileUsingCurrentTimeToDeriveDayIndex(zuoraBearerToken);
  }
  console.log("main function has completed");
};

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
