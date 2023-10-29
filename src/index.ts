
import { Handler } from 'aws-lambda';
import { main } from "./main";

export const handler: Handler = async (event, context) => {
  await main(event);
}
