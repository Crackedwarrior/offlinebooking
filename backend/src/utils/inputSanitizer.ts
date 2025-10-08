import { auditLogger } from './auditLogger';
import { ValidationError } from './errors';

export interface SanitizationResult<T> {
  data: T;
  sanitized: boolean;
  originalValue?: any;
  sanitizedValue?: any;
}

export class InputSanitizer {
  /**
   * Strict validation that rejects invalid input instead of sanitizing
   */
  static validateAndReject(input: any, fieldName: string, maxLength: number = 1000): string {
    if (input === null || input === undefined) {
      throw new ValidationError(`${fieldName} is required`);
    }

    const originalValue = input;
    let sanitizedValue = String(input);

    // Remove null bytes and control characters
    sanitizedValue = sanitizedValue.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Trim whitespace
    sanitizedValue = sanitizedValue.trim();
    
    // Check for empty string after sanitization
    if (sanitizedValue.length === 0 && originalValue !== '') {
      throw new ValidationError(`${fieldName} contains invalid characters`);
    }
    
    // Check length
    if (sanitizedValue.length > maxLength) {
      throw new ValidationError(`${fieldName} exceeds maximum length of ${maxLength} characters`);
    }

    // Log if sanitization occurred
    if (sanitizedValue !== originalValue) {
      auditLogger.logSecurity(
        'INPUT_SANITIZED_STRICT',
        true,
        'anonymous',
        undefined,
        undefined,
        {
          field: fieldName,
          originalLength: originalValue.length,
          sanitizedLength: sanitizedValue.length,
          maxLength
        }
      );
    }

    return sanitizedValue;
  }
  /**
   * Sanitize a string input
   */
  static sanitizeString(input: any, maxLength: number = 1000): SanitizationResult<string> {
    if (input === null || input === undefined) {
      return { data: '', sanitized: false };
    }

    const originalValue = input;
    let sanitizedValue = String(input);

    // Remove null bytes and control characters
    sanitizedValue = sanitizedValue.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Trim whitespace
    sanitizedValue = sanitizedValue.trim();
    
    // Check for empty string after sanitization
    if (sanitizedValue.length === 0 && originalValue !== '') {
      return { 
        data: '', 
        sanitized: true, 
        originalValue,
        sanitizedValue: 'EMPTY_AFTER_SANITIZATION'
      };
    }
    
    // Limit length
    if (sanitizedValue.length > maxLength) {
      sanitizedValue = sanitizedValue.substring(0, maxLength);
    }

    const sanitized = sanitizedValue !== originalValue;
    
    if (sanitized) {
      auditLogger.logSecurity(
        'INPUT_SANITIZED',
        true,
        'anonymous',
        undefined,
        undefined,
        {
          field: 'string',
          originalLength: originalValue.length,
          sanitizedLength: sanitizedValue.length,
          maxLength
        }
      );
    }

    return {
      data: sanitizedValue,
      sanitized,
      originalValue,
      sanitizedValue
    };
  }

  /**
   * Sanitize an email address
   */
  static sanitizeEmail(input: any): SanitizationResult<string> {
    if (input === null || input === undefined || input === '') {
      return { data: '', sanitized: false };
    }

    const originalValue = input;
    let sanitizedValue = String(input).toLowerCase().trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedValue)) {
      // If invalid email, return empty string and log as sanitized
      auditLogger.logSecurity(
        'INVALID_EMAIL_REJECTED',
        true,
        'anonymous',
        undefined,
        undefined,
        {
          originalValue,
          reason: 'Invalid email format'
        }
      );
      return { data: '', sanitized: true, originalValue, sanitizedValue: 'INVALID_FORMAT' };
    }

    // Remove any HTML tags
    sanitizedValue = sanitizedValue.replace(/<[^>]*>/g, '');
    
    // Limit length
    if (sanitizedValue.length > 254) {
      sanitizedValue = sanitizedValue.substring(0, 254);
    }

    const sanitized = sanitizedValue !== originalValue;
    
    if (sanitized) {
      auditLogger.logSecurity(
        'EMAIL_SANITIZED',
        true,
        'anonymous',
        undefined,
        undefined,
        {
          originalValue,
          sanitizedValue
        }
      );
    }

    return {
      data: sanitizedValue,
      sanitized,
      originalValue,
      sanitizedValue
    };
  }

  /**
   * Sanitize a phone number
   */
  static sanitizePhone(input: any): SanitizationResult<string> {
    if (input === null || input === undefined) {
      return { data: '', sanitized: false };
    }

    const originalValue = input;
    let sanitizedValue = String(input);

    // Remove all non-digit characters
    sanitizedValue = sanitizedValue.replace(/\D/g, '');
    
    // Limit to reasonable phone number length
    if (sanitizedValue.length > 15) {
      sanitizedValue = sanitizedValue.substring(0, 15);
    }

    const sanitized = sanitizedValue !== originalValue;
    
    if (sanitized) {
      auditLogger.logSecurity(
        'PHONE_SANITIZED',
        true,
        'anonymous',
        undefined,
        undefined,
        {
          originalValue,
          sanitizedValue
        }
      );
    }

    return {
      data: sanitizedValue,
      sanitized,
      originalValue,
      sanitizedValue
    };
  }

  /**
   * Sanitize a number input
   */
  static sanitizeNumber(input: any, min: number = -Infinity, max: number = Infinity): SanitizationResult<number> {
    if (input === null || input === undefined) {
      return { data: 0, sanitized: false };
    }

    const originalValue = input;
    let sanitizedValue = Number(input);

    // Check if it's a valid number
    if (isNaN(sanitizedValue)) {
      return { data: 0, sanitized: false, originalValue };
    }

    // Apply min/max constraints
    if (sanitizedValue < min) {
      sanitizedValue = min;
    } else if (sanitizedValue > max) {
      sanitizedValue = max;
    }

    const sanitized = sanitizedValue !== originalValue;
    
    if (sanitized) {
      auditLogger.logSecurity(
        'NUMBER_SANITIZED',
        true,
        'anonymous',
        undefined,
        undefined,
        {
          originalValue,
          sanitizedValue,
          min,
          max
        }
      );
    }

    return {
      data: sanitizedValue,
      sanitized,
      originalValue,
      sanitizedValue
    };
  }

  /**
   * Sanitize an array of strings
   */
  static sanitizeStringArray(input: any, maxLength: number = 1000): SanitizationResult<string[]> {
    if (!Array.isArray(input)) {
      return { data: [], sanitized: false };
    }

    const originalValue = input;
    const sanitizedValue = input.map(item => this.sanitizeString(item, maxLength).data);

    const sanitized = JSON.stringify(sanitizedValue) !== JSON.stringify(originalValue);
    
    if (sanitized) {
      auditLogger.logSecurity(
        'ARRAY_SANITIZED',
        true,
        'anonymous',
        undefined,
        undefined,
        {
          originalLength: originalValue.length,
          sanitizedLength: sanitizedValue.length
        }
      );
    }

    return {
      data: sanitizedValue,
      sanitized,
      originalValue,
      sanitizedValue
    };
  }

  /**
   * Sanitize an object with string properties
   */
  static sanitizeObject<T extends Record<string, any>>(
    input: T, 
    stringFields: (keyof T)[],
    maxLength: number = 1000
  ): SanitizationResult<T> {
    if (typeof input !== 'object' || input === null) {
      return { data: input, sanitized: false };
    }

    const originalValue = { ...input };
    const sanitizedValue = { ...input };

    let hasChanges = false;

    for (const field of stringFields) {
      if (field in sanitizedValue && typeof sanitizedValue[field] === 'string') {
        const result = this.sanitizeString(sanitizedValue[field], maxLength);
        if (result.sanitized) {
          (sanitizedValue as any)[field] = result.data;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      auditLogger.logSecurity(
        'OBJECT_SANITIZED',
        true,
        'anonymous',
        undefined,
        undefined,
        {
          fields: stringFields,
          originalValue,
          sanitizedValue
        }
      );
    }

    return {
      data: sanitizedValue,
      sanitized: hasChanges,
      originalValue,
      sanitizedValue
    };
  }

  /**
   * Check if input contains potentially dangerous content
   */
  static containsDangerousContent(input: any): boolean {
    if (typeof input !== 'string') {
      return false;
    }

    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
      /javascript:/gi, // JavaScript protocol
      /on\w+\s*=/gi, // Event handlers
      /data:text\/html/gi, // Data URLs
      /vbscript:/gi, // VBScript
      /<iframe/gi, // Iframe tags
      /<object/gi, // Object tags
      /<embed/gi, // Embed tags
    ];

    return dangerousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Log dangerous content detection
   */
  static logDangerousContent(input: any, field: string, requestId?: string): void {
    if (this.containsDangerousContent(input)) {
      auditLogger.logSecurity(
        'DANGEROUS_CONTENT_DETECTED',
        false,
        'anonymous',
        undefined,
        undefined,
        {
          field,
          content: String(input).substring(0, 100) + '...',
          requestId
        },
        requestId
      );
    }
  }
}
