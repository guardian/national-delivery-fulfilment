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

submitQueryToZuora("[code bearer]").then(data => {
  console.log(data);
})

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