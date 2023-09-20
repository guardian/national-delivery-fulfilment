import moment from 'moment';
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
  subscription_name: string,
  subscription_delivery_agent: string,
  sold_to_address1: string,
  sold_to_address2: string,
  sold_to_city: string,
  sold_to_postal_code: string,
  sold_to_first_name: string,
  sold_to_last_name: string,
  sold_to_special_delivery_instructions: string,
  quantity: string
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

export function subscriptionsDataFileToSubscriptions(file: string): ZuoraSubscription[] {
  const splitLines = str => str.split(/\r?\n/);
  const lines = splitLines(file);
  lines.shift();
  const subscriptions = lines.map((line) => {
    const elements = line.split(",");
    return {
      subscription_name: elements[0],
      subscription_delivery_agent: elements[1],
      sold_to_address1: elements[2],
      sold_to_address2: elements[3],
      sold_to_city: elements[4],
      sold_to_postal_code: elements[5],
      sold_to_first_name: elements[6],
      sold_to_last_name: elements[7],
      sold_to_special_delivery_instructions: elements[8],
      quantity: elements[9]
    }
  });
  return subscriptions;
}

export function holidayNamesDataFileToNames(file: string): string[] {
  const splitLines = str => str.split(/\r?\n/);
  const lines = splitLines(file);
  lines.shift();
  return lines;
}

function subscriptionToFileRecord(subscription: ZuoraSubscription): FileRecord {
  return {
    customerReference: subscription.subscription_name, 
    deliveryReference: `c7a9577c-f198-4ddf-a707-f5f526e3aba5-${subscription.subscription_name}`,
    retailerReference: subscription.subscription_delivery_agent,
    customerFullName: `${subscription.sold_to_first_name} ${subscription.sold_to_last_name}`,
    customerAddressLine1: subscription.sold_to_address1,
    customerAddressLine2: subscription.sold_to_address2,
    customerAddressLine3: "",
    customerTown: subscription.sold_to_city,
    customerPostCode: subscription.sold_to_postal_code,
    deliveryQuantity: subscription.quantity,
    deliveryInformation: subscription.sold_to_special_delivery_instructions,
    sentDate: "15/07/2023",
    deliveryDate: "15/07/2023",
    sourceCampaign: "",
    additionalComms: ""
  }
}

export function subscriptionsToFileRecords(subscriptions: ZuoraSubscription[]): FileRecord[] {
  return subscriptions.map((subscription) => subscriptionToFileRecord(subscription));
}

export function fileRecordsToCSVFile(records: FileRecord[]): string {
  const csvStringifier = createCsvStringifier({
    header: [
        {id: 'customerReference', title: 'Customer Reference'},
        {id: 'deliveryReference', title: 'Delivery Reference'},
        {id: 'retailerReference', title: 'Retailer Reference'},
        {id: 'customerFullName',  title: 'Customer Full Name'},
        {id: 'customerAddressLine1', title: 'Customer Address Line 1'},
        {id: 'customerAddressLine2', title: 'Customer Address Line 2'},
        {id: 'customerAddressLine3', title: 'Customer Address Line 3'},
        {id: 'customerTown', title: 'Customer Town'},
        {id: 'customerPostCode', title: 'Customer PostCode'},
        {id: 'deliveryQuantity', title: 'Delivery Quantity'},
        {id: 'deliveryInformation', title: 'Delivery Information'},
        {id: 'sentDate', title: 'Sent Date'},
        {id: 'deliveryDate', title: 'Delivery Date'},
        {id: 'sourceCampaign', title: 'Source Campaign'},
        {id: 'additionalComms', title: 'Additional Comms'}
      ]
  });
  return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
}

export function excludeHolidaySubscriptions(subcriptions: ZuoraSubscription[], names: string[]): ZuoraSubscription[] {
  return subcriptions.filter(sub => {
    return !names.includes(sub.subscription_name);
  });
}