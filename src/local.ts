import moment from 'moment';
import {
    subscriptionsToFileRecords,
    fileRecordsToCSVFile,
    subscriptionsDataFileToSubscriptions,
    excludeHolidaySubscriptions,
    holidayNamesDataFileToNames,
    retainCorrectSubscriptions,
} from './libs/transforms';
import { cycleDataFilesFromZuora } from './libs/zuora';

async function generateFileForDay(zuoraBearerToken: string, dayIndex: number) {
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

    const stage = 'CODE';

    const zuoraDataFiles = await cycleDataFilesFromZuora(
        stage,
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

    // This one is async because to make a file record a phone
    const fileRecords = await subscriptionsToFileRecords(
        'CODE',
        subsWithoutHolidayStops,
        sentDate,
        deliveryDate,
        [],
        'identityIdAPIBearerToken',
    );
    const file2 = fileRecordsToCSVFile(fileRecords);
    console.log('file2:');
    console.log(file2);
}

generateFileForDay(`[zuora bearer token]`, 5).then((result) => {
    console.log('completed');
    console.log(result);
});
