// Multi-tenant SaaS application policies

// Admins can do anything within their tenant
permit(principal, action, resource)
  when { principal.role == "admin" && principal.tenant == resource.tenant };

// Editors can read and write within their tenant
permit(principal, action, resource)
  when { principal.role == "editor" && principal.tenant == resource.tenant && action == "write" };

permit(principal, action, resource)
  when { principal.role == "editor" && principal.tenant == resource.tenant && action == "read" };

// Viewers can only read within their tenant
permit(principal, action, resource)
  when { principal.role == "viewer" && principal.tenant == resource.tenant && action == "read" };

// Block access to top-secret resources unless clearance matches
forbid(principal, action, resource)
  when { resource.classification == "top_secret" && principal.clearance != "top_secret" };
