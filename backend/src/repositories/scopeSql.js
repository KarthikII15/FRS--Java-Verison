export function buildScopeWhere(scope, alias = "") {
  const prefix = alias ? `${alias}.` : "";
  const clauses = [];
  const values = [];

  values.push(Number(scope.tenantId));
  clauses.push(`${prefix}tenant_id = $${values.length}`);

  if (scope.customerId) {
    values.push(Number(scope.customerId));
    clauses.push(`${prefix}customer_id = $${values.length}`);
  }
  if (scope.siteId) {
    values.push(Number(scope.siteId));
    clauses.push(`${prefix}site_id = $${values.length}`);
  }
  if (scope.unitId) {
    values.push(Number(scope.unitId));
    clauses.push(`${prefix}unit_id = $${values.length}`);
  }

  return { whereSql: clauses.join(" and "), values };
}

