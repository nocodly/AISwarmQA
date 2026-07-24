# Browser Agent Safety Policy

The Browser Agent treats every model action as untrusted input.

The safety engine checks:

- action schema and known tool
- latest step-scoped target IDs
- target visibility and enabled state
- same-origin URL policy
- unsupported protocols
- destructive, payment, purchase, account, logout, file, password, and sensitive field risks
- step, navigation, click, fill, screenshot, and provider-call budgets
- repeated action patterns
- finding evidence references

Conservative blocking is intentional. False-blocked actions are acceptable in Phase 4; false-safe actions are not.

Blocked examples include delete, remove, close account, cancel subscription, unsubscribe, logout, reset, publish, post, send, invite, confirm order, place order, buy, purchase, pay, checkout, subscribe, upgrade, downgrade, transfer, withdraw, refund, upload, download, export, and import.

The model cannot provide CSS selectors, XPath, JavaScript, raw values, file paths, or arbitrary URLs that bypass policy.
