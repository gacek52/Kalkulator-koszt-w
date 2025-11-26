import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const RoleContext = createContext();

// Domyślne role systemowe
const DEFAULT_ROLES = {
  'super-admin': {
    id: 'super-admin',
    name: 'Super Administrator',
    protected: true,
    email: 'gacek52@gmail.com',
    permissions: {
      // Użytkownicy
      users_view: true,
      users_create: true,
      users_edit: true,
      users_delete: true,
      users_disable: true,
      users_view_history: true,

      // Role (TYLKO super-admin)
      roles_manage: true,

      // Kalkulacje
      calculations_view_all: true,
      calculations_view_own: true,
      calculations_edit_all: true,
      calculations_edit_own: true,
      calculations_delete_all: true,
      calculations_delete_own: true,

      // Materiały
      materials_view: true,
      materials_edit: true,
      materials_sync: true,

      // Klienci
      clients_view_all: true,
      clients_view_own: true,
      clients_edit_all: true,
      clients_edit_own: true,
      clients_delete: true,

      // Stanowiska
      workstations_view: true,
      workstations_edit: true,
      workstations_capacity_view: true,

      // Pakowanie
      packaging_view: true,
      packaging_edit: true,
      packaging_sync: true,

      // Transport
      transport_view: true,
      transport_edit: true,
      transport_sync: true,

      // Katalog
      catalog_view_all: true,
      catalog_view_own: true,
      catalog_edit_all: true,
      catalog_edit_own: true,

      // Ustawienia
      settings_view: true,
      settings_edit: true,

      // Raporty
      reports_view: true,
      reports_export: true,

      // Client Manual
      client_manual_view: true,
      client_manual_edit: true
    }
  },
  'admin': {
    id: 'admin',
    name: 'Administrator',
    protected: false,
    permissions: {
      // Użytkownicy (nie może zarządzać innymi adminami)
      users_view: true,
      users_create: true,
      users_edit: true,
      users_delete: true,
      users_disable: true,
      users_view_history: true,

      // Role - NIE MA DOSTĘPU
      roles_manage: false,

      // Kalkulacje - TAKIE SAME jak super-admin
      calculations_view_all: true,
      calculations_view_own: true,
      calculations_edit_all: true,
      calculations_edit_own: true,
      calculations_delete_all: true,
      calculations_delete_own: true,

      // Materiały
      materials_view: true,
      materials_edit: true,
      materials_sync: true,

      // Klienci
      clients_view_all: true,
      clients_view_own: true,
      clients_edit_all: true,
      clients_edit_own: true,
      clients_delete: true,

      // Stanowiska
      workstations_view: true,
      workstations_edit: true,
      workstations_capacity_view: true,

      // Pakowanie
      packaging_view: true,
      packaging_edit: true,
      packaging_sync: true,

      // Transport
      transport_view: true,
      transport_edit: true,
      transport_sync: true,

      // Katalog
      catalog_view_all: true,
      catalog_view_own: true,
      catalog_edit_all: true,
      catalog_edit_own: true,

      // Ustawienia
      settings_view: true,
      settings_edit: true,

      // Raporty
      reports_view: true,
      reports_export: true,

      // Client Manual
      client_manual_view: true,
      client_manual_edit: true
    }
  },
  'user': {
    id: 'user',
    name: 'Użytkownik',
    protected: false,
    assignableByAdmin: true,
    permissions: {
      // Użytkownicy - NIE MA DOSTĘPU
      users_view: false,
      users_create: false,
      users_edit: false,
      users_delete: false,
      users_disable: false,
      users_view_history: false,

      // Role - NIE MA DOSTĘPU
      roles_manage: false,

      // Kalkulacje - TYLKO WŁASNE
      calculations_view_all: false,
      calculations_view_own: true,
      calculations_edit_all: false,
      calculations_edit_own: true,
      calculations_delete_all: false,
      calculations_delete_own: true,

      // Materiały - TYLKO ODCZYT
      materials_view: true,
      materials_edit: false,
      materials_sync: false,

      // Klienci - TYLKO WŁASNI
      clients_view_all: false,
      clients_view_own: true,
      clients_edit_all: false,
      clients_edit_own: true,
      clients_delete: false,

      // Stanowiska - TYLKO ODCZYT
      workstations_view: true,
      workstations_edit: false,
      workstations_capacity_view: true,

      // Pakowanie - TYLKO ODCZYT
      packaging_view: true,
      packaging_edit: false,
      packaging_sync: false,

      // Transport - TYLKO ODCZYT
      transport_view: true,
      transport_edit: false,
      transport_sync: false,

      // Katalog - TYLKO WŁASNE
      catalog_view_all: false,
      catalog_view_own: true,
      catalog_edit_all: false,
      catalog_edit_own: true,

      // Ustawienia - NIE MA DOSTĘPU
      settings_view: false,
      settings_edit: false,

      // Raporty - TYLKO WŁASNE
      reports_view: true,
      reports_export: false,

      // Client Manual - TYLKO ODCZYT
      client_manual_view: true,
      client_manual_edit: false
    }
  },
  'guest': {
    id: 'guest',
    name: 'Gość',
    protected: false,
    assignableByAdmin: true,
    permissions: {
      // Użytkownicy - NIE MA DOSTĘPU
      users_view: false,
      users_create: false,
      users_edit: false,
      users_delete: false,
      users_disable: false,
      users_view_history: false,

      // Role - NIE MA DOSTĘPU
      roles_manage: false,

      // Kalkulacje - TYLKO WŁASNE, TYLKO ODCZYT
      calculations_view_all: false,
      calculations_view_own: true,
      calculations_edit_all: false,
      calculations_edit_own: false,
      calculations_delete_all: false,
      calculations_delete_own: false,

      // Materiały - TYLKO ODCZYT
      materials_view: true,
      materials_edit: false,
      materials_sync: false,

      // Klienci - TYLKO ODCZYT WŁASNYCH
      clients_view_all: false,
      clients_view_own: true,
      clients_edit_all: false,
      clients_edit_own: false,
      clients_delete: false,

      // Stanowiska - TYLKO ODCZYT
      workstations_view: true,
      workstations_edit: false,
      workstations_capacity_view: false,

      // Pakowanie - TYLKO ODCZYT
      packaging_view: true,
      packaging_edit: false,
      packaging_sync: false,

      // Transport - TYLKO ODCZYT
      transport_view: true,
      transport_edit: false,
      transport_sync: false,

      // Katalog - TYLKO ODCZYT WŁASNYCH
      catalog_view_all: false,
      catalog_view_own: true,
      catalog_edit_all: false,
      catalog_edit_own: false,

      // Ustawienia - NIE MA DOSTĘPU
      settings_view: false,
      settings_edit: false,

      // Raporty - NIE MA DOSTĘPU
      reports_view: false,
      reports_export: false,

      // Client Manual - TYLKO ODCZYT (podstawowy dostęp dla gości)
      client_manual_view: true,
      client_manual_edit: false
    }
  }
};

export function RoleProvider({ children }) {
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [loading, setLoading] = useState(true);
  const { currentUser, userRole } = useAuth();

  // Załaduj role z Firestore
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const rolesSnapshot = await getDocs(collection(db, 'roles'));
        const firestoreRoles = {};

        rolesSnapshot.forEach(doc => {
          firestoreRoles[doc.id] = { id: doc.id, ...doc.data() };
        });

        // Jeśli Firestore jest pusty, zapisz domyślne role
        if (Object.keys(firestoreRoles).length === 0) {
          console.log('Initializing default roles in Firestore...');
          for (const [roleId, roleData] of Object.entries(DEFAULT_ROLES)) {
            await setDoc(doc(db, 'roles', roleId), roleData);
          }
          setRoles(DEFAULT_ROLES);
        } else {
          setRoles(firestoreRoles);
        }
      } catch (error) {
        console.error('Error loading roles:', error);
        setRoles(DEFAULT_ROLES); // Fallback to defaults
      } finally {
        setLoading(false);
      }
    };

    loadRoles();

    // Real-time listener for role changes
    const unsubscribe = onSnapshot(collection(db, 'roles'), (snapshot) => {
      const updatedRoles = {};
      snapshot.forEach(doc => {
        updatedRoles[doc.id] = { id: doc.id, ...doc.data() };
      });
      if (Object.keys(updatedRoles).length > 0) {
        setRoles(updatedRoles);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sprawdź czy użytkownik ma uprawnienie
  const hasPermission = (permission, customRole = null) => {
    if (!currentUser && !customRole) return false;

    const role = customRole || userRole || 'guest';

    // Super-admin ZAWSZE ma wszystkie uprawnienia
    if (role === 'super-admin' || currentUser?.email === 'gacek52@gmail.com') {
      return true;
    }

    const roleData = roles[role];

    if (!roleData) return false;

    return roleData.permissions[permission] === true;
  };

  // Sprawdź czy użytkownik to super-admin
  const isSuperAdmin = () => {
    return currentUser?.email === 'gacek52@gmail.com' || userRole === 'super-admin';
  };

  // Sprawdź czy użytkownik to admin lub super-admin
  const isAdminOrSuper = () => {
    return userRole === 'admin' || userRole === 'super-admin';
  };

  // Utwórz nową rolę (tylko super-admin)
  const createRole = async (roleData) => {
    if (!isSuperAdmin()) {
      throw new Error('Tylko Super Administrator może tworzyć role');
    }

    const roleId = roleData.id || roleData.name.toLowerCase().replace(/\s+/g, '-');

    await setDoc(doc(db, 'roles', roleId), {
      ...roleData,
      id: roleId,
      protected: false,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.uid
    });

    return roleId;
  };

  // Aktualizuj rolę (tylko super-admin)
  const updateRole = async (roleId, updates) => {
    if (!isSuperAdmin()) {
      throw new Error('Tylko Super Administrator może edytować role');
    }

    const role = roles[roleId];
    if (role?.protected) {
      throw new Error('Nie można edytować chronionej roli systemowej');
    }

    await updateDoc(doc(db, 'roles', roleId), {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.uid
    });
  };

  // Usuń rolę (tylko super-admin)
  const deleteRole = async (roleId) => {
    if (!isSuperAdmin()) {
      throw new Error('Tylko Super Administrator może usuwać role');
    }

    const role = roles[roleId];
    if (role?.protected) {
      throw new Error('Nie można usunąć chronionej roli systemowej');
    }

    // Sprawdź czy są użytkownicy z tą rolą
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const usersWithRole = usersSnapshot.docs.filter(doc => doc.data().role === roleId);

    if (usersWithRole.length > 0) {
      throw new Error(`Nie można usunąć roli. Jest przypisana do ${usersWithRole.length} użytkowników.`);
    }

    await deleteDoc(doc(db, 'roles', roleId));
  };

  // Pobierz listę ról (bez super-admin i admin dla zwykłych adminów)
  const getAvailableRoles = () => {
    const roleList = Object.values(roles);

    if (isSuperAdmin()) {
      return roleList; // Super-admin widzi wszystkie role
    }

    // Admin nie widzi super-admin ani admin (nie może tworzyć innych adminów)
    // Dodatkowo widzi tylko role z assignableByAdmin=true
    return roleList.filter(role =>
      role.id !== 'super-admin' &&
      role.id !== 'admin' &&
      (role.assignableByAdmin === true)
    );
  };

  // Sprawdź czy użytkownik może zobaczyć zasób (na podstawie ownership)
  const canViewResource = (resource, ownerId) => {
    const viewAllPermission = `${resource}_view_all`;
    const viewOwnPermission = `${resource}_view_own`;

    // Jeśli ma uprawnienie do wszystkich - pokaż
    if (hasPermission(viewAllPermission)) {
      return true;
    }

    // Jeśli ma uprawnienie do własnych I jest właścicielem - pokaż
    if (hasPermission(viewOwnPermission) && currentUser?.uid === ownerId) {
      return true;
    }

    return false;
  };

  // Sprawdź czy użytkownik może edytować zasób
  const canEditResource = (resource, ownerId) => {
    const editAllPermission = `${resource}_edit_all`;
    const editOwnPermission = `${resource}_edit_own`;

    // Jeśli ma uprawnienie do edycji wszystkich - pozwól
    if (hasPermission(editAllPermission)) {
      return true;
    }

    // Jeśli ma uprawnienie do edycji własnych I jest właścicielem - pozwól
    if (hasPermission(editOwnPermission) && currentUser?.uid === ownerId) {
      return true;
    }

    return false;
  };

  // Sprawdź czy użytkownik może usunąć zasób
  const canDeleteResource = (resource, ownerId) => {
    const deleteAllPermission = `${resource}_delete_all`;
    const deleteOwnPermission = `${resource}_delete_own`;

    // Jeśli ma uprawnienie do usuwania wszystkich - pozwól
    if (hasPermission(deleteAllPermission)) {
      return true;
    }

    // Jeśli ma uprawnienie do usuwania własnych I jest właścicielem - pozwól
    if (hasPermission(deleteOwnPermission) && currentUser?.uid === ownerId) {
      return true;
    }

    return false;
  };

  // Filtruj listę zasobów na podstawie uprawnień
  const filterResourcesByPermission = (resources, resourceType, ownerIdField = 'userId') => {
    if (!resources || !Array.isArray(resources)) return [];

    return resources.filter(resource => {
      const ownerId = resource[ownerIdField];
      return canViewResource(resourceType, ownerId);
    });
  };

  const value = {
    roles,
    loading,
    hasPermission,
    isSuperAdmin,
    isAdminOrSuper,
    createRole,
    updateRole,
    deleteRole,
    getAvailableRoles,
    canViewResource,
    canEditResource,
    canDeleteResource,
    filterResourcesByPermission,
    DEFAULT_ROLES
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within RoleProvider');
  }
  return context;
}

export default RoleContext;
