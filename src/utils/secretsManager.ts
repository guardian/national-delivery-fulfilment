import {
    GetSecretValueCommand,
    SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { Region } from './config';

export async function getSecret(
    secretName: string,
    client = new SecretsManagerClient({ region: Region }),
): Promise<unknown> {
    const response = await client.send(
        new GetSecretValueCommand({
            SecretId: secretName,
            VersionStage: 'AWSCURRENT',
        }),
    );

    if (response.SecretString === undefined) {
        throw new Error(`Secret ${secretName} has no string value`);
    }

    return JSON.parse(response.SecretString) as unknown;
}
