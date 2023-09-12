
/*

This section is a note for documentation and learning. The
code examples may have changed after this was written.

The two stacks are defined like this:

```
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
```

And we end up with a snapshot containing this

```
"Environment": {
    "Variables": {
    "APP": "national-delivery-fulfilment",
    "STACK": "membership",
    "STAGE": "CODE",
    },
}
```

So there is apparently a bit of magic that publish the app, stack and stage in the cloudformation.
One interesting thing to note is that the key names are capitalised. This leads to the below definitions

Note that the AWS_REGION is not specifically set, so will always default to `eu-west-1`

*/

export const App = process.env.APP ?? "national-delivery-fulfilment";
export const Stack = process.env.STACK ?? "membership";
export const Stage = process.env.STAGE ?? "CODE";
export const Region = process.env.AWS_REGION ?? "eu-west-1";
