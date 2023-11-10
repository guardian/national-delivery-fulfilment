// axios get
/*
export async function getFileFromZuora (zuoraBearerToken: string): Promise<string> {
  console.log(`fetching file from zuora`);
  const url = `https://apisandbox.zuora.com/apps/api/batch-query/file/8ad09bd38a83a1ba018a84e983400e4d`;
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
*/

// axios post
/*
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
*/
