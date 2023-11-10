import { ZuoraDataFiles, cycleDataFilesFromZuora } from '../libs/zuora';

async function nslog(): Promise<ZuoraDataFiles> {
	return await cycleDataFilesFromZuora('CODE', '[removed]', '2023-09-27');
}

nslog().then((data) => console.log(data.subscriptionsFile));
