/**
 * Phone number utilities for Sri Lankan phone numbers
 */

/**
 * Format phone number with country code +94 for Sri Lanka
 * Handles various input formats and ensures proper country code prefix
 *
 * @param phoneNumber - Raw phone number (can include spaces, dashes, etc.)
 * @returns Formatted phone number with +94 prefix
 *
 * @example
 * formatPhoneWithCountryCode("0771234567") // "+94771234567"
 * formatPhoneWithCountryCode("771234567")  // "+94771234567"
 * formatPhoneWithCountryCode("+94771234567") // "+94771234567"
 * formatPhoneWithCountryCode("077-123-4567") // "+94771234567"
 */
export const formatPhoneWithCountryCode = (phoneNumber: string): string => {
  if (!phoneNumber) return '';

  // Remove all non-numeric characters except '+'
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // If already has country code (+94), return as is
  if (cleaned.startsWith('+94')) {
    return cleaned;
  }

  // If has country code without '+' (94...), add '+'
  if (cleaned.startsWith('94') && cleaned.length > 10) {
    return '+' + cleaned;
  }

  // If starts with '0', remove it (local format like 0771234567)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Add +94 prefix
  return `+94${cleaned}`;
};

/**
 * Format phone number for WhatsApp (no '+' symbol)
 * WhatsApp requires format: 94771234567 (no '+')
 *
 * @param phoneNumber - Raw phone number
 * @returns Phone number formatted for WhatsApp
 *
 * @example
 * formatPhoneForWhatsApp("0771234567") // "94771234567"
 * formatPhoneForWhatsApp("+94771234567") // "94771234567"
 */
export const formatPhoneForWhatsApp = (phoneNumber: string): string => {
  if (!phoneNumber) return '';

  // Remove all non-numeric characters
  let cleaned = phoneNumber.replace(/\D/g, '');

  // If starts with '0', remove it
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // If doesn't start with country code, add 94
  if (!cleaned.startsWith('94')) {
    cleaned = '94' + cleaned;
  }

  return cleaned;
};

/**
 * Format phone number for SMS (same as tel: format)
 *
 * @param phoneNumber - Raw phone number
 * @returns Phone number formatted for SMS
 */
export const formatPhoneForSMS = (phoneNumber: string): string => {
  return formatPhoneWithCountryCode(phoneNumber);
};

/**
 * Validate Sri Lankan phone number
 *
 * @param phoneNumber - Phone number to validate
 * @returns true if valid Sri Lankan mobile/landline number
 *
 * Valid formats:
 * - Mobile: 07X XXXXXXX (10 digits starting with 07)
 * - Landline: 0XX XXXXXXX (10 digits starting with 0)
 */
export const isValidSriLankanPhone = (phoneNumber: string): boolean => {
  if (!phoneNumber) return false;

  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Check if it's 9 digits (without leading 0) or 10 digits (with leading 0)
  if (cleaned.length === 9) {
    // Should start with 7 (mobile) or 1-9 (landline)
    return /^[1-9]\d{8}$/.test(cleaned);
  }

  if (cleaned.length === 10) {
    // Should start with 0
    return /^0\d{9}$/.test(cleaned);
  }

  if (cleaned.length === 11 && cleaned.startsWith('94')) {
    // Country code format without '+'
    return /^94[1-9]\d{8}$/.test(cleaned);
  }

  if (cleaned.length === 12 && cleaned.startsWith('94')) {
    // Country code with extra digit
    return /^94\d{9}$/.test(cleaned);
  }

  return false;
};

/**
 * Display-friendly phone number format
 * Formats for human readability
 *
 * @param phoneNumber - Raw phone number
 * @returns Formatted for display (e.g., "+94 77 123 4567")
 */
export const formatPhoneForDisplay = (phoneNumber: string): string => {
  if (!phoneNumber) return '';

  const formatted = formatPhoneWithCountryCode(phoneNumber);

  // Format as: +94 77 123 4567
  if (formatted.startsWith('+94')) {
    const number = formatted.substring(3); // Remove +94
    if (number.length === 9) {
      return `+94 ${number.substring(0, 2)} ${number.substring(2, 5)} ${number.substring(5)}`;
    }
  }

  return formatted;
};
