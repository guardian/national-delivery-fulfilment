
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
