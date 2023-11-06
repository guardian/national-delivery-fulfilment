
### National Delivery Fulfilment Lambda

The national delivery fulfilment lambda generates the files used by Paperround for delivery.

For deployment see `MemSub::Fulfilment::NationalDelivery` in Riff-Raff.

The files are generated in the membership account, by the two lambda functions

```
- membership-national-delivery-fulfilment-CODE
- membership-national-delivery-fulfilment-PROD
```


and put in the two S3 buckets:

```
- national-delivery-fulfilment-prod
- national-delivery-fulfilment-code
```

Each file is named after the day it was generated for, using the naming convention YYYY-MM-DD.csv, for instance 2023-11-01.csv for the file generated for 1 November 2023. The files are located in a hierarchical structure in the bucket following the convention

```
[bucket]/fulfilment/YYYY/YYYY-MM/YYYY-MM-DD.csv
```

For instance the file 2023-11-01.csv, will be located at

```
[bucket]/fulfilment/2023/2023-11/2023-11-01.csv
```

We generates 14 files starting from the day after. For instance on the 2nd of November 2023, we generate all files for 2023-11-03 up to 2023-11-16. The program internally refers to those dates by their index. Index 1 for tomorrow (aka: today + 1 day), etc., up to index 14.

### Generation strategy

The generation of one file is an atomic operation in the sense that it's performed by one single asynchronous function (see code for detail). We are going to retain that design principle and we can keep it as long at it remains true that a single file takes less than 15 mins to be generated. If one day that premisse cease to be true, then a small redesign will be required. At the time these line are written (Oct 2023), the generation takes few seconds in CODE and about 5 mins (300 seconds) in PROD.

The lambda is set up to run each hour and it generates the next file every hour. It generates all 14 files during the first 14 hours of the day. (And, currently, there actually is two generations of files 1 to 10. For instance the first file, the file for "tomorrow", is generated at 00:30 and at 14:30)

It is also possible to generate a particular file in the aws console (see next section). In this case, just provide the file index as input to the lambda. A single number, for instance 10, given as imput to the lambda is going to ensure that the file with index 10 (corresponding to 10 days in the future) is going to be generated during one run of the lambda. Note that is it not currently offered to generate more than one file per run of the lambda (actually it's perfectly possible but we simply not provide that ability, mostly because it would only really be relevant in CODE).

### Generate a specific file from the AWS console.

To generate a specific file from the AWS console, you need to specify the day you want to run and for this you will use a day index. It's simply a integer number of days from today (1 for tomorrow, etc). To do so use an event as follow (for instance for index 3)

```
{
  "dayIndex": 3
}
```

### Local developement

```
$ yarn install --frozen-lockfile
```

### Building Cloudformation

Upon any modification of the cloud formation, the smapshot needs to be updated in the source code. For this, move to the `cdk` folder and run.

```
$ npm test -- -u
```

### Playground

Playground is a directory that was used during initial development, it's going to be removed shortly after we go live.

- `$ npx ts-node src/playground/s3.ts`
- `$ npx ts-node src/playground/zuora.ts`
  
### Running on local

- running local.ts

```
$ npx ts-node src/local.ts
```
