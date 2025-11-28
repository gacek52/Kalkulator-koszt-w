import React, { useState } from 'react';
import FormFieldWithValidation from './FormFieldWithValidation';

/**
 * FormFieldWithValidation - Usage Examples
 *
 * This file demonstrates all variants and features of the FormFieldWithValidation component.
 * Import this component in your forms and replace standard inputs for better UX.
 */

export function FormFieldExamples() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    description: '',
    country: '',
    age: '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">FormFieldWithValidation Examples</h1>

      {/* Example 1: Basic Input with Validation */}
      <FormFieldWithValidation
        label="Username"
        value={formData.username}
        onChange={handleChange('username')}
        placeholder="Enter username"
        required
        error={formData.username.length > 0 && formData.username.length < 3 ? 'Username must be at least 3 characters' : ''}
        hint="Your unique identifier in the system"
      />

      {/* Example 2: Email with Tooltip */}
      <FormFieldWithValidation
        label="Email"
        type="email"
        value={formData.email}
        onChange={handleChange('email')}
        placeholder="you@example.com"
        required
        tooltip="We'll send verification emails to this address"
        error={formData.email && !validateEmail(formData.email) ? 'Please enter a valid email address' : ''}
        success={formData.email && validateEmail(formData.email) ? 'Email format is correct!' : ''}
      />

      {/* Example 3: Password with Warning */}
      <FormFieldWithValidation
        label="Password"
        type="password"
        value={formData.password}
        onChange={handleChange('password')}
        placeholder="Enter secure password"
        required
        tooltip="Password must be at least 8 characters with uppercase, lowercase, and numbers"
        warning={formData.password.length > 0 && formData.password.length < 8 ? 'Password is too short - use at least 8 characters' : ''}
        success={formData.password.length >= 8 ? 'Password length is good!' : ''}
      />

      {/* Example 4: Textarea Variant */}
      <FormFieldWithValidation
        label="Description"
        variant="textarea"
        value={formData.description}
        onChange={handleChange('description')}
        placeholder="Tell us about yourself..."
        rows={5}
        hint="Maximum 500 characters"
        warning={formData.description.length > 450 ? `${500 - formData.description.length} characters remaining` : ''}
        error={formData.description.length > 500 ? 'Description is too long!' : ''}
      />

      {/* Example 5: Select Variant */}
      <FormFieldWithValidation
        label="Country"
        variant="select"
        value={formData.country}
        onChange={handleChange('country')}
        placeholder="Select your country"
        required
        options={[
          { value: 'pl', label: 'Poland' },
          { value: 'us', label: 'United States' },
          { value: 'uk', label: 'United Kingdom' },
          { value: 'de', label: 'Germany' },
          { value: 'fr', label: 'France' },
        ]}
        tooltip="Select the country where you're currently located"
      />

      {/* Example 6: Number Input with Validation */}
      <FormFieldWithValidation
        label="Age"
        type="number"
        value={formData.age}
        onChange={handleChange('age')}
        placeholder="18"
        required
        hint="You must be 18 or older"
        error={formData.age && formData.age < 18 ? 'You must be at least 18 years old' : ''}
        success={formData.age >= 18 ? 'Age verified!' : ''}
      />

      {/* Example 7: Disabled Field */}
      <FormFieldWithValidation
        label="Account ID"
        value="AUTO-GENERATED-123"
        onChange={() => {}}
        disabled
        hint="This field is automatically generated and cannot be edited"
      />
    </div>
  );
}

/**
 * Usage in Real Forms:
 *
 * 1. Import the component:
 *    import FormFieldWithValidation from '../Common/FormFieldWithValidation';
 *
 * 2. Replace standard inputs:
 *    Before:
 *      <input
 *        value={name}
 *        onChange={e => setName(e.target.value)}
 *        placeholder="Name"
 *      />
 *
 *    After:
 *      <FormFieldWithValidation
 *        label="Name"
 *        value={name}
 *        onChange={e => setName(e.target.value)}
 *        placeholder="Enter your name"
 *        required
 *        error={nameError}
 *      />
 *
 * 3. Add validation logic:
 *    - Use error prop for validation errors
 *    - Use warning prop for soft warnings
 *    - Use success prop for positive feedback
 *    - Use hint prop for helpful information
 *    - Use tooltip prop for complex explanations
 *
 * 4. Choose the right variant:
 *    - variant="input" (default) - for text, email, password, number, etc.
 *    - variant="textarea" - for multi-line text
 *    - variant="select" - for dropdowns (requires options prop)
 */

export default FormFieldExamples;
