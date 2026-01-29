/**
 * Unified API client with error handling and type safety
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface FetchOptions extends RequestInit {
  params?: Record<string, any>
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: 'Request failed' }))
    throw new ApiError(
      error.error || error.message || 'Request failed',
      response.status,
      error
    )
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T
  }

  return response.json()
}

function buildUrl(endpoint: string, params?: Record<string, any>): string {
  const url = new URL(endpoint, window.location.origin)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  return url.toString()
}

export const apiClient = {
  async get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    const url = buildUrl(endpoint, options?.params)
    const response = await fetch(url, {
      ...options,
      method: 'GET',
      headers: {
        ...options?.headers
      }
    })
    return handleResponse<T>(response)
  },

  async post<T>(
    endpoint: string,
    data?: any,
    options?: FetchOptions
  ): Promise<T> {
    const url = buildUrl(endpoint, options?.params)
    const response = await fetch(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: data instanceof FormData ? data : JSON.stringify(data)
    })
    return handleResponse<T>(response)
  },

  async patch<T>(
    endpoint: string,
    data?: any,
    options?: FetchOptions
  ): Promise<T> {
    const url = buildUrl(endpoint, options?.params)
    const response = await fetch(url, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: JSON.stringify(data)
    })
    return handleResponse<T>(response)
  },

  async put<T>(
    endpoint: string,
    data?: any,
    options?: FetchOptions
  ): Promise<T> {
    const url = buildUrl(endpoint, options?.params)
    const response = await fetch(url, {
      ...options,
      method: 'PUT',
      headers: {
        ...options?.headers
      },
      body: data
    })
    return handleResponse<T>(response)
  },

  async delete<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    const url = buildUrl(endpoint, options?.params)
    const response = await fetch(url, {
      ...options,
      method: 'DELETE'
    })
    return handleResponse<T>(response)
  }
}
