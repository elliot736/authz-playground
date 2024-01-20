// Basic policy: admins can do anything
permit(principal, action, resource)
  when { principal.role == "admin" };

// Deny access to secret resources
forbid(principal, action, resource)
  when { resource.classification == "secret" };
