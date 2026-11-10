# Shawarma feature

- Keep Shawarma routes, components, settings, and business data inside this feature.
- Use the shared license API only for activation, license changes, client messages, and Shawarma releases.
- Store business records under the `shawarma:data:` local-storage prefix so Shawarma archives and backups stay isolated from Tsekh.
- Shawarma uses the product-scoped local PIN and its own backup database and schedule.
