         
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { FileRecord, transform1, transform2 } from './libs/transforms'
import { commitFileToS3_v2 } from './libs/s3'
import { Stage } from './utils/config'
import { ZuoraSubscription, fetchZuoraBearerToken1, fetchZuoraBearerToken2, getFileFromZuora, mockZuoraAquaQuery as zuoraQuery } from './libs/zuora'
import moment from 'moment';
import { Credentials } from 'aws-sdk/lib/core';
import { getSsmValue } from "./utils/ssm";

export const main = async () => {
  console.log("main function: start");
  console.log(`stage: ${process.env.Stage}`);
  const zuoraBearerToken = await fetchZuoraBearerToken2(Stage);
  if (zuoraBearerToken) {
    const file = await getFileFromZuora(zuoraBearerToken);
    for (const i of Array(14).keys()) {
      const cursor = moment().add(i, "days");
      await commitFileToS3_v2(Stage, cursor.format("YYYY"), cursor.format("YYYY-MM"), cursor.format("YYYY-MM-DD"), file);
    }
  } else {
    console.log("Could not extract a bearer token from zuora")
  }
  console.log("main function: completed");
};
