import { getSsmValue } from '../utils/ssm';

interface SalesforceSSMConfig {
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
    token: string;
    authenticationBaseUrl: string;
    queryBaseUrl: string;
}

export async function makeSalesforceSSMConfig(
    stage: string,
): Promise<SalesforceSSMConfig> {
    const clientId = await getSsmValue(stage, 'salesforceClientId');
    const clientSecret = await getSsmValue(stage, 'salesforceClientSecret');
    const username = await getSsmValue(stage, 'salesforceUsername');
    const password = await getSsmValue(stage, 'salesforcePassword');
    const token = await getSsmValue(stage, 'salesforceToken');
    const authenticationBaseUrl = await getSsmValue(
        stage,
        'salesforceAuthenticationBaseUrl',
    );
    const queryBaseUrl = await getSsmValue(stage, 'salesforceQueryBaseUrl');
    if (
        clientId === undefined ||
        clientSecret === undefined ||
        username === undefined ||
        password === undefined ||
        token === undefined ||
        authenticationBaseUrl == undefined ||
        queryBaseUrl == undefined
    ) {
        throw 'Could not retrive the salesforce ssm config';
    }
    return Promise.resolve({
        clientId,
        clientSecret,
        username,
        password,
        token,
        authenticationBaseUrl,
        queryBaseUrl,
    });
}

interface PhoneRecord {
    subscriptionName: string;
    phoneNumber: string;
}

export type PhoneBook = PhoneRecord[];

export async function getPhoneBook(): Promise<PhoneBook> {
    return Promise.resolve([]);
}
