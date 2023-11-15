import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'; // ES Modules import
import { Region } from './config';

// https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/ssm/command/GetParametersByPathCommand/

export async function getSsmValue(stage: string, id: string) {
  const name = `/membership/national-delivery-fulfilment/${stage}/${id}`;
  const client = new SSMClient({ region: Region });
  const input = {
    Name: name,
  };
  const command = new GetParameterCommand(input);
  const response = await client.send(command);
  return response.Parameter?.Value;
}
