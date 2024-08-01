import moment from 'moment';
import {
    subscriptionsToFileRecords,
    fileRecordsToCSVFile,
    subscriptionsDataFileToSubscriptions,
    excludeHolidaySubscriptions,
    holidayNamesDataFileToNames,
    retainCorrectSubscriptions,
    ZuoraSubscription,
    FileRecord,
} from './libs/transforms';
import { commitFileToS3_v3 } from './libs/s3';
import { Stage } from './utils/config';
import { cycleDataFilesFromZuora, fetchZuoraBearerToken2 } from './libs/zuora';
import {
    PhoneBook,
    SalesforceSSMConfig,
    getPhoneBook,
    makeSalesforceSSMConfig,
} from './libs/salesforce';
import { fetchIdentityAPIToken } from './libs/identity';

export const main = async (indices?: number[]) => {
    console.log(
        `main function is starting with indices: ${JSON.stringify(indices)}`,
    );

    // The indices is either not defined if this was a scheduled run,
    // or are the indices requested by the user from a manual run in the aws console.

    const zuoraBearerToken = await fetchZuoraBearerToken2(Stage);
    if (!zuoraBearerToken) {
        const message = 'Could not extract a bearer token from zuora';
        console.log(message);
        throw message;
    }

    const salesforceSSMConfig = await makeSalesforceSSMConfig(Stage);
    if (!zuoraBearerToken) {
        const message = 'Could not extract salesforce ssm config';
        console.log(message);
        throw message;
    }

    const identityAPIBearerToken = await fetchIdentityAPIToken(Stage);
    if (!identityAPIBearerToken) {
        const message = 'Could not extract identityAPIBearerToken';
        console.log(message);
        throw message;
    }

    if (indices) {
        for (const i of indices) {
            await generateFileForDay(
                zuoraBearerToken,
                salesforceSSMConfig,
                identityAPIBearerToken,
                i,
            );
        }
    } else {
        await generateOneFileUsingCurrentTimeToDeriveDayIndex(
            zuoraBearerToken,
            salesforceSSMConfig,
            identityAPIBearerToken,
        );
    }
    console.log('main function has completed');
};

function getDayOffsetToGenerate(): number | null {
    // This function is not pure, its return value depends on the time of the day.
    // It returns ether a number or null.
    // null signifies that a file should not be generated at this time.
    // Otherwise the number id a day index of the file.

    const dayIndexesForHour:Record<number, number> = {
        5: 2, // used if all working days
        6: 3, // used on thursday for sunday
        7: 4, // used on thursday for monday
        8: 5, // used on thursday for tuesday (if monday is a bank holiday)
        9: 6, // used on wednesday for tuesday (if its easter weekend)
        10: 7, // preview
        11: 8, // preview
        12: 9, // preview
        13: 10, // preview
        14: 11, // preview
        15: 12, // preview
        16: 13, // preview
        17: 14, // preview
    };

    let currentHour: number = new Date().getUTCHours();

    const dayIndex: number | null = dayIndexesForHour[currentHour] || null;

    return dayIndex;
}

async function generateOneFileUsingCurrentTimeToDeriveDayIndex(
    zuoraBearerToken: string,
    salesforceSSMConfig: SalesforceSSMConfig,
    identityAPIBearerToken: string,
) {
    // This function generates a file whose index is derived from the current hour of the day
    // It is the function that is naturally triggered when the lambda runs on schedule.

    const dayIndex = getDayOffsetToGenerate();

    if (dayIndex === null) {
        return;
    }

    await generateFileForDay(
        zuoraBearerToken,
        salesforceSSMConfig,
        identityAPIBearerToken,
        dayIndex,
    );
}

async function generateFileForDay(
    zuoraBearerToken: string,
    salesforceSSMConfig: SalesforceSSMConfig,
    identityAPIBearerToken: string,
    dayIndex: number,
) {
    // This function generates one file. The date of the file that is being generated is derived from the dayIndex
    // dayIndex = 1 -> tomorrow
    // dayIndex = 2 -> two days from now, etc...

    // The file generation is a linear sequence of steps that essentially perform 3 main operations:

    // 1. Retrieve subscription and holiday data from Zuora
    // 2. combine the two datasets using pure functions
    // 3. Write the resulting file into S3

    console.log(`Generating dayIndex: ${dayIndex}`);

    const now = moment();
    const cursor = moment().add(dayIndex, 'days');

    const today = now.format('YYYY-MM-DD');
    const targetDate = cursor.format('YYYY-MM-DD');

    console.log(`today: ${today}`);
    console.log(`targetDate: ${targetDate}`);

    const zuoraDataFiles = await cycleDataFilesFromZuora(
        Stage,
        zuoraBearerToken,
        targetDate,
        today,
    );

    const currentSubs: ZuoraSubscription[] =
        subscriptionsDataFileToSubscriptions(zuoraDataFiles.subscriptionsFile);

    const correctSubs: ZuoraSubscription[] =
        retainCorrectSubscriptions(currentSubs);

    const holidaySubscriptionNames: string[] = holidayNamesDataFileToNames(
        zuoraDataFiles.holidayNamesFile,
    );

    const subsWithoutHolidayStops: ZuoraSubscription[] =
        excludeHolidaySubscriptions(correctSubs, holidaySubscriptionNames);

    const sentDate: string = now.format('DD/MM/YYYY');

    const deliveryDate: string = cursor.format('DD/MM/YYYY');

    const salesforcePhoneBook: PhoneBook =
        await getPhoneBook(salesforceSSMConfig);

    console.log(`salesforcePhoneBook: ${JSON.stringify(salesforcePhoneBook)}`);

    // Originally this was a pure function but it is now async because of the IDAPI lookup
    const fileRecords: FileRecord[] = await subscriptionsToFileRecords(
        Stage,
        subsWithoutHolidayStops,
        sentDate,
        deliveryDate,
        salesforcePhoneBook,
        identityAPIBearerToken,
    );

    const file2 = fileRecordsToCSVFile(fileRecords);

    const filePathKey = `fulfilment/${cursor.format('YYYY')}/${cursor.format(
        'YYYY-MM',
    )}/${cursor.format('YYYY-MM-DD')}.csv`;

    await commitFileToS3_v3(Stage, filePathKey, file2);

    console.log(`Generated file for targetDate: ${targetDate}`);
}
