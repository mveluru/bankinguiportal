"use client";

/** Keeps only digits (max 10) and shows them as 123-456-7890; a hyphen appears only once more digits follow it. */
function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join("-");
}

/**
 * Empties every field (unlike form.reset(), which would restore prefilled values); Country goes back to USA and
 * selects back to their first option.
 */
export function clearFormFields(form: HTMLFormElement) {
  for (const el of Array.from(form.elements)) {
    if (el instanceof HTMLInputElement) el.value = el.name === "country" ? "USA" : "";
    else if (el instanceof HTMLSelectElement) el.selectedIndex = 0;
  }
}

/**
 * The Account holder details, Address and Contact subsections shared by the deposit, withdraw and open-account
 * forms. Middle, Country and Phone are collected but not sent: the backend has no fields for them.
 */
export default function HolderFields({
  defaultFirstName,
  defaultLastName,
  showDob = false,
}: {
  defaultFirstName?: string;
  defaultLastName?: string;
  showDob?: boolean;
}) {
  return (
    <>
      <fieldset className="subsection">
        <legend>Account holder details</legend>
        <p className="muted req-note">
          <span className="req">*</span> indicates required
        </p>
        <div className="row">
          <label>
            <span>First name<span className="req">*</span></span>
            <input name="firstName" required maxLength={50} pattern="[A-Za-z]+" defaultValue={defaultFirstName} />
          </label>
          <label>
            Middle
            <input name="middleName" maxLength={50} />
          </label>
          <label>
            <span>Last name<span className="req">*</span></span>
            <input name="lastName" required maxLength={25} pattern="[A-Za-z]+" defaultValue={defaultLastName} />
          </label>
        </div>
        {showDob && (
          <div className="row">
            <label className="narrow-dob">
              <span>Date of birth<span className="req">*</span></span>
              <input name="dateOfBirth" type="date" required min="1940-01-01" />
            </label>
          </div>
        )}
      </fieldset>
      <fieldset className="subsection">
        <legend>Address</legend>
        <div className="row">
          <label>
            <span>Street<span className="req">*</span></span>
            <input name="street" required />
          </label>
          <label>
            <span>Address line 1<span className="req">*</span></span>
            <input name="addressLine1" required maxLength={50} />
          </label>
          <label>
            Address line 2
            <input name="addressLine2" />
          </label>
        </div>
        <div className="row">
          <label>
            <span>City<span className="req">*</span></span>
            <input name="city" required maxLength={50} />
          </label>
          <label className="narrow">
            <span>State<span className="req">*</span></span>
            <input name="state" required maxLength={2} pattern="[A-Za-z]{2}" placeholder="TX" />
          </label>
          <label className="narrow">
            <span>ZIP<span className="req">*</span></span>
            <input
              name="zip"
              required
              pattern="\d{5}"
              maxLength={5}
              inputMode="numeric"
              autoComplete="postal-code"
              onInput={(e) => {
                e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
              }}
            />
          </label>
          <label>
            <span>Country<span className="req">*</span></span>
            <input name="country" required maxLength={50} defaultValue="USA" autoComplete="country-name" />
          </label>
        </div>
      </fieldset>
      <fieldset className="subsection">
        <legend>Contact</legend>
        <div className="row">
          <label className="narrow-phone">
            <span>Phone number<span className="req">*</span></span>
            <input
              name="phone"
              required
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={12}
              pattern="\d{3}-\d{3}-\d{4}"
              placeholder="xxx-xxx-xxxx"
              title="Phone number as 123-456-7890"
              onInput={(e) => {
                e.currentTarget.value = formatPhone(e.currentTarget.value);
              }}
            />
          </label>
        </div>
      </fieldset>
    </>
  );
}
