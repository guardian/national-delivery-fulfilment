import axios from 'axios';
import { getSsmValue } from '../utils/ssm';

export interface SalesforceSSMConfig {
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
    token: string; // used in complete to the password when retriving the bearer token
    authenticationBaseUrl: string; // used to retrive the bearer token
    queryBaseUrl: string; // used to run the query
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

async function getSalesforceBearerToken(
    saleforceSSMConfig: SalesforceSSMConfig,
): Promise<string> {
    console.log('Querying bearer token from Salesforce');

    const requestBody =
        `grant_type=password` +
        `&client_id=${saleforceSSMConfig.clientId}` +
        `&client_secret=${saleforceSSMConfig.clientSecret}` +
        `&username=${saleforceSSMConfig.username}` +
        `&password=${saleforceSSMConfig.password}${saleforceSSMConfig.token}`;

    console.log(requestBody);

    const url = `${saleforceSSMConfig.authenticationBaseUrl}/services/oauth2/token`;

    console.log(url);

    try {
        const params = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        };
        const response = await axios.post(url, requestBody, params);
        return (await response.data)['access_token'] as string;
    } catch (error) {
        throw new Error(
            `error while retrieving salesforce bearer token: ${error}`,
        );
    }
}

async function runPhoneBookQuery(bearerToken: string): Promise<string> {
    bearerToken;
    return '';
}

function phoneBookFileToRecords(file: string): PhoneBook {
    file;
    return [];
}

interface PhoneRecord {
    subscriptionName: string;
    phoneNumber: string;
}

export type PhoneBook = PhoneRecord[];

export async function getPhoneBook(
    saleforceSSMConfig: SalesforceSSMConfig,
): Promise<PhoneBook> {
    const bearerToken = await getSalesforceBearerToken(saleforceSSMConfig);
    console.log(`bearerToken: ${bearerToken}`);
    const phoneBookFile = await runPhoneBookQuery(bearerToken);
    const phoneBook = phoneBookFileToRecords(phoneBookFile);
    return phoneBook;
}
