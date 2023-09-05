         
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { FileRecord, transform1, transform2 } from './libs/transforms'
import { publish2 } from './libs/filewriter'
import { Stage } from './utils/appConfig'
import { ZuoraSubscription, getFile, query1 as zuoraQuery } from './libs/zuora'
import moment from 'moment';
import { Credentials } from 'aws-sdk/lib/core';
import { testSsm } from "./utils/ssmConfig";

async function generateDay(year: string, month: string, day: string) {
  const client = new S3Client({ region: "eu-west-1" });
  const subscriptions: ZuoraSubscription[] = await zuoraQuery(); 
  const records: FileRecord[] = transform1(subscriptions);
  const filecontents = transform2(records);
  await publish2(client, Stage, `fulfilment/${year}/${month}/${day}.csv`, filecontents);
}

export const main = async () => {
  console.log("main function: start");
  const authorization = await testSsm();
  if (authorization) {
    const file = await getFile(authorization);
    console.log(file);
    //for (const i of Array(14).keys()) {
    //  const cursor = moment().add(i, "days");
    //  await generateDay(cursor.format("YYYY"), cursor.format("YYYY-MM"), cursor.format("YYYY-MM-DD"));
    //}
  } else {
    console.log("could not extract an authorization")
  }
  console.log("main function: completed");
};
