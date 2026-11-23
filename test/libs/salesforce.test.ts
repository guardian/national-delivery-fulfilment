import { afterEach, describe, expect, jest, test } from '@jest/globals';
import {
    buildSalesforceAuthBody,
    getSalesforceBearerInformation,
    parseSalesforceConfig,
    SalesforceConfig,
} from '../../src/libs/salesforce';

const salesforceConfig: SalesforceConfig = {
    authUrl: 'https://example.my.salesforce.com/services/oauth2/token',
    clientId: 'client-id',
    clientSecret: 'client-secret',
};

describe('Salesforce authentication', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('parses a complete connected app secret', () => {
        expect(parseSalesforceConfig(salesforceConfig)).toEqual(
            salesforceConfig,
        );
    });

    test('rejects an incomplete connected app secret', () => {
        expect(() =>
            parseSalesforceConfig({
                authUrl: salesforceConfig.authUrl,
                clientId: salesforceConfig.clientId,
            }),
        ).toThrow(
            'Salesforce connected app secret must contain non-empty authUrl, clientId and clientSecret fields',
        );
    });

    test('uses the client credentials grant without user credentials', () => {
        const body = buildSalesforceAuthBody(salesforceConfig);

        expect(Object.fromEntries(body.entries())).toEqual({
            grant_type: 'client_credentials',
            client_id: 'client-id',
            client_secret: 'client-secret',
        });
        expect(body.has('username')).toBe(false);
        expect(body.has('password')).toBe(false);
    });

    test('authenticates with the connected app credentials', async () => {
        const authResponse = {
            access_token: 'token',
            instance_url: 'https://example.my.salesforce.com',
        };
        const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => authResponse,
        } as Response);

        await expect(
            getSalesforceBearerInformation(salesforceConfig),
        ).resolves.toEqual(authResponse);
        expect(fetchMock).toHaveBeenCalledWith(salesforceConfig.authUrl, {
            method: 'POST',
            body: buildSalesforceAuthBody(salesforceConfig),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
    });

    test('reports an unsuccessful authentication response', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: false,
            status: 401,
        } as Response);

        await expect(
            getSalesforceBearerInformation(salesforceConfig),
        ).rejects.toThrow('Salesforce authentication failed with status 401');
    });
});
