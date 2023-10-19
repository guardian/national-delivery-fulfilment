
import axios from 'axios';
import { FileRecord, subscriptionsToFileRecords, fileRecordsToCSVFile } from './transforms'
import { getSsmValue } from '../utils/ssm';
import { sleep } from '../utils/sleep';
import moment from 'moment';

interface ZuoraBearerToken1 {
  access_token: string;
}

interface ZuoraBatchSubmissionReceipt {
  // See the sample in playground/zuora.ts for the full answer.
  // We only need the id, which is what we use to probe termination
  id: string;
}

interface ZuoraBatchJobStatusReceipt {
  status: boolean;
  subscriptionsFileId: string;
  holidayNamesFileId: string;
}

interface ZuoraDataFileIds {
  subscriptionsFileId: string;
  holidayNamesFileId: string;
}

export interface ZuoraDataFiles {
  subscriptionsFile: string;
  holidayNamesFile: string;
}

function authTokenQueryUrl(stage: string) {
  var url = 'https://rest.apisandbox.zuora.com/oauth/token'; // this is the code url
  if (stage === "PROD") {
    url = 'https://rest.zuora.com/oauth/token';
  }
  return url;
}

function zuoraServerUrl(stage: string) {
  var url = 'https://apisandbox.zuora.com'; // this is the code url
  if (stage === "PROD") {
    url = 'https://www.zuora.com';
  }
  return url;
}

async function fetchZuoraBearerToken1(stage: string): Promise<ZuoraBearerToken1> {
  // This function returns the entire answer object from zuora
  // To retrieve the bearer token itself see fetchZuoraBearerToken2
  console.log(`fetching zuora bearer token for stage: ${stage}`);
  const url = authTokenQueryUrl(stage);
  const client_id = await getSsmValue(stage, "zuora-client-id");
  const client_secret = await getSsmValue(stage, "zuora-client-secret");
  const data = {
    client_id: client_id,
    client_secret: client_secret,
    grant_type: "client_credentials"
  }
  const params = {
    headers: {
      "Content-Type": 'application/x-www-form-urlencoded',
    }
  };
  const response = await axios.post(url, data, params);
  return await response.data;
}

export async function fetchZuoraBearerToken2(stage: string): Promise<string> {
  const token1 = await fetchZuoraBearerToken1(stage);
  return token1.access_token;
}

function zuoraBatchQueries(date: string) {
  // https://knowledgecenter.zuora.com/Zuora_Central_Platform/Query/Export_ZOQL

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

  const dayMapping = (index: number): string => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Sunday"];
    return days[index];
  } 

  const dayOfTheWeekNumber = moment(date, "YYYY-MM-DD").day();
  const dayOfTheWeekName = dayMapping(dayOfTheWeekNumber);

  console.log(`date ${date} maps to day ${dayOfTheWeekName}`);

  const subscriptionsQuery = `
    SELECT
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
      RatePlanCharge.name
    FROM
      RatePlanCharge
    WHERE
      Product.ProductType__c = 'Newspaper - National Delivery' 
      and RatePlanCharge.name = '${dayOfTheWeekName}' 
      and RatePlanCharge.effectiveStartDate <= '${date}'
      and (RatePlanCharge.effectiveEndDate >= '${date}' or (Subscription.autoRenew = true and Subscription.status = 'Active'))
      and (Subscription.status = 'Active' or Subscription.status = 'Cancelled')
  `;

  const holidayQuery =  `
    SELECT
      Subscription.Name
    FROM
      RatePlanCharge
    WHERE
      (Subscription.Status = 'Active' OR Subscription.Status = 'Cancelled') AND
      ProductRatePlanCharge.ProductType__c = 'Adjustment' AND
      RatePlanCharge.Name = 'Holiday Credit' AND
      RatePlanCharge.HolidayStart__c <= '${date}' AND
      RatePlanCharge.HolidayEnd__c >= '${date}' AND
      RatePlan.AmendmentType != 'RemoveProduct'
   `;

  return {
    "format": "csv",
    "version": "1.0",
    "name": `National Delivery Fulfilment @ ${date}`,
    "encrypted": "none",
    "useQueryLabels": "true",
    "dateTimeUtc": "true",
    "queries": [{
        "name"  : "national-delivery-fulfilment-subscriptions",
        "query" : subscriptionsQuery,
        "type"  : "zoqlexport"
    },{
      "name"  : "national-delivery-fulfilment-holiday-names",
      "query" : holidayQuery,
      "type"  : "zoqlexport"
  }]
  }
}

async function submitQueryToZuora(stage: string, zuoraBearerToken: string, date: string): Promise<ZuoraBatchSubmissionReceipt> {
  console.log(`date: ${date}; submitting batch queries to zuora`);
  const url = `${zuoraServerUrl(stage)}/apps/api/batch-query/`;
  const data = zuoraBatchQueries(date);
  const params = {
    headers: {
      "Authorization": `Bearer ${zuoraBearerToken}`,
      "Content-Type": 'application/json',
    }
  };
  const response = await axios.post(url, data, params);
  return await response.data as ZuoraBatchSubmissionReceipt;
}

async function checkJobStatus(stage: string, zuoraBearerToken: string, jobId: string, date: string): Promise<ZuoraBatchJobStatusReceipt> {
  console.log(`date: ${date}; check job status: jobId: ${jobId}`);
  const url = `${zuoraServerUrl(stage)}/apps/api/batch-query/jobs/${jobId}`;
  const params = {
    headers: {
      "Authorization": `Bearer ${zuoraBearerToken}`,
      'Content-Type': 'application/json'
    }
  };
  const response = await axios.get(url, params);
  const data = await response.data;
  console.log(`date: ${date}; checkJobStatus: data: ${JSON.stringify(data)}`);

  if (data.status === "completed") {
    return {
      status: true,
      subscriptionsFileId: data.batches.filter((item: {name: string}) => {
        return item.name == "national-delivery-fulfilment-subscriptions";
      })[0].fileId,
      holidayNamesFileId: data.batches.filter((item: {name: string}) => {
        return item.name == "national-delivery-fulfilment-holiday-names";
      })[0].fileId,
    }
  } else {
    return {
      status: false,
      subscriptionsFileId: "",
      holidayNamesFileId: ""
    }
  }
}

async function readDataFileFromZuora(stage: string, zuoraBearerToken: string, fileId: string): Promise<string> {
  const url = `${zuoraServerUrl(stage)}/apps/api/batch-query/file/${fileId}`;
  const params = {
    method: 'GET',
    headers: {
      "Authorization": `Bearer ${zuoraBearerToken}`,
      'Content-Type': 'application/json'
    }
  };
  const response = await axios.get(url, params);
  return await response.data;
}

async function jobIdToFileId(stage: string, zuoraBearerToken: string, jobId: string, date: string): Promise<ZuoraDataFileIds> {
  // Data retrieval from Zuora work like this:
  // 1. We submit a job to Zuora with submitQueryToZuora
  // 2. We get an answer that carries an id that we call the jobId.
  // 3. We probe the server with checkJobStatus *until* we get a ZuoraBatchJobStatusReceipt with status: true
  // 4. That ZuoraBatchJobStatusReceipt will also have a fileId
  // 5. The fileId can be used to retrive the file using readDataFileFromZuora

  // This function essentially perform 3, notably querying the server *until* we get a positive ZuoraBatchJobStatusReceipt
  // It takes the jobId and returns the fileId

  while (true) {
    console.log(`date: ${date}; jobId: ${jobId}; awaiting for fileId`);
    const receipt = await checkJobStatus(stage, zuoraBearerToken, jobId, date);
    console.log(`date: ${date}; receipt: ${JSON.stringify(receipt)}`);
    if (receipt.status) {
      return Promise.resolve(receipt); // The receipt is obtained as a ZuoraBatchJobStatusReceipt and returned as as ZuoraDataFileIds
    }
    await sleep(1*1000); // sleeping for 1 seconds
  }
}

export async function cycleDataFilesFromZuora(stage: string, zuoraBearerToken: string, date: string): Promise<ZuoraDataFiles> {
  console.log(`date: ${date}; cycle data file from zuora`);
  const jobReceipt = await submitQueryToZuora(stage, zuoraBearerToken, date);
  const jobId = jobReceipt.id;
  console.log(`date: ${date}; jobId: ${jobId}`);
  const fileIds = await jobIdToFileId(stage, zuoraBearerToken, jobId, date);
  console.log(`date: ${date}; fileId: ${fileIds}`);
  const subscriptionsFile = await readDataFileFromZuora(stage, zuoraBearerToken, fileIds.subscriptionsFileId);
  const holidayNamesFile = await readDataFileFromZuora(stage, zuoraBearerToken, fileIds.holidayNamesFileId);
  return {
    subscriptionsFile: subscriptionsFile,
    holidayNamesFile: holidayNamesFile
  }
} 
