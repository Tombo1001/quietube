declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient(config: TokenClientConfig): TokenClient
          revoke(token: string, done: () => void): void
        }
      }
    }
  }
}

interface TokenClientConfig {
  client_id: string
  scope: string
  callback: (response: TokenResponse) => void
  error_callback?: (error: { type: string }) => void
}

interface TokenClient {
  requestAccessToken(overrideConfig?: Partial<TokenClientConfig>): void
}

interface TokenResponse {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
  error?: string
  error_description?: string
}

let tokenClient: TokenClient | null = null

export function initAuth(
  clientId: string,
  onSuccess: (token: string) => void,
  onError: (message: string) => void,
) {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube',
    ].join(' '),
    callback: (response) => {
      if (response.error) {
        onError(response.error_description ?? response.error)
        return
      }
      onSuccess(response.access_token)
    },
    error_callback: (error) => {
      if (error.type !== 'popup_closed') {
        onError(`Authentication failed: ${error.type}`)
      }
    },
  })
}

export function requestToken() {
  if (!tokenClient) throw new Error('Auth not initialised — call initAuth first')
  tokenClient.requestAccessToken()
}

export function revokeToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    window.google.accounts.oauth2.revoke(token, resolve)
  })
}
