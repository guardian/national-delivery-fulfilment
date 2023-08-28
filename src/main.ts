
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import { publish_to_s3_v1 } from './examples/learning-s3-lib'
import { make1 } from './filebuilder'
import { publish2 } from './filewriter'
import { Stage } from './config'

import {
	Credentials,
} from 'aws-sdk/lib/core';

export const main = async () => {
  console.log("main function: start");
  const client = new S3Client({ region: "eu-west-1" });
  const contents = make1();
  console.log("contents:")
  console.log(contents);
  await publish2(client, Stage, "fulfilment/2023/2023-08/2023-08-28.csv", contents);
  console.log("main function: completed");
};
