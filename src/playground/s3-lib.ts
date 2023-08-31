import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Here we are passing the client to the function. To see how to build 
// the client (and the credentials if you are running this on local) see 
// learning-s3-main.ts

export const publish_to_s3_v1 = async (client: S3Client) => {
  const command = new PutObjectCommand({
    Bucket: "gu-national-delivery-fulfilment-code",
    Key: "hello-world.txt",
    Body: "Hello World!",
  });

  try {
    const response = await client.send(command);
    console.log(response);
  } catch (err) {
    console.error(err);
  }
};
