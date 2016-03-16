#!/usr/bin/env node

'use strict'

const cli = require('commander')
const Runner = require('./runner')

const coerceInt = (v) => parseInt(v, 10)
const coerceObj = (v) => JSON.parse(v)

cli
  .option('-f, --from <index>', 'Source index, E.G. http://127.0.0.1:9200/old_index/old_type')
  .option('-t, --to <index>', 'Target index, E.G. http://127.0.0.1:9200/new_index/new_type')
  .option('-s, --query_size [n]', 'Query size (per shard)', coerceInt)
  .option('-q, --query_body [value]', 'Query to execute', coerceObj)
  .option('-d, --scroll [value]', 'Length of time to cache scroll', /^\d{1,2}[sm]$/)
  .option('-r, --request_retries [n]', 'Number of request retries', coerceInt)
  .option('-o, --request_timeout [n]', 'Length of time (ms) to wait before timing out', coerceInt)
  .option('-a, --access_key [value]', 'AWS access key')
  .option('-k, --secret_key [value]', 'AWS secret key')
  .option('-z, --region [value]', 'AWS region')
  .parse(process.argv)

const runner = new Runner(cli.opts())

console.log('Reindexing starting, press ctrl + c to cancel…')

runner.fetchInitial()
  .then(() => {
    console.log('\n\nReindexing complete!')
  })
  .catch((err) => {
    console.error('\n\nReindexing failed!', err)
  })
  .then(() => {
    process.exit()
  })
