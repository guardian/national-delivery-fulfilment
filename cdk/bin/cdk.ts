import "source-map-support/register";

import { NationalDeliveryFulfilment } from "../lib/national-delivery-fulfilment";
import { App } from 'aws-cdk-lib';

const app = new App();
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
