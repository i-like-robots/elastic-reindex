# Elastic Reindex

A simple command line tool to reindex your Elasticsearch data using the [scroll][scroll] and [bulk][bulk] APIs.

This tool has been influenced by the [Elasticsearch reindex tool][reindex-tool] and others. The key feature of this tool is its ability to retry the scroll and bulk update steps if either should fail. 

## Installation

```sh
npm install -g elastic-reindex
```

## Basic usage

To view all options run `elastic-reindex --help`

```sh
elastic-reindex -f http://127.0.0.1:9200/old_index/type -t http://127.0.0.1:9200/new_index/type
```

If you use the AWS Elasticsearch service you can authorise the client by providing your access keys and cluster region:

```sh
elastic-reindex -f http://127.0.0.1:9200/old_index/type -t http://127.0.0.1:9200/new_index/type --access_key 123 --secret_key 456 --region eu-west-1
```

## Advanced usage

For larger indexes it may be sensible to restrict your migration by query. This can be done by passing the `--query_body` parameter and a JSON object.

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

function processBatch (range) {
  const runner = new Runner({
    from: 'http://127.0.0.1:9200/old_index/type',
    to: 'http://127.0.0.1:9200/new_index/type',
    query_body: { query: { range: { publishedDate: range } } }
  })

  return runner.fetchInitial()
}

(function stepBatch () {
  const range = batches.shift()

  console.log(`Working on batch ${range.gte} => ${range.lte}`)

  processBatch(range)
    .then(() => {
      console.log(`Batch ${range.gte} => ${range.lte} complete`)

      if (batches.length) {
        stepBatch()
      }
    })
    .catch((err) => {
      console.error(`Failed on batch ${range.gte} => ${range.lte}`, err)
    })
})()
```

[reindex-tool]: https://www.npmjs.com/package/elasticsearch-reindex
[scroll]: https://www.elastic.co/guide/en/elasticsearch/guide/current/scroll.html
[bulk]: https://www.elastic.co/guide/en/elasticsearch/guide/current/bulk.html
