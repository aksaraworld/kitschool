/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return {
    valid: pattern.test(email),
    message: pattern.test(email) ? undefined : 'Email tidak valid'
  };
}

/**
 * Validate Indonesian phone number
 */
export function validatePhone(phone: string): ValidationResult {
  const pattern = /^(\+62|62|0)[0-9]{9,13}$/;
  return {
    valid: pattern.test(phone),
    message: pattern.test(phone) ? undefined : 'Nomor telepon tidak valid'
  };
}

/**
 * Validate password
 */
export function validatePassword(password: string, minLength: number = 8): ValidationResult {
  if (password.length < minLength) {
    return {
      valid: false,
      message: `Password harus minimal ${minLength} karakter`
    };
  }

  const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]/;
  const valid = pattern.test(password);
  
  return {
    valid,
    message: valid ? undefined : 'Password harus mengandung huruf besar, huruf kecil, dan angka'
  };
}

/**
 * Validate PIN (6 digits)
 */
export function validatePIN(pin: string): ValidationResult {
  const pattern = /^\d{6}$/;
  return {
    valid: pattern.test(pin),
    message: pattern.test(pin) ? undefined : 'PIN harus 6 digit angka'
  };
}

/**
 * Validate required field
 */
export function validateRequired(value: string | null | undefined): ValidationResult {
  const valid = value !== null && value !== undefined && value.trim().length > 0;
  return {
    valid,
    message: valid ? undefined : 'Field ini wajib diisi'
  };
}

/**
 * Validate minimum length
 */
export function validateMinLength(value: string, minLength: number): ValidationResult {
  const valid = value.length >= minLength;
  return {
    valid,
    message: valid ? undefined : `Minimal ${minLength} karakter`
  };
}

/**
 * Validate maximum length
 */
export function validateMaxLength(value: string, maxLength: number): ValidationResult {
  const valid = value.length <= maxLength;
  return {
    valid,
    message: valid ? undefined : `Maksimal ${maxLength} karakter`
  };
}
