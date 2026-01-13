export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_POLICY_DESCRIPTION =
  'Must be at least 8 characters and include uppercase, lowercase, number, and symbol.';

/**
 * Validate password strength according to a shared policy.
 *
 * @param password - Password string to validate
 * @param fieldLabel - Label to use in error messages (e.g. "Password", "New password")
 * @returns Error message string if invalid, otherwise null
 */
export function getPasswordValidationError(
  password: string,
  fieldLabel: string = 'Password'
): string | null {
  if (!password) {
    return `${fieldLabel} is required.`;
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return `${fieldLabel} must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
  }

  if (!/[A-Z]/.test(password)) {
    return `${fieldLabel} must include at least one uppercase letter.`;
  }

  if (!/[a-z]/.test(password)) {
    return `${fieldLabel} must include at least one lowercase letter.`;
  }

  if (!/[0-9]/.test(password)) {
    return `${fieldLabel} must include at least one number.`;
  }

  if (!/[!@#$%^&*(),.?":{}|<>_\-\\[\];'`~+/=]/.test(password)) {
    return `${fieldLabel} must include at least one symbol (e.g. !, @, #, $).`;
  }

  return null;
}

