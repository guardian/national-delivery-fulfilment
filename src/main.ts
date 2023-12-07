import moment from 'moment';
import {
    subscriptionsToFileRecords,
    fileRecordsToCSVFile,
    subscriptionsDataFileToSubscriptions,
    excludeHolidaySubscriptions,
    holidayNamesDataFileToNames,
    retainCorrectSubscriptions,
} from './libs/transforms';
import { commitFileToS3_v3 } from './libs/s3';
import { Stage } from './utils/config';
import { cycleDataFilesFromZuora, fetchZuoraBearerToken2 } from './libs/zuora';
import {
    SalesforceSSMConfig,
    getPhoneBook,
    makeSalesforceSSMConfig,
} from './libs/saleforce';

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

    if (indices) {
        for (const i of indices) {
            await generateFileForDay(zuoraBearerToken, salesforceSSMConfig, i);
        }
    } else {
        await generateOneFileUsingCurrentTimeToDeriveDayIndex(
            zuoraBearerToken,
            salesforceSSMConfig,
        );
    }
    console.log('main function has completed');
};

function getDayOffsetToGenerate(): number | null {
    // This function is not pure, its return value depends on the time of the day.
    // It returns ether a number or null.
    // null signifies that a file should not be generated at this time.
    // Otherwise the number id a day index of the file.

    // Rules:
    // - Rule 1: We generate files from index 2 to index 14 (meaning [today]+2 to [today]+14)
    // - Rule 2: We start generation after 1am to let holiday stops finish.
    //           In other words, we do not generate during hour 0 of the day
    // - Rule 3: We only generate index 2 before 10am.

    // The mapping is:
    // Hour 00 -> dayIndex = 1 (index 1 is not generated) Rule 1 and Rule 2
    // Hour 01 -> dayIndex = 2
    // Hour 02 -> dayIndex = 3
    // Hour 03 -> dayIndex = 4
    // Hour 04 -> dayIndex = 5
    // Hour 05 -> dayIndex = 6
    // Hour 06 -> dayIndex = 7
    // Hour 07 -> dayIndex = 8
    // Hour 08 -> dayIndex = 9
    // Hour 09 -> dayIndex = 10
    // Hour 10 -> dayIndex = 11
    // Hour 11 -> dayIndex = 12
    // Hour 12 -> dayIndex = 13
    // Hour 13 -> dayIndex = 14
    // Hour 14 -> dayIndex = 1 (index 1 is not generated) Rule 1
    // Hour 15 -> dayIndex = 2 (index 2 is not generated after 10am) Rule 3
    // Hour 16 -> dayIndex = 3
    // Hour 17 -> dayIndex = 4
    // Hour 18 -> dayIndex = 5
    // etc...

    const dayIndex = 1 + (new Date().getUTCHours() % 14);

    // Rule 1
    if (dayIndex === 1) {
        return null;
    }

    // Rule 2
    if (new Date().getUTCHours() === 0) {
        return null;
    }

    // Rule 3
    if (dayIndex === 2 && new Date().getUTCHours() >= 10) {
        return null;
    }

    return dayIndex;
}

async function generateOneFileUsingCurrentTimeToDeriveDayIndex(
    zuoraBearerToken: string,
    salesforceSSMConfig: SalesforceSSMConfig,
) {
    // This function generates a file whose index is derived from the current hour of the day
    // It is the function that is naturally triggered when the lambda runs on schedule.

    const dayIndex = getDayOffsetToGenerate();

    if (dayIndex === null) {
        return;
    }

    await generateFileForDay(zuoraBearerToken, salesforceSSMConfig, dayIndex);
}

async function generateFileForDay(
    zuoraBearerToken: string,
    salesforceSSMConfig: SalesforceSSMConfig,
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

    const currentSubs = subscriptionsDataFileToSubscriptions(
        zuoraDataFiles.subscriptionsFile,
    );

    const subsWithoutInvalid = retainCorrectSubscriptions(currentSubs);

    const holidaySubscriptionNames = holidayNamesDataFileToNames(
        zuoraDataFiles.holidayNamesFile,
    );

    const subsWithoutHolidayStops = excludeHolidaySubscriptions(
        subsWithoutInvalid,
        holidaySubscriptionNames,
    );

    const sentDate = now.format('DD/MM/YYYY');

    const deliveryDate = cursor.format('DD/MM/YYYY');

    const salesforcePhoneBook = await getPhoneBook(salesforceSSMConfig);

    const fileRecords = subscriptionsToFileRecords(
        subsWithoutHolidayStops,
        sentDate,
        deliveryDate,
        salesforcePhoneBook,
    );

    const file2 = fileRecordsToCSVFile(fileRecords);

    const filePathKey = `fulfilment/${cursor.format('YYYY')}/${cursor.format(
        'YYYY-MM',
    )}/${cursor.format('YYYY-MM-DD')}.csv`;

    await commitFileToS3_v3(Stage, filePathKey, file2);
}
