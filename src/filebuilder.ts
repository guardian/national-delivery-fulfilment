import * as csv from 'fast-csv'
import moment from 'moment';

export function make1() {
  return moment().format('MMMM Do YYYY, h:mm:ss a');
}