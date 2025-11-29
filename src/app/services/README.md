# Servicios API Centralizados

## Configuracion

### Uso Basico

```typescript
// Importar configuracion centralizada
import { getBackendBaseUrl, API_URL } from './config';

// O usar el default export
import API_URL from './config';

// Usar en peticiones
const response = await fetch(`${API_URL}/api/usuarios/login`, {
  method: 'POST',
  // ...
});
```

### Variables de Entorno

Crear archivo `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://miru-franco.onrender.com
```

O para desarrollo:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Cliente API

### Uso Recomendado

```typescript
import { apiClient } from './client';
import { getBackendBaseUrl } from './config';

// Peticion GET
const data = await apiClient.get('/api/usuarios/perfil', getBackendBaseUrl());

// Peticion POST
const result = await apiClient.post('/api/usuarios/registro', formData, getBackendBaseUrl());
```

## Servicios de Autenticacion

### Uso Recomendado

```typescript
import { api } from './auth';

// Login
const result = await api.login(email, password);

// Registro
const result = await api.register(registerData);

// Logout
await api.logout();

// Renovar token
await api.refreshToken();
```

## Migracion de Codigo Antiguo

### Antes

```typescript
const response = await fetch('http://localhost:3001/api/usuarios/login', {
  method: 'POST',
  // ...
});
```

### Despues

```typescript
import { getBackendBaseUrl } from '../services/config';

const BACKEND_BASE = getBackendBaseUrl();
const response = await fetch(`${BACKEND_BASE}/api/usuarios/login`, {
  method: 'POST',
  // ...
});
```

O mejor aun, usar el cliente API:

```typescript
import { api } from '../services/auth';

const result = await api.login(email, password);
```

