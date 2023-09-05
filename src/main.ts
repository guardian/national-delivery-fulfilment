         
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { FileRecord, transform1, transform2 } from './libs/transforms'
import { publish2 } from './libs/filewriter'
import { Stage } from './utils/appConfig'
import { ZuoraSubscription, query1 as zuoraQuery } from './libs/zuora'

import moment from 'moment';

import {
	Credentials,
} from 'aws-sdk/lib/core';


async function generateDay(year: string, month: string, day: string) {
  const client = new S3Client({ region: "eu-west-1" });
  const subscriptions: ZuoraSubscription[] = await zuoraQuery(); 
  const records: FileRecord[] = transform1(subscriptions);
  const filecontents = transform2(records);
  console.log(filecontents);
  await publish2(client, Stage, `fulfilment/${year}/${month}/${day}.csv`, filecontents);
}

export const main = async () => {
  console.log("main function: start");
  for (const i of Array(14).keys()) {
    const cursor = moment().add(i, "days");
    console.log(cursor.format("YYYY-MM-DD"));
    await generateDay(cursor.format("YYYY"), cursor.format("YYYY-MM"), cursor.format("YYYY-MM-DD"));
  }
  console.log("main function: completed");
};
