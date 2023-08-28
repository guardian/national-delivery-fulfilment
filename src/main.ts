
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import { publish_to_s3_v1 } from './examples/learning-s3-lib'
import { FileRecord, transform1, transform2 } from './transforms'
import { publish2 } from './filewriter'
import { Stage } from './config'
import { ZuoraSubscription, query1 as zuoraQuery } from './zuora'

import {
	Credentials,
} from 'aws-sdk/lib/core';

export const main = async () => {
  console.log("main function: start");
  const client = new S3Client({ region: "eu-west-1" });
  const subscriptions: ZuoraSubscription[] = await zuoraQuery(); 
  const records: FileRecord[] = transform1(subscriptions);
  const filecontents = transform2(records);
  console.log(filecontents);
  await publish2(client, Stage, "fulfilment/2023/2023-08/2023-08-28.csv", filecontents);
  console.log("main function: completed");
};
