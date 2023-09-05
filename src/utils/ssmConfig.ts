import { App, Stack, Stage, Region } from "./appConfig";
import { SSMClient, GetParametersByPathCommand, GetParameterCommand } from "@aws-sdk/client-ssm"; // ES Modules import

// https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/ssm/command/GetParametersByPathCommand/

export async function testSsm() {
    const client = new SSMClient({ region: Region });
    const input = {
      Name: "/test/andrea-and-pascal-test-1300",
    };
    const command = new GetParameterCommand(input);
    const response = await client.send(command);
    return response.Parameter?.Value;
}

