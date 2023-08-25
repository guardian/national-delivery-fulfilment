import moment from 'moment';
const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;

export function make1() {
  const csvStringifier = createCsvStringifier({
    header: [
        {id: 'name', title: 'NAME'},
        {id: 'lang', title: 'LANGUAGE'}
    ]
  });

  const records = [
    {name: 'Bob',  lang: 'French, English'},
    {name: 'Mary', lang: 'English'}
  ];

  console.log(csvStringifier.getHeaderString());
  console.log(csvStringifier.stringifyRecords(records));

  return csvStringifier.stringifyRecords(records);
}