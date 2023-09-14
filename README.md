
### Bucket Names

```
- national-delivery-fulfilment-prod
- national-delivery-fulfilment-code
```

### Building Cloudformation

inside the `cdk` folder

```
$ yarn install --frozen-lockfile
$ npm test -- -u # accepting a new cdk snapshot
```

### Playground

- `$ npx ts-node src/playground/s3.ts`
- `$ npx ts-node src/playground/zuora.ts`
  
### Running on local

- running main.ts
  
  1. `$ npx ts-node src/main.ts`
