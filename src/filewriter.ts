import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// currently hardcoded to code
// TODO: get the correct stage

export async function publish1(client: S3Client, contents: string) {
  const command = new PutObjectCommand({
    Bucket: "gu-national-delivery-fulfilment-code",
    Key: "hello-world.csv",
    Body: contents,
  });

  try {
    const response = await client.send(command);
    console.log(response);
  } catch (err) {
    console.error(err);
  }
}