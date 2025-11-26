# System Uprawnień - Przewodnik Użycia

## Przegląd

System uprawnień automatycznie wymusza prawa dostępu na podstawie ról użytkowników. Wszystkie uprawnienia zdefiniowane w rolach są **automatycznie wymuszane** na poziomie UI i danych.

## Struktura Uprawnień

Uprawnienia używają konwencji nazewnictwa:
- `{zasób}_view_all` - podgląd wszystkich
- `{zasób}_view_own` - podgląd tylko własnych
- `{zasób}_edit_all` - edycja wszystkich
- `{zasób}_edit_own` - edycja tylko własnych
- `{zasób}_delete_all` - usuwanie wszystkich
- `{zasób}_delete_own` - usuwanie tylko własnych

### Dostępne Zasoby

- **calculations** - kalkulacje
- **catalog** - katalog kalkulacji
- **clients** - klienci
- **materials** - materiały
- **transport** - transport
- **packaging** - pakowanie
- **workstations** - stanowiska
- **users** - użytkownicy
- **roles** - role

## 1. Ukrywanie Elementów UI (PermissionGate)

### Pojedyncze Uprawnienie

```javascript
import { PermissionGate } from '../components/Common/PermissionGate';

// Pokaż przycisk tylko jeśli użytkownik ma uprawnienie
<PermissionGate permission="materials_edit">
  <button onClick={handleEdit}>Edytuj materiały</button>
</PermissionGate>
```

### Wiele Uprawnień (OR)

```javascript
// Pokaż jeśli użytkownik ma PRZYNAJMNIEJ JEDNO z uprawnień
<PermissionGate permissions={["calculations_edit_all", "calculations_edit_own"]}>
  <button onClick={handleEdit}>Edytuj</button>
</PermissionGate>
```

### Wiele Uprawnień (AND)

```javascript
// Pokaż jeśli użytkownik ma WSZYSTKIE uprawnienia
<PermissionGate permissions={["users_view", "users_edit"]} requireAll>
  <button onClick={handleManageUsers}>Zarządzaj użytkownikami</button>
</PermissionGate>
```

### Fallback Content

```javascript
// Pokaż alternatywny content jeśli brak uprawnień
<PermissionGate
  permission="settings_edit"
  fallback={<p className="text-gray-500">Brak dostępu do edycji ustawień</p>}
>
  <SettingsForm />
</PermissionGate>
```

## 2. Kontrola Dostępu do Zasobów (ResourcePermissionGate)

### Sprawdzanie Ownership

```javascript
import { ResourcePermissionGate } from '../components/Common/PermissionGate';

// Sprawdź czy może ZOBACZYĆ zasób
<ResourcePermissionGate resource="calculations" ownerId={calc.userId} action="view">
  <CalculationDetails calc={calc} />
</ResourcePermissionGate>

// Sprawdź czy może EDYTOWAĆ zasób
<ResourcePermissionGate resource="clients" ownerId={client.userId} action="edit">
  <button onClick={handleEdit}>Edytuj klienta</button>
</ResourcePermissionGate>

// Sprawdź czy może USUNĄĆ zasób
<ResourcePermissionGate resource="catalog" ownerId={item.userId} action="delete">
  <button onClick={handleDelete}>Usuń</button>
</ResourcePermissionGate>
```

## 3. Hook do Sprawdzania Uprawnień

```javascript
import { usePermission } from '../components/Common/PermissionGate';

function MyComponent() {
  // Pojedyncze uprawnienie
  const canEditMaterials = usePermission('materials_edit');

  // Wiele uprawnień (OR)
  const canViewCalculations = usePermission(
    ['calculations_view_all', 'calculations_view_own'],
    false
  );

  // Wiele uprawnień (AND)
  const canManageUsers = usePermission(
    ['users_view', 'users_edit'],
    true
  );

  if (!canEditMaterials) {
    return <div>Brak dostępu</div>;
  }

  return <MaterialEditor />;
}
```

## 4. Używanie RoleContext Bezpośrednio

```javascript
import { useRole } from '../context/RoleContext';

function MyComponent() {
  const {
    hasPermission,
    canViewResource,
    canEditResource,
    canDeleteResource,
    isSuperAdmin,
    isAdminOrSuper
  } = useRole();

  // Sprawdź pojedyncze uprawnienie
  if (hasPermission('materials_sync')) {
    // Synchronizuj materiały
  }

  // Sprawdź czy może zobaczyć zasób
  if (canViewResource('calculations', calculationOwnerId)) {
    // Pokaż kalkulację
  }

  // Sprawdź czy może edytować zasób
  if (canEditResource('clients', clientOwnerId)) {
    // Pozwól edytować
  }

  // Sprawdź czy może usunąć zasób
  if (canDeleteResource('catalog', catalogItemOwnerId)) {
    // Pozwól usunąć
  }

  // Sprawdź czy jest super-admin
  if (isSuperAdmin()) {
    // Pełny dostęp
  }

  return <div>Content</div>;
}
```

## 5. Filtrowanie List Zasobów

```javascript
import { useRole } from '../context/RoleContext';

function ClientsList() {
  const { filterResourcesByPermission } = useRole();
  const [clients, setClients] = useState([]);

  // Automatycznie filtruj listę na podstawie uprawnień
  const visibleClients = filterResourcesByPermission(
    clients,
    'clients',
    'userId' // pole z ID właściciela
  );

  return (
    <div>
      {visibleClients.map(client => (
        <ClientCard key={client.id} client={client} />
      ))}
    </div>
  );
}
```

## 6. Używanie w CatalogContext

CatalogContext **automatycznie filtruje** kalkulacje na podstawie uprawnień:

```javascript
import { useCatalog } from '../context/CatalogContext';

function CatalogView() {
  const {
    filteredCalculations, // Już przefiltrowane według uprawnień!
    permissions
  } = useCatalog();

  return (
    <div>
      {filteredCalculations.map(calc => {
        // Sprawdź czy może edytować tę konkretną kalkulację
        const canEdit = permissions.canEditResource('catalog', calc.ownerId);
        const canDelete = permissions.canDeleteResource('catalog', calc.ownerId);

        return (
          <div key={calc.id}>
            <h3>{calc.name}</h3>
            {canEdit && <button>Edytuj</button>}
            {canDelete && <button>Usuń</button>}
          </div>
        );
      })}
    </div>
  );
}
```

## 7. Dodawanie Nowych Uprawnień

### Krok 1: Dodaj uprawnienie do RoleContext.js

```javascript
// W DEFAULT_ROLES w src/context/RoleContext.js
'admin': {
  permissions: {
    // Istniejące...

    // NOWE UPRAWNIENIE
    new_feature_view: true,
    new_feature_edit: false,
    new_feature_delete: false
  }
}
```

### Krok 2: Dodaj uprawnienie do RoleManagementPanel.js

```javascript
// W allPermissions w src/components/Admin/RoleManagementPanel.js
const allPermissions = {
  'Nowa Funkcja': [
    { key: 'new_feature_view', label: 'Podgląd nowej funkcji' },
    { key: 'new_feature_edit', label: 'Edycja nowej funkcji' },
    { key: 'new_feature_delete', label: 'Usuwanie w nowej funkcji' }
  ]
};
```

### Krok 3: Użyj w komponencie

```javascript
import { PermissionGate } from '../components/Common/PermissionGate';

<PermissionGate permission="new_feature_edit">
  <button>Edytuj nową funkcję</button>
</PermissionGate>
```

## Najlepsze Praktyki

1. **Zawsze używaj PermissionGate** dla elementów UI
2. **Nie polegaj tylko na UI** - backendowe API też musi sprawdzać uprawnienia
3. **Używaj ResourcePermissionGate** gdy sprawdzasz ownership zasobów
4. **Filtruj listy** na poziomie kontekstu (jak CatalogContext)
5. **Testuj z różnymi rolami** przed wdrożeniem
6. **Nie duplikuj logiki** - używaj istniejących funkcji z RoleContext

## Przykłady Kompleksowe

### Formularz z Kontrolą Uprawnień

```javascript
import { PermissionGate, ResourcePermissionGate } from '../components/Common/PermissionGate';
import { useRole } from '../context/RoleContext';

function MaterialForm({ material }) {
  const { hasPermission } = useRole();
  const canEdit = hasPermission('materials_edit');
  const canSync = hasPermission('materials_sync');

  return (
    <form>
      {/* Pola tylko do odczytu jeśli brak uprawnień do edycji */}
      <input
        type="text"
        value={material.name}
        disabled={!canEdit}
      />

      {/* Przycisk synchronizacji tylko dla uprawnionych */}
      <PermissionGate permission="materials_sync">
        <button onClick={handleSync}>Synchronizuj z Subiekt GT</button>
      </PermissionGate>

      {/* Przycisk zapisu dla edytujących */}
      <PermissionGate permission="materials_edit">
        <button type="submit">Zapisz</button>
      </PermissionGate>
    </form>
  );
}
```

### Lista z Akcjami Warunkowym

```javascript
import { ResourcePermissionGate } from '../components/Common/PermissionGate';

function ClientsList() {
  const { clients } = useClients();

  return (
    <div>
      {clients.map(client => (
        <div key={client.id}>
          <h3>{client.name}</h3>

          {/* Edycja tylko jeśli ma uprawnienia */}
          <ResourcePermissionGate
            resource="clients"
            ownerId={client.userId}
            action="edit"
          >
            <button onClick={() => handleEdit(client)}>Edytuj</button>
          </ResourcePermissionGate>

          {/* Usuwanie tylko dla uprawnionych */}
          <ResourcePermissionGate
            resource="clients"
            ownerId={client.userId}
            action="delete"
          >
            <button onClick={() => handleDelete(client)}>Usuń</button>
          </ResourcePermissionGate>
        </div>
      ))}
    </div>
  );
}
```

## Debugowanie

```javascript
import { useRole } from '../context/RoleContext';

function DebugPermissions() {
  const { roles, hasPermission } = useRole();
  const currentRole = roles[userRole];

  console.log('Current role:', currentRole);
  console.log('All permissions:', currentRole?.permissions);
  console.log('Can edit materials:', hasPermission('materials_edit'));

  return <div>Check console for permission details</div>;
}
```
