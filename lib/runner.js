'use strict'

const elasticsearch = require('elasticsearch')
const ProgressBar = require('progress')
const bunyan = require('bunyan')

const PROGRESS_BAR = 'reindexing [:bar] :current/:total (:percent)'

const DEFAULTS = {
  query_size: 100,
  query_body: { query: { match_all: {} } },
  scroll: '2m',
  request_retries: 3,
  request_timeout: 30000
}

class Runner {

  constructor (options) {
    this.progress = new ProgressBar(PROGRESS_BAR, {
      total: 0,
      width: 30
    })

    this.options = Object.assign({}, DEFAULTS, options)

    if (!this.options.from) {
      throw new Error('Source index is required.')
    }

    if (!this.options.to) {
      throw new Error('Target index is required.')
    }

    this.logger = bunyan.createLogger({
      src: true,
      name: 'reindex',
      streams: [{ path: `${process.cwd()}/reindex.log` }]
    })

    this.from = this.createClient(this.options.from)
    this.to = this.createClient(this.options.to)
  }

  createClient (uri) {
    const tokens = uri.replace(/\/$/, '').split('/')
    const res = {}

    if (tokens.length >= 4) {
      res.type = tokens.pop()
      res.index = tokens.pop()
    }

    const config = {
      requestTimeout: this.options.request_timeout,
      keepAlive: true,
      host: tokens.join('/')
    }

    if (this.options.region
      && this.options.access_key
      && this.options.secret_key
      && /\.amazonaws\./.test(uri)) {
      config.connectionClass = require('http-aws-es')

      config.amazonES = {
        accessKey: this.options.access_key,
        secretKey: this.options.secret_key,
        region: this.options.region
      }
    }

    res.client = new elasticsearch.Client(config)

    return res
  }

  fetchInitial () {
    return this.from.client.search({
      index: this.from.index,
      type: this.from.type,
      search_type: 'scan',
      sort: [ '_doc' ],
      scroll: this.options.scroll,
      size: this.options.query_size,
      body: this.options.query_body
    })
      .then((res) => {
        this.progress.total = res.hits.total
        return this.fetchScroll(res._scroll_id)
      })
  }

  fetchScroll (scroll_id, retries) {
    retries = retries !== undefined ? retries : this.options.request_retries

    return this.from.client.scroll({
      scroll: this.options.scroll,
      scroll_id: scroll_id
    })
      .catch((err) => {
        this.logger.error(err.toString())

        if (retries) {
          return this.fetchScroll(scroll_id, retries - 1)
        } else {
          throw new Error('Maximum number of retries for scroll')
        }
      })
      .then((res) => {
        return this.handleScroll(res)
      })
  }

  handleScroll (res) {
    if (res.hits.total === 0) {
      this.logger.info('No documents found')
      return
    }

    return this.pushBulk(res.hits.hits).then(() => {
      this.progress.tick(res.hits.hits.length)

      if (!this.progress.complete) {
        return this.fetchScroll(res._scroll_id)
      }
    })
  }

  pushBulk (docs, retries) {
    retries = retries !== undefined ? retries : this.options.request_retries

    const queue = []

    docs.forEach((item) => {
      queue.push({
        index: { _index: this.to.index, _type: this.to.type, _id: item._id }
      })
      queue.push(item._source)
    })

    return this.to.client.bulk({ body: queue })
      .catch((err) => {
        this.logger.error(err.toString())

        if (retries) {
          return this.pushBulk(docs, retries - 1)
        } else {
          throw new Error('Maximum number of retries for bulk')
        }
      })
  }

}

module.exports = Runner
