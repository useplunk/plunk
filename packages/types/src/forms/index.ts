/**
 * Form field types supported in the Forms feature
 */
export type FormFieldType =
  | 'text'
  | 'email'
  | 'textarea'
  | 'number'
  | 'tel'
  | 'url'
  | 'date'
  | 'select'
  | 'checkbox';

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  /** Options for select fields */
  options?: string[];
}

export interface FormSettings {
  title?: string;
  description?: string;
  successMessage?: string;
  redirectUrl?: string;
  emailPlaceholder?: string;
  /** Display order of fields; `$email` is the required email field, other entries are custom field keys */
  fieldOrder?: string[];
  doubleOptIn?: boolean;
  defaultSubscribed?: boolean;
  /** Tags written to contact.data on submit (shared across forms for dynamic segments) */
  tags?: Record<string, string | boolean | number>;
  /** Custom event name (default: form.submitted) */
  eventName?: string;
  /** Validate email (disposable, MX) on submit */
  verifyEmail?: boolean;
}

/** Public-facing form config returned by GET /forms/public/:publicId */
export interface PublicFormConfig {
  publicId: string;
  name: string;
  fields: FormField[];
  settings: Pick<FormSettings, 'title' | 'description' | 'successMessage' | 'redirectUrl' | 'emailPlaceholder' | 'fieldOrder'>;
  language: string;
}

export interface FormSubmitResult {
  success: boolean;
  redirectUrl?: string;
}
