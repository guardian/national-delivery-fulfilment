
import axios from 'axios';
import { FileRecord, transform1, transform2 } from './transforms'

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