import { getSecret } from '../utils/secretsManager';

export interface SalesforceConfig {
    authUrl: string;
    clientId: string;
    clientSecret: string;
}

export interface SalesforceBearerInformation {
    access_token: string;
    instance_url: string;
}

interface PhoneBookQueryAnswerItem {
    Name: string;
    Buyer__r: {
        Phone: string | null;
        IdentityID__c: string | null;
    };
}

interface PhoneBookQueryAnswerData {
    records: PhoneBookQueryAnswerItem[];
}

export interface PhoneRecord {
    subscriptionName: string;
    phoneNumber: string | null;
    identityId: string | null;
}

export type PhoneBook = PhoneRecord[];

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

export function parseSalesforceConfig(secret: unknown): SalesforceConfig {
    if (
        typeof secret !== 'object' ||
        secret === null ||
        !('authUrl' in secret) ||
        !isNonEmptyString(secret.authUrl) ||
        !('clientId' in secret) ||
        !isNonEmptyString(secret.clientId) ||
        !('clientSecret' in secret) ||
        !isNonEmptyString(secret.clientSecret)
    ) {
        throw new Error(
            'Salesforce connected app secret must contain non-empty authUrl, clientId and clientSecret fields',
        );
    }

    return {
        authUrl: secret.authUrl,
        clientId: secret.clientId,
        clientSecret: secret.clientSecret,
    };
}

export async function makeSalesforceConfig(
    secretName: string,
): Promise<SalesforceConfig> {
    return parseSalesforceConfig(await getSecret(secretName));
}

export function buildSalesforceAuthBody(
    salesforceConfig: SalesforceConfig,
): URLSearchParams {
    return new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: salesforceConfig.clientId,
        client_secret: salesforceConfig.clientSecret,
    });
}

export async function getSalesforceBearerInformation(
    salesforceConfig: SalesforceConfig,
): Promise<SalesforceBearerInformation> {
    console.log('Querying bearer token from Salesforce');

    const response = await fetch(salesforceConfig.authUrl, {
        method: 'POST',
        body: buildSalesforceAuthBody(salesforceConfig),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    if (!response.ok) {
        throw new Error(
            `Salesforce authentication failed with status ${response.status}`,
        );
    }

    return (await response.json()) as SalesforceBearerInformation;
}

async function runPhoneBookQuery(
    bearerInformation: SalesforceBearerInformation,
): Promise<PhoneBookQueryAnswerData> {
    console.log('Running phone book query');

    const query =
        "SELECT Name, Buyer__r.IdentityID__c, Buyer__r.Phone FROM SF_Subscription__c WHERE Product__c = 'Newspaper - National Delivery'";
    const url = `${
        bearerInformation.instance_url
    }/services/data/v46.0/query/?q=${encodeURIComponent(query)}`;
    console.log(url);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${bearerInformation.access_token}`,
        },
    });
    /*
        response.data is a
            {
                "totalSize": 131,
                "done": true,
                "records": Item[]
            }

        where:
            Item = 
                {
                    "attributes": {
                        "type": "SF_Subscription__c",
                        "url": "/services/data/v46.0/sobjects/SF_Subscription__c/a2F9E000007TOk3UAG"
                    },
                    "Name": "A-S00648323",
                    "Buyer__r": {
                        "attributes": {
                            "type": "Contact",
                            "url": "/services/data/v46.0/sobjects/Contact/0039E00001nw7LKQAY"
                        },
                        "IdentityID__c": "200138950",
                        "Phone": null
                    }
                }
            */
    return (await response.json()) as PhoneBookQueryAnswerData;
}

function phoneBookQueryAnswerDataToPhoneBookRecords(
    data: PhoneBookQueryAnswerData,
): PhoneBook {
    return data.records.map((item) => {
        return {
            subscriptionName: item.Name,
            phoneNumber: item.Buyer__r.Phone,
            identityId: item.Buyer__r.IdentityID__c,
        };
    });
}

export async function getPhoneBook(
    salesforceConfig: SalesforceConfig,
): Promise<PhoneBook> {
    const bearerInformation =
        await getSalesforceBearerInformation(salesforceConfig);
    const phoneBookQueryAnswerData = await runPhoneBookQuery(bearerInformation);
    console.log(
        `phoneBookQueryAnswerData: ${JSON.stringify(phoneBookQueryAnswerData)}`,
    );
    const phoneBook = phoneBookQueryAnswerDataToPhoneBookRecords(
        phoneBookQueryAnswerData,
    );
    return phoneBook;
}
