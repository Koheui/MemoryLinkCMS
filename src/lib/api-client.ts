// A singleton API client to ensure the token is set globally.

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers || {});
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }
    // Ensure Content-Type is set only for methods that typically have a body.
    const method = options.method?.toUpperCase() || 'GET';
    if (!headers.has('Content-Type') && ['POST', 'PUT', 'PATCH'].includes(method)) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...options,
      method,
      headers,
    });

    return response;
  }
}

export const apiClient = new ApiClient();
