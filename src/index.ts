import { Handler } from 'aws-lambda';
import { main } from './main';

export const handler: Handler = async (event) => {
    /*

  We receive two kinds of events, either the event sent by AWS during the scheduled run, which looks like this:
    {
        "version": "0",
        "id": "f53402cc-287b-663b-f734-31ea35f66df9",
        "detail-type": "Scheduled Event",
        "source": "aws.events",
        "account": "[removed]",
        "time": "2023-10-29T20:30:00Z",
        "region": "eu-west-1",
        "resources": [
            "arn:aws:events:[removed]"
        ],
        "detail": {}
    }

    ... or a user defined event, which is expected to be like this: 
    {
        "indices": [3, 4, 7]
    }
    // See description in the readme for details. 

  */

    await main(event['indices']);
};
