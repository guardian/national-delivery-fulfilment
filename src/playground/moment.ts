import moment from 'moment';

function something(m: ReturnType<typeof moment>) {
  console.log(m.format("YYYY-MM-DD"));
}

const m = moment();
something(m);
