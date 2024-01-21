
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

**Rule 1**: How do we generate the files ? 

The generation of one file is an atomic operation in the sense that it's performed by one single asynchronous function (see code for detail). We are going to retain that design principle and we will keep it as long at it remains true that a single file takes less than 15 mins to be generated. If one day that premisse ceases to be true, then a small redesign of this lambda will be required. At the time these lines are written (Oct 2023), the generation takes few seconds in CODE and a couple of minutes (sometimes up to 5 mins, and in extremelly rare cases up to 10 mins -- which seem to coincide with Zuora being busy in some early hours of the day) in PROD.

The lambda is set up to generate one file per hour.

We are generating the fulfilment files using two queries to Zuora, which retrieve the main datafiles we use to generate the fulfilment records. The main datafile contains the subscriptions and the second contains holiday information that we use to filter some subscriptions away. We then perform a query to Saleforce to retrieve phone numbers that are going to be used to build a PhoneBook from which phone numbers are read and optionaly added to a fulfilment record.

So in essence we use two queries from Zuora and one from Saleforce. 

With that said we also need to query the Identity API to check that the user has given consent to use their phone numbers in this way. For this we need to check that the user's `phone_optout` consent is set to `false`.

The need to query the IDAPI for each record might be re-engineered in the future, but for the moment that's how it is implemented (came with [new fields in fulfilment files: email and phone number](https://github.com/guardian/national-delivery-fulfilment/pull/29)).

**Rule 2**: Which files are we generating ?

The lambda generates all files from [today]+2 to [today]+14. (We do not generate the file for the same day, [today]+0, but we do not generate tomorrow's file [today]+1 either. This was agreed with PPR.)

**Rule 3**: When are we generating the files ?

We do not generate any file at hour 0 (meaning between midnight and 1am). There are various overnight processes that start a mid-night that we do not want to be in a race condition with. (This is a Guardian recommendation.)

We must generate the [today]+2 file before 10am, but to avoid being in a race condition with PPR, we must not (regenerate) it after 10am. (This is part of the specs agreed with PPR.)

We must try to generate the files for the next couple of working days before 10am, including when if they occur after a long week and and extra public holidays. (This is a Guardian recommendation.)

Note that the above timings should be independant to UK daylight savings. AWS times are always in UTC (I think), but generation before 10am is always local time.

It is possible to manually generate a particular file (or a small number of files) in the aws console (see next section).

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

Upon closing the repository, run:

```
$ yarn install --frozen-lockfile
```

To comply with the linting rules, run:

```
$ yarn lint
$ yarn lint --fix
```

before making your commits.

You might also want to run

```
$ yarn test-coverage
```

To check if testing is within requirements

### Building Cloudformation

Upon any modification of the cloud formation, the smapshot needs to be updated in the source code. For this, move to the `cdk` folder and run.

```
$ npm test -- -u
```
  
### Running on local

It is possible to run the file generation process on local if you are investigating something simply by running `src/local.ts`. The first step is to provide a Zuora bearer token for the stage you are targetting and then run.

```
$ npx ts-node src/local.ts
```
