import { useRole } from '../../context/RoleContext';

/**
 * Komponent warunkowego renderowania na podstawie uprawnień
 *
 * Przykłady użycia:
 *
 * 1. Sprawdź pojedyncze uprawnienie:
 *    <PermissionGate permission="materials_edit">
 *      <button>Edytuj materiały</button>
 *    </PermissionGate>
 *
 * 2. Sprawdź wiele uprawnień (OR):
 *    <PermissionGate permissions={["calculations_edit_all", "calculations_edit_own"]}>
 *      <button>Edytuj</button>
 *    </PermissionGate>
 *
 * 3. Sprawdź wszystkie uprawnienia (AND):
 *    <PermissionGate permissions={["users_view", "users_edit"]} requireAll>
 *      <button>Zarządzaj użytkownikami</button>
 *    </PermissionGate>
 *
 * 4. Wyświetl fallback jeśli brak uprawnień:
 *    <PermissionGate permission="settings_edit" fallback={<p>Brak dostępu</p>}>
 *      <SettingsForm />
 *    </PermissionGate>
 */
export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children
}) {
  const { hasPermission } = useRole();

  // Pojedyncze uprawnienie
  if (permission) {
    if (!hasPermission(permission)) {
      return fallback;
    }
    return children;
  }

  // Wiele uprawnień
  if (permissions && Array.isArray(permissions)) {
    if (requireAll) {
      // Wszystkie muszą być spełnione (AND)
      const hasAll = permissions.every(perm => hasPermission(perm));
      if (!hasAll) {
        return fallback;
      }
    } else {
      // Przynajmniej jedno musi być spełnione (OR)
      const hasAny = permissions.some(perm => hasPermission(perm));
      if (!hasAny) {
        return fallback;
      }
    }
  }

  return children;
}

/**
 * Komponent warunkowego renderowania na podstawie ownership zasobu
 *
 * Przykłady użycia:
 *
 * 1. Sprawdź czy może zobaczyć:
 *    <ResourcePermissionGate resource="calculations" ownerId={calc.userId} action="view">
 *      <CalculationDetails calc={calc} />
 *    </ResourcePermissionGate>
 *
 * 2. Sprawdź czy może edytować:
 *    <ResourcePermissionGate resource="clients" ownerId={client.userId} action="edit">
 *      <button>Edytuj klienta</button>
 *    </ResourcePermissionGate>
 *
 * 3. Sprawdź czy może usunąć:
 *    <ResourcePermissionGate resource="catalog" ownerId={item.userId} action="delete">
 *      <button>Usuń</button>
 *    </ResourcePermissionGate>
 */
export function ResourcePermissionGate({
  resource,
  ownerId,
  action = 'view',
  fallback = null,
  children
}) {
  const { canViewResource, canEditResource, canDeleteResource } = useRole();

  let hasAccess = false;

  switch (action) {
    case 'view':
      hasAccess = canViewResource(resource, ownerId);
      break;
    case 'edit':
      hasAccess = canEditResource(resource, ownerId);
      break;
    case 'delete':
      hasAccess = canDeleteResource(resource, ownerId);
      break;
    default:
      hasAccess = false;
  }

  if (!hasAccess) {
    return fallback;
  }

  return children;
}

/**
 * Hook do sprawdzania uprawnień w logice komponentu
 *
 * Przykład użycia:
 *
 * const canEdit = usePermission('materials_edit');
 * const canViewAll = usePermission(['calculations_view_all', 'calculations_view_own'], false);
 */
export function usePermission(permission, requireAll = false) {
  const { hasPermission } = useRole();

  if (typeof permission === 'string') {
    return hasPermission(permission);
  }

  if (Array.isArray(permission)) {
    if (requireAll) {
      return permission.every(perm => hasPermission(perm));
    }
    return permission.some(perm => hasPermission(perm));
  }

  return false;
}
