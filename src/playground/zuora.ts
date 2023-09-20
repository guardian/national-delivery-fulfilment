import axios from 'axios';

import { cycleDataFileFromZuora } from '../libs/zuora';
import moment from 'moment';
import { sleep } from '../utils/sleep';

export async function getFile (): Promise<string> {
  console.log(`fetching file from zuora`);
  const url = `https://apisandbox.zuora.com/apps/api/batch-query/file/8ad09bd38a83a1ba018a84e983400e4d`;
  const params = {
    headers: {
      "Authorization": 'Bearer [removed]',
      'Content-Type': 'application/json'
    }
  };
  const response = await axios.get(url, params);
  return await response.data;
}

//getFile().then(file => {
//  console.log(file);
//})

export async function fetchZuoraBearerToken() {
  console.log(`fetching zuora bearer token`);
  const url = `https://rest.apisandbox.zuora.com/oauth/token`;
  const data = {
    client_id: "[removed]",
    grant_type: "client_credentials",
    client_secret: "[removed]"
  }
  const params = {
    headers: {
      "Content-Type": 'application/x-www-form-urlencoded',
    }
  };
  const response = await axios.post(url, data, params);
  return await response.data;
}

// fetchZuoraBearerToken().then(data => {
//  console.log(data);
// })

export async function submitQueryToZuora(zuoraBearerToken: string) {
  console.log(`submit query to zuora`);

  const url = `https://apisandbox.zuora.com/apps/api/batch-query/`;
  const data = {
    "format": "csv",
    "version": "1.0",
    "name": "Pascal 2023-09-01 15:00",
    "encrypted": "none",
    "useQueryLabels": "true",
    "dateTimeUtc": "true",
    "queries": [{
        "name"  : "alice",
        "query" : "SELECT Subscription.Name FROM RatePlanCharge WHERE Product.ProductType__c = 'Newspaper - National Delivery'",
        "type"  : "zoqlexport"
    }]
  }
  const params = {
    headers: {
      "Authorization": `Bearer ${zuoraBearerToken}`,
      "Content-Type": 'application/json',
    }
  };
  const response = await axios.post(url, data, params);
  return await response.data;
}

//submitQueryToZuora("[code bearer]").then(data => {
//  console.log(data);
//})

/*
{
  encrypted: 'none',
  useLastCompletedJobQueries: false,
  status: 'submitted',
  batches: [
    {
      localizedStatus: 'pending',
      full: true,
      status: 'pending',
      recordCount: 0,
      apiVersion: '137.0',
      batchId: '8ad099a98a8748cc018a88ea775b7343',
      batchType: 'zoqlexport',
      name: 'alice',
      query: "SELECT Subscription.Name FROM RatePlanCharge WHERE Product.ProductType__c = 'Newspaper - National Delivery'"
    }
  ],
  version: '1.0',
  format: 'CSV',
  name: 'Pascal 2023-09-01 15:00',
  id: '8ad099a98a8748cc018a88ea775a7342',
  offset: 0
}
*/

interface ZuoraBatchJobStatusReceipt {
  status: boolean;
  fileId?: string;
}

export async function checkJobStatus(zuoraBearerToken: string, jobId: string): Promise<ZuoraBatchJobStatusReceipt> {
  console.log(`check job status: jobId: ${jobId}`);
  const url = `https://apisandbox.zuora.com/apps/api/batch-query/jobs/${jobId}`;
  const params = {
    headers: {
      "Authorization": `Bearer ${zuoraBearerToken}`,
      'Content-Type': 'application/json'
    }
  };
  const response = await axios.get(url, params);
  const data = await response.data
  if (data.status) {
    // The id to use is batches.fileId
    return {
      status: true,
      fileId: data.batches[0].fileId
    }
  } else {
    return {
      status: false
    }
  }
}

/*
{
  encrypted: 'none',
  useLastCompletedJobQueries: false,
  status: 'completed',
  batches: [
    {
      localizedStatus: 'completed',
      full: true,
      status: 'completed',
      recordCount: 17614,
      fileId: '8ad080d88a8742ab018a890186eb36f9',
      apiVersion: '137.0',
      batchId: '8ad09be48a8748d2018a8901819c0e17',
      batchType: 'zoqlexport',
      name: 'alice',
      message: '',
      query: "SELECT Subscription.Name FROM RatePlanCharge WHERE Product.ProductType__c = 'Newspaper - National Delivery'"
    }
  ],
  startTime: '2023-09-12T11:48:11+0100',
  version: '1.0',
  format: 'CSV',
  name: 'Pascal 2023-09-01 15:00',
  id: '8ad09be48a8748d2018a8901819c0e16',
  offset: 0
}
*/

//checkJobStatus("[removed]", "8ad09be48a8748d2018a8901819c0e16").then(data => {
//  console.log(data);
//})

// ------------------------------------------------------------------

/*
export async function cycle (zuoraBearerToken: string): Promise<string> {
  const file1 = await cycleDataFileFromZuora("CODE", zuoraBearerToken);
  return Promise.resolve(file1);
};
*/

//cycle("[removed]").then(file => { // 11:03
//  console.log(file.split(/\r?\n/).slice(0, 20).join("\n"));
//})

export async function testing (zuoraBearerToken: string): Promise<string> {
  for (const i of Array(14).keys()) {
    console.log(`i: ${i}`);
    console.log(`timestamp: ${Date.now()}`);
    const cursor = moment().add(i, "days");
    const date = cursor.format("YYYY-MM-DD");
    console.log(`date: ${date}`);
    const file1 = await cycleDataFileFromZuora("CODE", zuoraBearerToken, date);
    //const subscriptions = zuoraDataFileToSubscriptions(file1);
    //const fileRecords = subscriptionsToFileRecords(subscriptions);
    //const file2 = fileRecordsToCSVFile(fileRecords);
    //const filePathKey = `fulfilment/${cursor.format("YYYY")}/${cursor.format("YYYY-MM")}/${cursor.format("YYYY-MM-DD")}.csv`;
    //await commitFileToS3_v3(Stage, filePathKey, file2);
    //await sleep(2000); // sleeping 2 seconds
  }
  return Promise.resolve("ending");
};

testing("e8ab18c553ea4536a4d9abe8107f37da").then(data => {
  console.log(data);
})
