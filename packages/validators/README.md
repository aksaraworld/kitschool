# @aksara/validators

Validation utilities for email, phone, password, and more for Aksara Framework.

## Features

- ✅ Email validation
- ✅ Phone number validation (Indonesian)
- ✅ Password validation
- ✅ PIN validation
- ✅ Required field validation
- ✅ Length validation

## Installation

```bash
npm install @aksara/validators
```

## Usage

```typescript
import {
  validateEmail,
  validatePhone,
  validatePassword,
  validatePIN,
  validateRequired,
  validateMinLength
} from '@aksara/validators';

// Email validation
const emailResult = validateEmail('user@example.com');
if (!emailResult.valid) {
  console.error(emailResult.message);
}

// Phone validation
const phoneResult = validatePhone('081234567890');

// Password validation
const passwordResult = validatePassword('Password123');

// PIN validation
const pinResult = validatePIN('123456');

// Required field
const requiredResult = validateRequired(value);

// Length validation
const minLengthResult = validateMinLength(value, 3);
```

## License

Proprietary - Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
