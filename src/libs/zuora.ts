
import axios from 'axios';

export interface ZuoraSubscription {
    subscription_number: string,
    address: string
}

export async function query1(): Promise<ZuoraSubscription[]> {

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

export async function getFile (): Promise<string> {

  console.log(`fetching file from zuora`);
  
  const url = `https://apisandbox.zuora.com/apps/api/batch-query/file/8ad080d88a44581b018a51562f281fed`;
  const authorization = 'Basic [REMOVED]';
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