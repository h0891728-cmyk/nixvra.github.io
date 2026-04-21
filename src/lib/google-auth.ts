/**
 * Maps login page error query params to user-friendly messages.
 */
export const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  no_account: 'No account found for that Google address. Contact your workspace admin.',
  token_failed: 'Google authentication failed. Please try again.',
  oauth_denied: 'Google sign-in was cancelled.',
  no_email: 'Could not retrieve your email from Google. Please try again.',
  profile_failed: 'Failed to fetch your Google profile. Please try again.',
  server_error: 'An unexpected error occurred. Please try again.',
  invalid_state: 'Invalid authentication request. Please try again.',
  google_disabled: 'Google Sign-In has been disabled for this workspace. Use email & password instead.',
}
