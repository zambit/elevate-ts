# Form Validation Sample

Multi-field form validation using the Validation monad from elevate-ts.

## Why This Matters

Form validation is one of the most common patterns in web applications, yet it's often handled in ad-hoc ways that scatter validation logic across UI components, event handlers, and submission flows. This creates several problems:

- **Scattered Logic**: Validation rules live in multiple places (component state, event handlers, submit callbacks)
- **Inconsistency**: Different parts of the app validate the same field differently
- **Hard to Test**: Validation mixed with UI is difficult to unit test
- **Error Handling**: Accumulating and displaying multiple field errors requires imperative code
- **Reusability**: Validators can't be easily shared or composed with other validators

The **Validation monad** solves this by:
- Centralizing all validation logic in pure, testable functions
- Composing validators to handle multiple fields and aggregate errors
- Cleanly separating validation from UI rendering
- Providing a predictable error accumulation pattern

## Classic Use Cases

- **User Registration**: Validate email, password strength, password confirmation, name fields
- **Checkout Forms**: Address validation, payment method validation, shipping preferences
- **Search Filters**: Date ranges, numeric bounds, enum selections
- **Configuration Forms**: Complex multi-step forms with interdependent fields
- **Data Import**: Batch validation of uploaded CSV/JSON data
- **API Requests**: Validate request payloads before sending to the server

## When NOT to Use

- **Single-field async validation** (username availability): Use Either/EitherAsync for async operations
- **Real-time validation with debouncing**: Combine validators with Svelte stores and timers
- **Cascading/dependent field validation**: Use Reader monad to pass field context
- **Performance-critical batch operations**: Consider lazy validation for large datasets

## Key Concepts

### The Validation Monad

The Validation monad accumulates errors instead of short-circuiting like Either. This allows you to collect all validation failures in a single pass:

```typescript
// Either short-circuits on first failure
Either.fail(err1).chain(v => Either.fail(err2)) // Only returns err1

// Validation accumulates all failures
Validation.fail([err1]).bimap(
  errs => [...errs, err2],  // Accumulate
  v => v
)
```

### Building Validators

Each field validator returns `Validation<SuccessType, ErrorType>`:

```typescript
const validateEmail = (email: string): Validation<string, ValidationFieldError[]> => {
  if (!email.trim()) {
    return Validation.fail([{ field: 'email', message: 'Email is required' }])
  }
  if (!isValidEmail(email)) {
    return Validation.fail([{ field: 'email', message: 'Email must be valid' }])
  }
  return Validation.success(email)
}
```

### Composing Validators

Combine field validators by collecting errors:

```typescript
const validateForm = (form: FormData): Validation<FormData, ValidationFieldError[]> => {
  const emailValidation = validateEmail(form.email)
  const passwordValidation = validatePassword(form.password)

  const allErrors: ValidationFieldError[] = []

  if (emailValidation.isFailure()) {
    allErrors.push(...emailValidation.getFailureValue())
  }
  if (passwordValidation.isFailure()) {
    allErrors.push(...passwordValidation.getFailureValue())
  }

  if (allErrors.length > 0) {
    return Validation.fail(allErrors)
  }

  return Validation.success(form)
}
```

### Using in Components

Call the composed validator on form submission:

```typescript
const handleSubmit = (e: Event) => {
  e.preventDefault()

  const result = validateUserForm(formData)

  if (result.isFailure()) {
    // Display all errors
    errors = result.getFailureValue()
  } else {
    // Process valid form
    submit(result.getSuccessValue())
  }
}
```

## Running Locally

### Install Dependencies

```bash
pnpm install
```

### Development Server

```bash
pnpm dev
```

Opens http://localhost:3000 in your browser. Changes will hot-reload.

### Run Tests

```bash
pnpm test
```

Runs validators tests and component integration tests.

### Run Tests in Watch Mode

```bash
pnpm test:watch
```

### Generate Coverage Report

Coverage is included with `pnpm test`. Reports are generated in:
- `coverage/index.html` (HTML report)
- `coverage/coverage-final.json` (JSON)
- Console output (text)

### Build for Production

```bash
pnpm build
```

Output is in the `dist/` directory.

### Preview Production Build

```bash
pnpm preview
```

## Code Walkthrough

### File Structure

```
src/
├── types.ts              # Form data types and error types
├── validators.ts         # Validation logic using Validation monad
├── styles/
│   └── tokens.css        # Design system tokens (colors, spacing, etc.)
├── components/
│   ├── FormToggle.svelte     # Button to switch between forms
│   ├── UserForm.svelte       # User registration form
│   ├── TaskForm.svelte       # Task creation form
│   ├── ErrorDisplay.svelte   # Error message rendering
│   └── SuccessDisplay.svelte # Success modal
├── App.svelte            # Root component with toggle logic
└── index.ts              # Entry point

tests/
├── validators.test.ts    # Unit tests for validation logic
└── integration.test.ts   # Component integration tests
```

### `types.ts`

Defines two form data types:

- **UserFormData**: email, password, confirmPassword, firstName, lastName, termsAccepted
- **TaskFormData**: title, description, dueDate, priority, assignee

### `validators.ts`

Implements pure validators:

- **Single-field validators**: `validateEmail`, `validatePassword`, `validateName`, etc.
- **Composed validators**: `validateUserForm`, `validateTaskForm`

Each returns `Validation<SuccessType, ValidationFieldError[]>` to accumulate errors per field.

### `styles/tokens.css`

CSS custom properties for theming:

- **Colors**: Primary, success, error, warning, neutrals (50-900)
- **Typography**: Font families, sizes, weights, line heights
- **Spacing**: 0-16 units
- **Shadows**: sm, md, lg, xl
- **Transitions**: fast, normal, slow
- **Border radius**: sm, md, lg, xl, 2xl

All components use these tokens for consistent styling.

### Components

- **FormToggle.svelte**: Switches between UserForm and TaskForm
- **UserForm.svelte**: Registration form with all field validators
- **TaskForm.svelte**: Task creation form with different validators
- **ErrorDisplay.svelte**: Displays errors for a specific field
- **SuccessDisplay.svelte**: Modal shown after successful submission

### Form Submission Flow

1. User fills form and clicks Submit
2. Component calls composed validator (e.g., `validateUserForm`)
3. Validator returns `Validation<FormData, ValidationFieldError[]>`
4. On failure: Display errors via ErrorDisplay components
5. On success: Show SuccessDisplay modal, reset form

## Testing Strategy

### Unit Tests (`validators.test.ts`)

Test pure validation functions:
- Empty input handling
- Invalid format handling
- Valid input acceptance
- Error field identification
- Multiple error accumulation

### Integration Tests (`integration.test.ts`)

Test component behavior:
- Form field rendering
- Button functionality
- Error display on invalid submission
- Form clearing
- Successful submission flow

## Design Decisions

### Pure Validators

Validators are pure functions with no side effects, making them:
- Easy to test in isolation
- Reusable across components
- Easy to reason about
- Compatible with any framework or runtime

### Validation Monad

Chosen over Either because:
- **Accumulates errors**: Collects all failures instead of short-circuiting
- **Better UX**: Shows all validation errors at once
- **Composable**: Multiple validators can be combined
- **Fantasy Land compliant**: Works with functional composition libraries

### Dual Forms

Two different forms demonstrate:
- **Different validation rules**: Email/password vs task fields
- **Field composition**: Simple inputs vs textarea vs select
- **Toggle pattern**: Common in real apps (login/signup, view/edit, etc.)

### Design Tokens

CSS custom properties instead of magic values ensure:
- **Maintainability**: Change colors/spacing globally
- **Consistency**: All components use same palette
- **Theming**: Easy to support dark mode by toggling token values
- **Performance**: CSS variables are efficient

## Next Steps

To extend this sample:

1. **Async Validation**: Use EitherAsync for server-side checks (email availability)
2. **Password Rules**: Add strength meter with Reader monad for rules config
3. **Field Dependencies**: Use Reader monad to validate one field based on another
4. **Internationalization**: Use Reader monad to inject translation functions
5. **State Management**: Use State monad to track form changes for undo/redo
6. **API Integration**: Send validated form to backend with proper error handling

## See Also

- [elevate-ts Documentation](../../README.md)
- [Validation Monad Guide](../../docs/VALIDATION.md)
- [Form Validation Best Practices](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/)
