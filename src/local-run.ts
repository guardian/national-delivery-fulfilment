
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import { publish_to_s3_v1 } from './examples/learning-s3-lib'
import { make1 } from './filebuilder'
import { publish1 } from './filewriter'

import {
	Credentials,
} from 'aws-sdk/lib/core';

export const main = async () => {
  console.log("starting main function");
  
  const credentials = new Credentials({
    accessKeyId: '[removed]',
    secretAccessKey: '[removed]',
    sessionToken: '[removed]'
  });
  
  const client = new S3Client({ credentials: credentials, region: "eu-west-1" });
  
  // const client = new S3Client({ region: "eu-west-1" });
  // The structure here is very simple, we make the file using filebuilder and write it
  const contents = make1();
  console.log(contents);
  await publish1(client, contents);
};

main();
