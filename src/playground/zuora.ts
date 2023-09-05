import axios from 'axios';

export async function getFile (): Promise<string> {
  console.log(`fetching file from zuora`);
  const url = `https://apisandbox.zuora.com/apps/api/batch-query/file/8ad080d88a44581b018a51562f281fed`;
  const params = {
    method: 'GET',
    headers: {
      "Authorization": 'Basic [REMOVED]',
      'Content-Type': 'application/json'
    }
  };

  const response = await axios.get(url, params);
  return await response.data;
}

getFile().then(file => {
  console.log(file);
})
