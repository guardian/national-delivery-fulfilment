         
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { FileRecord, transform1, transform2 } from './libs/transforms'
import { publish2 } from './libs/filewriter'
import { Stage } from './utils/appConfig'
import { ZuoraSubscription, fetchZuoraBearerToken, getFileFromZuora, mockZuoraAquaQuery as zuoraQuery } from './libs/zuora'
import moment from 'moment';
import { Credentials } from 'aws-sdk/lib/core';
import { testSsm, getSsmValue } from "./utils/ssmConfig";

async function commitFileToS3(year: string, month: string, day: string, file: string) {
  const client = new S3Client({ region: "eu-west-1" });
  await publish2(client, Stage, `fulfilment/${year}/${month}/${day}.csv`, file);
}

export const main = async () => {
  console.log("main function: start");
  const answer = await fetchZuoraBearerToken(Stage); 
  console.log(answer);
  const authorization = await testSsm();
  if (authorization) {
    const file = await getFileFromZuora(authorization);
    for (const i of Array(14).keys()) {
      const cursor = moment().add(i, "days");
      await commitFileToS3(cursor.format("YYYY"), cursor.format("YYYY-MM"), cursor.format("YYYY-MM-DD"), file);
    }
  } else {
    console.log("could not extract an authorization")
  }
  console.log("main function: completed");
};
