// Complex multi-policy file

// Admin permit
permit(principal, action, resource)
  when { principal.role == "admin" && principal.tenant == resource.tenant };

// Editor read access
permit(principal, action, resource)
  when { principal.role == "editor" && action == "read" && principal.tenant == resource.tenant };

// Editor or admin can write
permit(principal, action, resource)
  when { principal.role == "editor" && action == "write" && principal.tenant == resource.tenant };

// Anyone can read public resources
permit(principal, action, resource)
  when { resource.classification == "public" && action == "read" };

// Deny top-secret access without clearance
forbid(principal, action, resource)
  when { resource.classification == "top_secret" && principal.clearance != "top_secret" };

// Deny cross-tenant access
forbid(principal, action, resource)
  when { principal.tenant != resource.tenant };
