import { parse } from 'csv-parse/sync';
import { Option } from '../utils/option';
import { PhoneBook } from './salesforce';
import { validateIdentityIdForPhoneNumberInclusion } from './identity';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;

/*
Query fields:
    Subscription.Name,
    Subscription.DeliveryAgent__c,
    SoldToContact.Address1,
    SoldToContact.Address2,
    SoldToContact.City,
    SoldToContact.PostalCode,
    SoldToContact.FirstName,
    SoldToContact.LastName,
    SoldToContact.SpecialDeliveryInstructions__c,
    RateplanCharge.quantity,
    RatePlanCharge.name,
    SoldToContact.workEmail
*/

export interface ZuoraSubscription {
    subscription_name: string;
    subscription_delivery_agent: string;
    sold_to_address1: string;
    sold_to_address2: string;
    sold_to_city: string;
    sold_to_postal_code: string;
    sold_to_first_name: string;
    sold_to_last_name: string;
    sold_to_special_delivery_instructions: string;
    quantity: string;
    workEmail: string;
}

/*
Headers and some values of the csv files we are aiming to generate:
    Customer Reference      : A-S6813425                               # Subscription.Name
    Delivery Reference      : 41285784                                 # (generate randomly)
    Retailer Reference      : 36                                       # Subscription.DeliveryAgent__c
    Customer Full Name      : FirstName LastName                       # SoldToContact.FirstName, SoldToContact.LastName
    Customer Address Line 1 : 15 London Road                           # SoldToContact.Address1
    Customer Address Line 2                                            # SoldToContact.Address1
    Customer Address Line 3                                            # (not defined)
    Customer Town           : Bristol                                  # SoldToContact.City
    Customer PostCode       : SW1A 2AA                                 # SoldToContact.PostalCode
    Delivery Quantity       : 1                                        # RateplanCharge.quantity
    Delivery Information    : Dark green door, post through letterbox  # SoldToContact.SpecialDeliveryInstructions__c
    Sent Date               : 10/07/2023                               # initially equal to Delivery Date, but investigate the meaning
    Delivery Date           : 11/07/2023                               # (generate according to the contextual date)
    Source campaign                                                    # reserved for future use
    Additional Comms                                                   # reserved for future use
    Email                   : luke.skywalker@theresistance.org         # SoldToContact.workEmail
    Phone Number            : 555-1234                                 # Phone number extracted from Salesforce 
*/

export interface FileRecord {
    customerReference: string;
    deliveryReference: string;
    retailerReference: string;
    customerFullName: string;
    customerAddressLine1: string;
    customerAddressLine2: string;
    customerAddressLine3: string;
    customerTown: string;
    customerPostCode: string;
    deliveryQuantity: string;
    deliveryInformation: string;
    sentDate: string;
    deliveryDate: string;
    sourceCampaign: string;
    additionalComms: string;
    email: string;
    phoneNumber: string;
}

export function parseZuoraDataFile(file: string): string[][] {
    const records: string[][] = parse(file);
    records.shift(); // getting rid of the first record containing the columns descriptions
    return records;
}

export function subscriptionsDataFileToSubscriptions(
    file: string,
): ZuoraSubscription[] {
    const records = parseZuoraDataFile(file);
    const subscriptions = records.map((record) => {
        return {
            subscription_name: record[0], // Subscription.Name
            subscription_delivery_agent: record[1], // Subscription.DeliveryAgent__c
            sold_to_address1: record[2], // SoldToContact.Address1
            sold_to_address2: record[3], // SoldToContact.Address2
            sold_to_city: record[4], // SoldToContact.City
            sold_to_postal_code: record[5], // SoldToContact.PostalCode
            sold_to_first_name: record[6], // SoldToContact.FirstName
            sold_to_last_name: record[7], // SoldToContact.LastName
            sold_to_special_delivery_instructions: record[8], // SoldToContact.SpecialDeliveryInstructions__c
            quantity: record[9], // RateplanCharge.quantity
            // RatePlanCharge.name
            workEmail: record[11], // SoldToContact.workEmail
        };
    });
    return subscriptions;
}

export function holidayNamesDataFileToNames(file: string): string[] {
    const splitLines = (str: string) => str.split(/\r?\n/);
    const lines = splitLines(file);
    lines.shift();
    return lines;
}

function stripQuotes(str: string): string {
    // remove double quotes if present, as the supplier's csv parser can't handle the encoded result as per 2.7 of https://datatracker.ietf.org/doc/html/rfc4180#section-2
    return str.replace(/"/g, '');
}

function subscriptionToFileRecord(
    subscription: ZuoraSubscription,
    sentDate: string,
    deliveryDate: string,
    phoneNumber: string,
): FileRecord {
    return {
        customerReference: subscription.subscription_name,
        deliveryReference: `c7a9577c-f198-4ddf-a707-f5f526e3aba5-${subscription.subscription_name}`,
        retailerReference: subscription.subscription_delivery_agent,
        customerFullName: stripQuotes(
            `${subscription.sold_to_first_name} ${subscription.sold_to_last_name}`,
        ),
        customerAddressLine1: stripQuotes(subscription.sold_to_address1),
        customerAddressLine2: stripQuotes(subscription.sold_to_address2),
        customerAddressLine3: '',
        customerTown: stripQuotes(subscription.sold_to_city),
        customerPostCode: stripQuotes(subscription.sold_to_postal_code),
        deliveryQuantity: stripQuotes(subscription.quantity),
        deliveryInformation: stripQuotes(
            subscription.sold_to_special_delivery_instructions,
        ),
        sentDate: sentDate,
        deliveryDate: deliveryDate,
        sourceCampaign: '',
        additionalComms: '',
        email: subscription.workEmail,
        phoneNumber: phoneNumber,
    };
}

export function identityIdLookUp(
    phoneBook: PhoneBook,
    subscriptionName: string,
): Option<string> {
    // Look up the subscription name in the phoneBook and return the phone number if there was one,
    // otherwise return null;
    for (const record of phoneBook) {
        if (record.subscriptionName == subscriptionName) {
            return record.identityId;
        }
    }
    return null;
}

export function phoneNumberLookUp(
    phoneBook: PhoneBook,
    subscriptionName: string,
): Option<string> {
    // Look up the subscription name in the phoneBook and return the phone number if there was one,
    // otherwise return null;
    for (const record of phoneBook) {
        if (record.subscriptionName == subscriptionName) {
            return record.phoneNumber;
        }
    }
    return null;
}

async function subscriptionToOptionalPhoneNumber(
    stage: string,
    phoneBook: PhoneBook,
    subscription: ZuoraSubscription,
    identityAPIBearerToken: string,
): Promise<string> {
    const identityId = identityIdLookUp(
        phoneBook,
        subscription.subscription_name,
    );
    // If we could not determine an identityId, then there will be no phone number
    if (identityId === null || identityId == '') {
        return '';
    }
    if (
        await validateIdentityIdForPhoneNumberInclusion(
            stage,
            identityId,
            identityAPIBearerToken,
        )
    ) {
        return (
            phoneNumberLookUp(phoneBook, subscription.subscription_name) || ''
        );
    } else {
        return '';
    }
}

async function subscriptionToFileRecordWithOptionalPhoneNumber(
    stage: string,
    sentDate: string,
    deliveryDate: string,
    phoneBook: PhoneBook,
    subscription: ZuoraSubscription,
    identityAPIBearerToken: string,
): Promise<FileRecord> {
    const phoneNumber = await subscriptionToOptionalPhoneNumber(
        stage,
        phoneBook,
        subscription,
        identityAPIBearerToken,
    );
    return subscriptionToFileRecord(
        subscription,
        sentDate,
        deliveryDate,
        phoneNumber,
    );
}

export async function subscriptionsToFileRecords(
    stage: string,
    subscriptions: ZuoraSubscription[],
    sentDate: string,
    deliveryDate: string,
    phoneBook: PhoneBook,
    identityAPIBearerToken: string,
): Promise<FileRecord[]> {
    const data = [];
    for (const subscription of subscriptions) {
        const fileRecord =
            await subscriptionToFileRecordWithOptionalPhoneNumber(
                stage,
                sentDate,
                deliveryDate,
                phoneBook,
                subscription,
                identityAPIBearerToken,
            );
        data.push(fileRecord);
    }
    return data;
}

export function fileRecordsToCSVFile(records: FileRecord[]): string {
    const csvStringifier = createCsvStringifier({
        header: [
            { id: 'customerReference', title: 'Customer Reference' },
            { id: 'deliveryReference', title: 'Delivery Reference' },
            { id: 'retailerReference', title: 'Retailer Reference' },
            { id: 'customerFullName', title: 'Customer Full Name' },
            { id: 'customerAddressLine1', title: 'Customer Address Line 1' },
            { id: 'customerAddressLine2', title: 'Customer Address Line 2' },
            { id: 'customerAddressLine3', title: 'Customer Address Line 3' },
            { id: 'customerTown', title: 'Customer Town' },
            { id: 'customerPostCode', title: 'Customer PostCode' },
            { id: 'deliveryQuantity', title: 'Delivery Quantity' },
            { id: 'deliveryInformation', title: 'Delivery Information' },
            { id: 'sentDate', title: 'Sent Date' },
            { id: 'deliveryDate', title: 'Delivery Date' },
            { id: 'sourceCampaign', title: 'Source Campaign' },
            { id: 'additionalComms', title: 'Additional Comms' },
            { id: 'email', title: 'Email' },
            { id: 'phoneNumber', title: 'Phone Number' },
        ],
        alwaysQuote: true,
    });
    return (
        csvStringifier.getHeaderString() +
        csvStringifier.stringifyRecords(records)
    );
}

export function excludeHolidaySubscriptions(
    subcriptions: ZuoraSubscription[],
    names: string[],
): ZuoraSubscription[] {
    return subcriptions.filter((sub) => {
        return !names.includes(sub.subscription_name);
    });
}

function subscriptionIsCorrect(subscription: ZuoraSubscription): boolean {
    // This function decides if a ZuoraSubscription should be actually put into the output file.
    // It was first written to exclude those with an empty delivery agent, during E2E testing.
    // When the data is corrected in Zuora and we guarrantee that no subscription will have
    // missing attribute then we can remove it, otherwise we may end up expanding it to perform
    // some validations
    return subscription.subscription_delivery_agent != '';
}

export function retainCorrectSubscriptions(
    subscriptions: ZuoraSubscription[],
): ZuoraSubscription[] {
    return subscriptions.filter((sub) => subscriptionIsCorrect(sub));
}
