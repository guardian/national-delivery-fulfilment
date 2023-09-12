import moment from 'moment';
const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;
import { ZuoraSubscription } from './zuora';

/*
Headers and some values of the csv files we are aiming to generate

Customer Reference      : A-S6813425
Delivery Reference      : 41285784
Retailer Reference      : 36
Customer Full Name      : FirstName LastName
Customer Address Line 1 : 15 London Road
Customer Address Line 2
Customer Address Line 3
Customer Town           : Bristol
Customer PostCode       : SW1A 2AA
Delivery Quantity       : 1
Delivery Information    : Dark green door, post through letterbox
Sent Date               : 10/07/2023
Delivery Date           : 11/07/2023
Source campaign
Additional Comms
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

function subscriptionToFileRecord(subscription: ZuoraSubscription): FileRecord {
  return {
    customerReference: subscription.subscription_number, 
    deliveryReference: "41285784",
    retailerReference: "36",
    customerFullName: "FirstName LastName",
    customerAddressLine1: subscription.address,
    customerAddressLine2: "",
    customerAddressLine3: "",
    customerTown: "Bristol",
    customerPostCode: "SW1A 2AA",
    deliveryQuantity: "1",
    deliveryInformation: "Dark green door, post through letterbox",
    sentDate: "10/07/2023",
    deliveryDate: "Delivery Date",
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
        {id: 'deliveryReference', title: 'Delivery Reference'}
    ]
  });
  return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
}