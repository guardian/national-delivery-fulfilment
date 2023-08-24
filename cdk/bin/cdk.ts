import "source-map-support/register";
// https://github.com/guardian/cdk/blob/main/src/experimental/riff-raff-yaml-file/README.md 
import { GuRootExperimental } from "@guardian/cdk/lib/experimental/constructs/root";
import { NationalDeliveryFulfilment } from "../lib/national-delivery-fulfilment";

const app = new GuRootExperimental();
new NationalDeliveryFulfilment(app, "NationalDeliveryFulfilment-CODE", { 
    env: { region: 'eu-west-1' },
    stack: "membership", 
    stage: "CODE" 
});
new NationalDeliveryFulfilment(app, "NationalDeliveryFulfilment-PROD", { 
    env: { region: 'eu-west-1' },
    stack: "membership", 
    stage: "PROD" 
});
