
import axios from 'axios';
import { FileRecord, transform1, transform2 } from './transforms'
import { getSsmValue } from '../utils/ssmConfig';

export interface ZuoraSubscription {
    subscription_number: string,
    address: string
}

export async function mockZuoraAquaQuery(): Promise<ZuoraSubscription[]> {

  const subscription1 = {
    subscription_number: "A000001",
    address: "90 York way"
  }

  const subscription2 = {
    subscription_number: "A000002",
    address: "1 Alice Road"
  }

  return Promise.resolve([subscription1, subscription2]);
}

export async function getFileFromZuora (authorization: string): Promise<string> {

  console.log(`fetching file from zuora`);
  
  const url = `https://apisandbox.zuora.com/apps/api/batch-query/file/8ad080d88a44581b018a51562f281fed`;
  const params = {
    method: 'GET',
    headers: {
      "Authorization": authorization,
      'Content-Type': 'application/json'
    }
  };

  const response = await axios.get(url, params);
  return await response.data;
}

async function constructFile(): Promise<string> {
  const subscriptions: ZuoraSubscription[] = await mockZuoraAquaQuery(); 
  const records: FileRecord[] = transform1(subscriptions);
  const filecontents = transform2(records);
  return filecontents;
}

function stageToAuthTokenUrl(stage: string) {
  var url = 'https://rest.apisandbox.zuora.com/oauth/token'; // this is the code url
  if (stage === "PROD") {
    url = 'https://rest.zuora.com/oauth/token';
  }
  return url;
}

interface ZuoraBearerToken1 {
  access_token: string;
}

export async function fetchZuoraBearerToken1(stage: string): Promise<ZuoraBearerToken1> {
  // This function returns the entire answer object from zuora
  // To retrieve the bearer token itself see fetchZuoraBearerToken2
  console.log(`fetching zuora bearer token for stage: ${stage}`);
  const url = stageToAuthTokenUrl(stage);
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