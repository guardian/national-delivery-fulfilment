
import axios from 'axios';
import { FileRecord, subscriptionsToFileRecords, fileRecordsToCSVFile } from './transforms'
import { getSsmValue } from '../utils/ssm';
import { sleep } from '../utils/sleep';

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
  fileId: string;
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
  console.log(data);
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

async function submitQueryToZuora(stage: string, zuoraBearerToken: string): Promise<ZuoraBatchSubmissionReceipt> {
  console.log(`submit query to zuora`);
  const url = `${zuoraServerUrl(stage)}/apps/api/batch-query/`;
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
  return await response.data as ZuoraBatchSubmissionReceipt;
}

async function checkJobStatus(stage: string, zuoraBearerToken: string, jobId: string): Promise<ZuoraBatchJobStatusReceipt> {
  console.log(`check job status: jobId: ${jobId}`);
  const url = `${zuoraServerUrl(stage)}/apps/api/batch-query/jobs/${jobId}`;
  const params = {
    headers: {
      "Authorization": `Bearer ${zuoraBearerToken}`,
      'Content-Type': 'application/json'
    }
  };
  const response = await axios.get(url, params);
  const data = await response.data;
  console.log(`checkJobStatus: data: ${JSON.stringify(data)}`);
  if (data.status === "completed") {
    return {
      status: true,
      fileId: data.batches[0].fileId
    }
  } else {
    return {
      status: false,
      fileId: ""
    }
  }
}

async function readDataFileFromZuora(stage: string, zuoraBearerToken: string, fileId: string): Promise<string> {
  console.log(`fetching file from zuora, fileId: ${fileId}`);
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

async function jobIdToFileId(stage: string, zuoraBearerToken: string, jobId: string): Promise<string> {
  // Data retrieval from Zuora work like this:
  // 1. We submit a job to Zuora with submitQueryToZuora
  // 2. We get an answer that carries an id that we call the jobId.
  // 3. We probe the server with checkJobStatus *until* we get a ZuoraBatchJobStatusReceipt with status: true
  // 4. That ZuoraBatchJobStatusReceipt will also have a fileId
  // 5. The fileId can be used to retrive the file using readDataFileFromZuora

  // This function essentially perform 3, notably querying the server *until* we get a positive ZuoraBatchJobStatusReceipt
  // It takes the jobId and returns the fileId

  console.log(`jobId: ${jobId}; awaiting for fileId`);

  const receipt = await checkJobStatus(stage, zuoraBearerToken, jobId);
  console.log(`receipt: ${JSON.stringify(receipt)}`);
  if (receipt.status) {
    return (receipt.fileId);
  } else {
    await sleep(10*1000); // sleeping for 10 seconds
    return await jobIdToFileId(stage, zuoraBearerToken, jobId);
  }
}

export async function cycleDataFileFromZuora(stage: string, zuoraBearerToken): Promise<string> {
  console.log("cycle data file from zuora");
  const jobReceipt = await submitQueryToZuora(stage, zuoraBearerToken);
  const jobId = jobReceipt.id;
  const fileId = await jobIdToFileId(stage, zuoraBearerToken, jobId);
  const file = await readDataFileFromZuora(stage, zuoraBearerToken, fileId);
  return file;
} 
