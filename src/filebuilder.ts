import moment from 'moment';
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

export function make1() {
  const csvWriter = createCsvWriter({
    path: 'path/to/file.csv',
    header: [
        {id: 'name', title: 'NAME'},
        {id: 'lang', title: 'LANGUAGE'}
    ]
  });
  return moment().format('MMMM Do YYYY, h:mm:ss a');
}