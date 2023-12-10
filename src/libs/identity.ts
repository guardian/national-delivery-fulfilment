import axios from 'axios';
import { getSsmValue } from '../utils/ssm';

interface IdAPIUserConsent {
    status: string;
}

export async function fetchIdentityAPIToken(stage: string) {
    return await getSsmValue(stage, 'IdAPI-BearerToken');
}

async function queryUserDetailsFromIdAPI(
    identityId: string,
    identityAPIBearerToken: string,
): Promise<IdAPIUserConsent> {
    console.log(
        `Query IdAPI for identityId ${identityId} with token ${identityAPIBearerToken}`,
    );

    const url = `https://idapi.theguardian.com/user/${identityId}`;

    console.log(`url: ${url}`);

    const params = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${identityAPIBearerToken}`,
        },
    };

    const response = await axios.get(url, params);
    /*
        response.data is a
        {
            "status": "ok",
            "user": {
                "primaryEmailAddress": "[REMOVED]",
                "id": "[REMOVED]",
                "publicFields": {
                    "displayName": "user"
                },
                "dates": {
                    "accountCreatedDate": "2018-12-03T10:22:45Z"
                },
                "consents": [
                    [....],
                    {
                        "actor": "user",
                        "id": "your_support_onboarding",
                        "version": 0,
                        "consented": true,
                        "timestamp": "2023-10-23T14:15:04Z",
                        "privacyPolicyVersion": 1
                    },
                    {
                        "actor": "user",
                        "id": "similar_guardian_products",
                        "version": 0,
                        "consented": true,
                        "timestamp": "2023-10-23T14:15:04Z",
                        "privacyPolicyVersion": 1
                    },
                    {
                        "actor": "user",
                        "id": "supporter_newsletter",
                        "version": 0,
                        "consented": true,
                        "timestamp": "2023-10-23T14:15:04Z",
                        "privacyPolicyVersion": 1
                    }
                ],
                "hasPassword": true
            }
        }
    */
    return (await response.data) as IdAPIUserConsent;
}

export async function validateIdentityIdForPhoneNumberInclusion(
    stage: string,
    identityId: string,
    identityAPIBearerToken: string,
): Promise<boolean> {
    if (stage === 'CODE') {
        return true; // The ids in Saleforce CODE might not validate against idAPI PROD, but we want the phone numbers in CODE
    }
    let userDetailsFromIdAPI;
    try {
        userDetailsFromIdAPI = await queryUserDetailsFromIdAPI(
            identityId,
            identityAPIBearerToken,
        );
        userDetailsFromIdAPI;
        return true; // TODO: !!
    } catch (err) {
        console.error(err);
        return false; // We isolate any caller from any failure of connecting to the identityAPI, by returning a proper boolean, `false` in this case
    }
}
