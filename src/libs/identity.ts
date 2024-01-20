import axios from 'axios';
import { getSsmValue } from '../utils/ssm';

interface IdAPIUserConsent {
    status: string;
    user: {
        consents: [
            {
                id: string;
                consented: boolean;
            },
        ];
    };
}

export async function fetchIdentityAPIToken(stage: string) {
    console.log(`fetch identity api token for stage: ${stage}`);
    return await getSsmValue(stage, 'IdAPI-BearerToken');
}

async function queryUserDetailsFromIdAPI(
    identityId: string,
    identityAPIBearerToken: string,
): Promise<IdAPIUserConsent> {
    //console.log(
    //    `Querying IdAPI for identityId ${identityId} with token ${identityAPIBearerToken}`,
    //);

    console.log(`Querying IdAPI for identityId ${identityId}`);

    const url = `https://idapi.theguardian.com/user/${identityId}`;

    //console.log(`url: ${url}`);

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
                        "id": "phone_optout",
                        "version": 0,
                        "consented": false,
                        "timestamp": "2018-12-03T10:22:45Z",
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
        if (userDetailsFromIdAPI.status !== 'ok') {
            return false;
        }
        const consent = userDetailsFromIdAPI.user.consents.find(
            (consent) => consent.id == 'phone_optout',
        );
        /*
            consent is now either underfined or 
            {
                "actor": "user",
                "id": "phone_optout",
                "version": 0,
                "consented": false,
                "timestamp": "2018-12-03T10:22:45Z",
                "privacyPolicyVersion": 1
            }
        */
        if (consent !== undefined) {
            return consent.consented === false; // `false` is the value that we are looking for
            // Means that the user has not consented out of the phone use
        } else {
            return false;
        }
    } catch (err) {
        console.error(err);
        return false; // We isolate any caller from any failure of connecting to the identityAPI, by returning a proper boolean, `false` in this case
    }
}
