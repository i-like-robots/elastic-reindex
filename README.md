⚠️ **This tool is no longer maintained** ⚠️

# Elastic Reindex

A simple tool to reindex your Elasticsearch data using the [scroll][scroll] and [bulk][bulk] APIs.

This tool has been influenced by the [Elasticsearch reindex tool][tool] and others. The primary motivation for creating a new tool was the addition of the ability to retry the scroll and bulk update steps if either should fail. 

## Installation

```sh
npm install -g elastic-reindex
```

## Usage

The tool offers both a simple command line interface and module for more advanced use cases.

### Simple CLI

To view all options run `elastic-reindex --help`

```sh
elastic-reindex -f http://127.0.0.1:9200/old_index/type -t http://127.0.0.1:9200/new_index/type
```

If you use the AWS Elasticsearch service you can authorise the client by providing your access keys and cluster region:

```sh
elastic-reindex -f http://127.0.0.1:9200/old_index/type -t http://127.0.0.1:9200/new_index/type --access_key 123 --secret_key 456 --region eu-west-1
```

And you can also configure the number of retries and length of time to store each scroll:

```sh
elastic-reindex -f http://127.0.0.1:9200/old_index/type -t http://127.0.0.1:9200/new_index/type -r 5 -d 180s
```

### Advanced use cases

For larger indexes it may be sensible to restrict your migration by query. This can be done by passing the `--query_body` parameter and a stringified JSON object.

Alternatively, you could include the runner into your code and create a custom reindex script. For example when working with large indexes it can be useful to split reindexing into batches:

```js
const Runner = require('elastic-reindex')

const batches = [
  { gte: '2014-01-01', lte: '2014-06-30' },
  { gte: '2014-07-01', lte: '2014-12-31' },
  { gte: '2015-01-01', lte: '2015-06-30' },
  { gte: '2015-07-01', lte: '2015-12-31' },
  { gte: '2016-01-01', lte: '2016-06-30' },
  { gte: '2016-07-01', lte: '2016-12-31' }
]

function processBatch (daterange) {
  const runner = new Runner({
    from: 'http://127.0.0.1:9200/old_index/type',
    to: 'http://127.0.0.1:9200/new_index/type',
    query_body: { query: { range: { publishedDate: daterange } } }
  })

  return runner.fetchInitial()
}

(function nextBatch () {
  const batch = batches.shift()

  console.log(`Working on batch ${batch.gte} => ${batch.lte}`)

  processBatch(batch)
    .then(() => {
      console.log(`Batch ${batch.gte} => ${batch.lte} complete`)

      if (batches.length) {
        nextBatch()
      }
    })
    .catch((err) => {
      console.error(`Failed on batch ${batch.gte} => ${batch.lte}`, err)
    })
})()
```

[tool]: https://www.npmjs.com/package/elasticsearch-reindex
[scroll]: https://www.elastic.co/guide/en/elasticsearch/guide/current/scroll.html
[bulk]: https://www.elastic.co/guide/en/elasticsearch/guide/current/bulk.html
