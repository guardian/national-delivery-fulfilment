
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

The generation of one file is an atomic operation in the sense that it's performed by one single asynchronous function (see code for detail). We are going to retain that design principle and we will keep it as long at it remains true that a single file takes less than 15 mins to be generated. If one day that premisse ceases to be true, then a small redesign of this lambda will be required. At the time these lines are written (Oct 2023), the generation takes few seconds in CODE and a couple of minutes (sometimes up to 5 mins, and in extremelly rare cases up to 10 mins) in PROD.

The lambda is set up to run each hour and generates the next file every hour. It generates all 14 files during the first 14 hours of the day. And then regenerate some of the files, during the remaining hours.

It is also possible to manually generate a particular file (or a small number of files) in the aws console (see next section).

### Generate a specific file from the AWS console.

To generate a specific file from the AWS console, you just need to specify the day you want to run. For instance to generate the file with index 3 (meaning the file at current date + 3 days), you provide 

```
{
  "indices": [3]
}
```

To generate the files with index 3, 4 and 7, you provide 

```
{
  "indices": [3, 4, 7]
}
```

Note that if you provide too a many indices, you may cause the lambda to exeed the maximum 15 mins run timespan, so be careful be submitting more than one index. It can be useful to just generate one file to see how fast the process is and then provide more indices. 

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

It is possible to run the file generation process on local if you are investigating something simply by running `src/local.ts`. The first step is to provide a Zuora bearer token for the stage you are targetting and then run.

```
$ npx ts-node src/local.ts
```
