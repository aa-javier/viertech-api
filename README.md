# @viertechjs/api

Official Node.js SDK for **Vier API**.

## Install

```bash
npm install @viertechjs/api
```

## CommonJS

```js
const { VierApi } = require('@viertechjs/api')

const api = new VierApi({
  apiKey: process.env.VIER_API_KEY
})

const result = await api.get('/v1/sticker/scrop', {
  url: 'https://example.com/image.jpg',
  style: 'love'
})
```

## ESM

```js
import VierApiPackage from '@viertechjs/api'

const { VierApi } = VierApiPackage
const api = new VierApi({ apiKey: process.env.VIER_API_KEY })
```

## Authentication

The SDK sends the Vier API key using:

```text
x-api-key
```

A commercial bot license session can optionally be attached using:

```js
api.setLicenseToken(token)
```

which sends:

```text
x-vier-license
```

## Generic request

```js
await api.get('/v1/example', { query: 'hello' })

await api.post('/v1/example', {
  message: 'hello'
})
```

## Convenience helpers

```js
await api.downloader('tiktok', { url })
await api.sticker('scrop', { url, style: 'love' })
await api.stalker('instagram', { username })
await api.search('google', { query })
await api.game('tebak-buah')
await api.ai('example', { prompt })
```

Raw endpoint access remains available so the SDK does not need to be republished
every time Vier API adds a new endpoint.

## Requirements

Node.js 18 or newer.

## License

MIT.
