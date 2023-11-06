import { describe, expect, jest, test } from '@jest/globals';
import { parseZuoraDataFile } from '../../src/libs/transforms'

describe('region', () => {

    test('check the correct parsing of the zuora data file', () => {

        // This was introduced mostly to ensure that "S. Albert, Daniel" is correctly interpreted.

        const file = `Subscription.Name,Subscription.DeliveryAgent__c,SoldToContact.Address1,SoldToContact.Address2,SoldToContact.City,SoldToContact.PostalCode,SoldToContact.FirstName,SoldToContact.LastName,SoldToContact.SpecialDeliveryInstructions__c,RatePlanCharge.Quantity,RatePlanCharge.Name
A-12504406,2710,1 Upper Road,,StarCity,123 456,Alice,Skywalker,,1,Sunday
A-438e04a7,2010,22 London Road,,Hastings,TN00 678,Darth,Vader,"leave it to the doids",1,Sunday
A-ecabd840,1648,"The Grand Cottage, City Road",Bristol,West Midlands,000 7FO,"S. Albert, Daniel",Palpatine,,1,Sunday`;

    const expected = [
      [
        'A-12504406', '2710',
        '1 Upper Road',   '',
        'StarCity',       '123 456',
        'Alice',          'Skywalker',
        '',               '1',
        'Sunday'
      ],
      [
        'A-438e04a7',
        '2010',
        '22 London Road',
        '',
        'Hastings',
        'TN00 678',
        'Darth',
        'Vader',
        'leave it to the doids',
        '1',
        'Sunday'
      ],
      [
        'A-ecabd840',
        '1648',
        'The Grand Cottage, City Road',
        'Bristol',
        'West Midlands',
        '000 7FO',
        'S. Albert, Daniel',
        'Palpatine',
        '',
        '1',
        'Sunday'
      ]
    ]

        expect(parseZuoraDataFile(file)).toEqual(expected);
    });

});


