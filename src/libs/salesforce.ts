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

export async function makeSalesforceSSMConfig(
    stage: string,
): Promise<SalesforceSSMConfig> {
    console.log(`make salesforce config for stage: ${stage}`);
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
        const response = await fetch(url, {
            method: 'POST',
            body: new URLSearchParams(requestBody),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        return (await response.json()) as SalesforceBearerInformation;
    } catch (error) {
        throw new Error(
            `error while retrieving salesforce bearer token: ${error}`,
        );
    }
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
    saleforceSSMConfig: SalesforceSSMConfig,
): Promise<PhoneBook> {
    const bearerInformation =
        await getSalesforceBearerInformation(saleforceSSMConfig);
    const phoneBookQueryAnswerData = await runPhoneBookQuery(bearerInformation);
    console.log(
        `phoneBookQueryAnswerData: ${JSON.stringify(phoneBookQueryAnswerData)}`,
    );
    const phoneBook = phoneBookQueryAnswerDataToPhoneBookRecords(
        phoneBookQueryAnswerData,
    );
    return phoneBook;
}
