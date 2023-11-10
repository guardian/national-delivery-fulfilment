import moment from 'moment';
import type { Moment } from 'moment';

function something(m: Moment) {
	console.log(m.format('YYYY-MM-DD'));
}

const m = moment();
something(m);

// Note: The original solution was `function something(m: ReturnType<typeof moment>)`
// Note that `function something(m: moment.Moment)` without the `import type { Moment }` would have worked.
