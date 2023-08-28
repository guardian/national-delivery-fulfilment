import moment from 'moment';
const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;
import { ZuoraSubscription } from './zuora';

export interface FileRecord {
  name: string, 
  lang: string
}

export function transform1(subscriptions: ZuoraSubscription[]): FileRecord[] {
  const csvStringifier = createCsvStringifier({
    header: [
        {id: 'name', title: 'NAME'},
        {id: 'lang', title: 'LANGUAGE'}
    ]
  });

  const records = subscriptions.map(() => {
    return {name: 'Mary', lang: 'English'}
  })

  return records;
}

export function transform2(records: FileRecord[]): string {

  const csvStringifier = createCsvStringifier({
    header: [
        {id: 'name', title: 'NAME'},
        {id: 'lang', title: 'LANGUAGE'}
    ]
  });
  // console.log(csvStringifier.getHeaderString());

  // console.log(csvStringifier.stringifyRecords(records));

  return csvStringifier.stringifyRecords(records);
}