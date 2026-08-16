/* Centralised form validation so every form behaves the same way. */

export const PASSWORD_MIN = 8;
export const MIN_DESCRIPTION_CHARS = 40;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export type FormErrors<T extends string> = Partial<Record<T, string>>;

export function validateCredentials(email: string, password: string): FormErrors<"email" | "password"> {
  const errors: FormErrors<"email" | "password"> = {};
  if (!email.trim()) errors.email = "Email is required.";
  else if (!isEmail(email)) errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Password is required.";
  return errors;
}

export function validateRegister(
  fullName: string,
  email: string,
  password: string
): FormErrors<"fullName" | "email" | "password"> {
  const errors: FormErrors<"fullName" | "email" | "password"> = {};
  if (fullName.trim().length < 2) errors.fullName = "Enter your full name.";
  if (!email.trim()) errors.email = "Email is required.";
  else if (!isEmail(email)) errors.email = "Enter a valid email address.";
  if (password.length < PASSWORD_MIN) errors.password = `Password must be at least ${PASSWORD_MIN} characters.`;
  return errors;
}

export function validateJob(form: {
  companyName: string;
  jobTitle: string;
  jobDescription: string;
}): FormErrors<"companyName" | "jobTitle" | "jobDescription"> {
  const errors: FormErrors<"companyName" | "jobTitle" | "jobDescription"> = {};
  if (!form.companyName.trim()) errors.companyName = "Company name is required.";
  if (!form.jobTitle.trim()) errors.jobTitle = "Job title is required.";
  if (!form.jobDescription.trim()) errors.jobDescription = "Paste the job description — the AI needs it to analyze the match.";
  else if (form.jobDescription.trim().length < MIN_DESCRIPTION_CHARS)
    errors.jobDescription = `Description looks too short (min ${MIN_DESCRIPTION_CHARS} characters) for a useful analysis.`;
  return errors;
}

export function validateResume(text: string): FormErrors<"resumeText"> {
  const errors: FormErrors<"resumeText"> = {};
  if (text.trim().length < 80)
    errors.resumeText = "Add a bit more detail (at least 80 characters) so the AI has material to compare against.";
  return errors;
}
