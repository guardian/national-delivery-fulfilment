interface PhoneRecord {
    subscriptionName: string;
    phoneNumber: string;
}

export type PhoneBook = PhoneRecord[];

export async function getPhoneBook(): Promise<PhoneBook> {
    return Promise.resolve([]);
}
