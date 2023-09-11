import axios from 'axios';

export async function getFile (): Promise<string> {
  console.log(`fetching file from zuora`);
  const url = `https://apisandbox.zuora.com/apps/api/batch-query/file/8ad080d88a44581b018a51562f281fed`;
  const params = {
    headers: {
      "Authorization": 'Basic [REMOVED]',
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