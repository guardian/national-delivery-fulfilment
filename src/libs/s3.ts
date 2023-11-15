import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function commitFileToS3_v1(
    client: S3Client,
    stage: string,
    filenamepath: string,
    contents: string,
) {
    const command = new PutObjectCommand({
        Bucket: `gu-national-delivery-fulfilment-${stage.toLowerCase()}`,
        Key: filenamepath,
        Body: contents,
    });
    try {
        const response = await client.send(command);
        console.log(response);
    } catch (err) {
        console.error(err);
    }
}

export async function commitFileToS3_v2(
    stage: string,
    year: string,
    month: string,
    day: string,
    file: string,
) {
    const client = new S3Client({ region: 'eu-west-1' });
    await commitFileToS3_v1(
        client,
        stage,
        `fulfilment/${year}/${month}/${day}.csv`,
        file,
    );
}

export async function commitFileToS3_v3(
    stage: string,
    filePathKey: string,
    file: string,
) {
    const client = new S3Client({ region: 'eu-west-1' });
    await commitFileToS3_v1(client, stage, filePathKey, file);
}
