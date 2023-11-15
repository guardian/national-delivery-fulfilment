import { parse } from 'csv-parse/sync';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;

/*
Subscription.Name,
Subscription.DeliveryAgent__c,
SoldToContact.Address1,
SoldToContact.Address2,
SoldToContact.City,
SoldToContact.PostalCode,
SoldToContact.FirstName,
SoldToContact.LastName,
SoldToContact.SpecialDeliveryInstructions__c,
RateplanCharge.quantity
*/

interface ZuoraSubscription {
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
}

/*
Headers and some values of the csv files we are aiming to generate

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
      subscription_name: record[0],
      subscription_delivery_agent: record[1],
      sold_to_address1: record[2],
      sold_to_address2: record[3],
      sold_to_city: record[4],
      sold_to_postal_code: record[5],
      sold_to_first_name: record[6],
      sold_to_last_name: record[7],
      sold_to_special_delivery_instructions: record[8],
      quantity: record[9],
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
  };
}

export function subscriptionsToFileRecords(
  subscriptions: ZuoraSubscription[],
  sentDate: string,
  deliveryDate: string,
): FileRecord[] {
  return subscriptions.map((subscription) =>
    subscriptionToFileRecord(subscription, sentDate, deliveryDate),
  );
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
    ],
    alwaysQuote: true,
  });
  return (
    csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records)
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

function postcodesExclusion(subscription: ZuoraSubscription): boolean {
  // This function was introduced on 8 Nov 2023, to exclude a couple of postcodes
  // that we estimated corresponded to subscriptions that delivery should not happen for.
  // For all intent and purpose this is temporary code, and therefore can be removed
  // later on...
  const postcodes = ['tq122tl', 'tq122tg'];
  const pc = subscription.sold_to_postal_code.toLowerCase().slice(0, 7);
  return postcodes.includes(pc);
}

export function retainCorrectSubscriptions(
  subscriptions: ZuoraSubscription[],
): ZuoraSubscription[] {
  return subscriptions.filter((sub) => {
    return subscriptionIsCorrect(sub) && !postcodesExclusion(sub);
  });
}
