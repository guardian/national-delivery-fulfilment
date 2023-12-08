import axios from 'axios';
import { getSsmValue } from '../utils/ssm';

export interface SalesforceSSMConfig {
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
    token: string; // used in complete to the password when retriving the bearer token
    authenticationBaseUrl: string; // used to retrive the bearer token
}

export interface SalesforceBearerInformation {
    access_token: string;
    instance_url: string;
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
    if (
        clientId === undefined ||
        clientSecret === undefined ||
        username === undefined ||
        password === undefined ||
        token === undefined ||
        authenticationBaseUrl == undefined
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
    });
}

async function getSalesforceBearerInformation(
    saleforceSSMConfig: SalesforceSSMConfig,
): Promise<SalesforceBearerInformation> {
    console.log('Querying bearer token from Salesforce');

    const requestBody =
        `grant_type=password` +
        `&client_id=${saleforceSSMConfig.clientId}` +
        `&client_secret=${saleforceSSMConfig.clientSecret}` +
        `&username=${saleforceSSMConfig.username}` +
        `&password=${saleforceSSMConfig.password}${saleforceSSMConfig.token}`;

    const url = `${saleforceSSMConfig.authenticationBaseUrl}/services/oauth2/token`;

    try {
        const params = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        };
        const response = await axios.post(url, requestBody, params);
        return (await response.data) as SalesforceBearerInformation;
    } catch (error) {
        throw new Error(
            `error while retrieving salesforce bearer token: ${error}`,
        );
    }
}

async function runPhoneBookQuery(
    bearerInformation: SalesforceBearerInformation,
): Promise<string> {
    console.log('Running phone book query');

    const query =
        "SELECT Name, Buyer__r.Phone FROM SF_Subscription__c WHERE Product__c = 'Newspaper - National Delivery'";
    const url = `${
        bearerInformation.instance_url
    }/services/data/v46.0/query/?q=${encodeURIComponent(query)}`;
    console.log(url);
    const params = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${bearerInformation.access_token}`,
        },
    };
    const response = await axios.get(url, params);
    return await response.data;
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
    const bearerInformation =
        await getSalesforceBearerInformation(saleforceSSMConfig);
    const phoneBookFile = await runPhoneBookQuery(bearerInformation);
    console.log(phoneBookFile);
    const phoneBook = phoneBookFileToRecords(phoneBookFile);
    return phoneBook;
}
