// The backend accepts exactly 8 digits (EMPLOYEE_PASSWORD_INVALID / customer equivalent). It validates again; this just saves a round trip.
export const PASSWORD_PATTERN = "\\d{8}";
export const PASSWORD_HINT = "exactly 8 digits";
export const isValidPassword = (p: string) => new RegExp(`^${PASSWORD_PATTERN}$`).test(p);
