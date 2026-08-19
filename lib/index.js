'use strict'

const DEFAULT_BASE_URL = 'https://api.viertechsolutions.com'

class VierApiError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'VierApiError'
    this.status = options.status || 0
    this.code = options.code || null
    this.data = options.data
    this.url = options.url || null
  }
}

class VierApi {
  constructor(options = {}) {
    if (typeof options === 'string') {
      options = { apiKey: options }
    }

    this.apiKey = String(
      options.apiKey ||
      process.env.VIER_API_KEY ||
      process.env.VIER_APIKEY ||
      ''
    ).trim()

    this.baseURL = String(
      options.baseURL ||
      process.env.VIER_API_URL ||
      DEFAULT_BASE_URL
    ).replace(/\/+$/, '')

    this.timeout = Math.max(
      1000,
      Number(options.timeout || process.env.VIER_API_TIMEOUT || 15000)
    )

    this.userAgent = String(
      options.userAgent || 'VierTech-Node-SDK/1.0'
    )

    this.licenseToken = String(
      options.licenseToken ||
      process.env.VIER_LICENSE_TOKEN ||
      ''
    ).trim()

    this.defaultHeaders = {
      ...(options.headers || {})
    }
  }

  setApiKey(apiKey) {
    this.apiKey = String(apiKey || '').trim()
    return this
  }

  setLicenseToken(token) {
    this.licenseToken = String(token || '').trim()
    return this
  }

  setBaseURL(baseURL) {
    this.baseURL = String(baseURL || DEFAULT_BASE_URL).replace(/\/+$/, '')
    return this
  }

  buildURL(pathname, params = {}) {
    const path = String(pathname || '')
    const url = /^https?:\/\//i.test(path)
      ? new URL(path)
      : new URL(path.startsWith('/') ? path : `/${path}`, `${this.baseURL}/`)

    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return

      if (Array.isArray(value)) {
        value.forEach(item => url.searchParams.append(key, String(item)))
      } else {
        url.searchParams.set(key, String(value))
      }
    })

    return url
  }

  async request(pathname, options = {}) {
    const {
      method = 'GET',
      params = {},
      body,
      headers = {},
      responseType = 'json',
      timeout = this.timeout,
      apiKey = this.apiKey,
      licenseToken = this.licenseToken,
      unwrap = true
    } = options

    const url = this.buildURL(pathname, params)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), Math.max(1000, Number(timeout)))

    const requestHeaders = {
      accept: responseType === 'buffer' ? '*/*' : 'application/json',
      'user-agent': this.userAgent,
      ...this.defaultHeaders,
      ...headers
    }

    if (apiKey) requestHeaders['x-api-key'] = apiKey
    if (licenseToken) requestHeaders['x-vier-license'] = licenseToken

    const upperMethod = String(method).toUpperCase()
    let payload

    if (body !== undefined && body !== null && !['GET', 'HEAD'].includes(upperMethod)) {
      if (
        Buffer.isBuffer(body) ||
        typeof body === 'string' ||
        body instanceof URLSearchParams ||
        (typeof FormData !== 'undefined' && body instanceof FormData)
      ) {
        payload = body
      } else {
        requestHeaders['content-type'] =
          requestHeaders['content-type'] || 'application/json'
        payload = JSON.stringify(body)
      }
    }

    try {
      const response = await fetch(url, {
        method: upperMethod,
        headers: requestHeaders,
        body: payload,
        signal: controller.signal
      })

      if (responseType === 'buffer') {
        if (!response.ok) {
          throw new VierApiError(`Vier API HTTP ${response.status}`, {
            status: response.status,
            url: url.toString()
          })
        }
        return Buffer.from(await response.arrayBuffer())
      }

      if (responseType === 'text') {
        const text = await response.text()
        if (!response.ok) {
          throw new VierApiError(`Vier API HTTP ${response.status}`, {
            status: response.status,
            data: text,
            url: url.toString()
          })
        }
        return text
      }

      const raw = await response.text()
      let data

      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        throw new VierApiError(
          `Vier API membalas non-JSON (HTTP ${response.status})`,
          {
            status: response.status,
            data: raw,
            url: url.toString()
          }
        )
      }

      if (!response.ok || data?.status === false) {
        throw new VierApiError(
          data?.message ||
          data?.msg ||
          data?.error ||
          `Vier API HTTP ${response.status}`,
          {
            status: response.status,
            code: data?.error || data?.code || null,
            data,
            url: url.toString()
          }
        )
      }

      return unwrap ? (data?.result ?? data) : data
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new VierApiError(
          `Vier API timeout setelah ${timeout}ms`,
          {
            code: 'ETIMEDOUT',
            url: url.toString()
          }
        )
      }

      if (error instanceof VierApiError) throw error

      throw new VierApiError(
        error?.message || 'Vier API request gagal',
        {
          code: error?.code || null,
          data: error
        }
      )
    } finally {
      clearTimeout(timer)
    }
  }

  get(pathname, params = {}, options = {}) {
    return this.request(pathname, {
      ...options,
      method: 'GET',
      params
    })
  }

  post(pathname, body = {}, options = {}) {
    return this.request(pathname, {
      ...options,
      method: 'POST',
      body
    })
  }

  put(pathname, body = {}, options = {}) {
    return this.request(pathname, {
      ...options,
      method: 'PUT',
      body
    })
  }

  patch(pathname, body = {}, options = {}) {
    return this.request(pathname, {
      ...options,
      method: 'PATCH',
      body
    })
  }

  delete(pathname, options = {}) {
    return this.request(pathname, {
      ...options,
      method: 'DELETE'
    })
  }

  // Convenience helpers. Raw endpoint access remains available through get/request.
  downloader(endpoint, params = {}, options = {}) {
    return this.get(`/v1/downloader/${endpoint}`, params, options)
  }

  sticker(endpoint, params = {}, options = {}) {
    return this.get(`/v1/sticker/${endpoint}`, params, options)
  }

  stalker(endpoint, params = {}, options = {}) {
    return this.get(`/v1/stalker/${endpoint}`, params, options)
  }

  search(endpoint, params = {}, options = {}) {
    return this.get(`/v1/search/${endpoint}`, params, options)
  }

  game(endpoint, params = {}, options = {}) {
    return this.get(`/v1/game/${endpoint}`, params, options)
  }

  ai(endpoint, params = {}, options = {}) {
    return this.get(`/v1/ai/${endpoint}`, params, options)
  }

  scrop(url, style, options = {}) {
    return this.get('/v1/sticker/scrop', {
      url,
      style,
      mode: options.mode || 'plain',
      output: options.output || 'json',
      format: options.format || 'webp'
    })
  }
}

function createVierApi(options = {}) {
  return new VierApi(options)
}

module.exports = VierApi
module.exports.default = VierApi
module.exports.VierApi = VierApi
module.exports.VierApiError = VierApiError
module.exports.createVierApi = createVierApi
module.exports.VERSION = '1.0.0'
