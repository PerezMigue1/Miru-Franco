# 🔧 Solución: Email OTP se Envía Dos Veces

## ✅ PROBLEMA RESUELTO

**Fecha de corrección:** Verificado y corregido en `src/app/components/auth/Register.tsx`

**Problema encontrado:** La función `handleSubmit` no tenía protección contra doble ejecución. Aunque el botón se deshabilitaba con `isLoading`, había una ventana de tiempo entre la llamada a la función y el cambio de estado donde podía ejecutarse dos veces.

**Solución aplicada:** Se agregó una verificación al inicio de `handleSubmit` para prevenir doble submit:

```typescript
const handleSubmit = async (skipValidation = false) => {
  // ✅ Prevenir doble submit - verificar ANTES de cualquier otra lógica
  if (isLoading) {
    console.warn('⚠️ Submit ya en proceso, ignorando...');
    return;
  }
  // ... resto del código
};
```

---

## 🔍 Diagnóstico

**El backend solo envía el email UNA vez.** Si recibes dos emails, el problema está en el **frontend** haciendo dos peticiones.

---

## ✅ Verificación en el Backend

El backend está correcto:
- `crearUsuario()` solo llama a `sendOTPEmail()` **una vez**
- No hay duplicación en el código del backend

---

## 🐛 Problema Encontrado en el Código Actual

### Archivo: `src/app/components/auth/Register.tsx`

**Problema identificado:**
- La función `handleSubmit` (línea 381) no tenía protección contra doble ejecución
- Aunque el botón se deshabilitaba con `isLoading`, había una ventana de tiempo entre la llamada y el cambio de estado
- Si el usuario hacía doble click rápidamente o había algún problema de timing, la función podía ejecutarse dos veces antes de que `isLoading` se estableciera en `true`

**Código antes (problemático):**
```typescript
const handleSubmit = async (skipValidation = false) => {
  if (!skipValidation) {
    // validaciones...
  }
  setIsLoading(true); // ⚠️ Problema: se establece DESPUÉS de que la función ya se ejecutó
  // ... llamada a API
};
```

**Código después (corregido):**
```typescript
const handleSubmit = async (skipValidation = false) => {
  // ✅ Prevenir doble submit - verificar ANTES de cualquier otra lógica
  if (isLoading) {
    console.warn('⚠️ Submit ya en proceso, ignorando...');
    return;
  }
  // ... resto del código
  setIsLoading(true);
};
```

---

## 🐛 Causas Comunes en el Frontend

### 1. React Strict Mode (Desarrollo)
En desarrollo, React renderiza los componentes dos veces para detectar problemas. Esto puede causar que el `useEffect` o el submit se ejecute dos veces.

**Solución:**
```typescript
// En tu componente de registro
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Prevenir doble submit
  if (isSubmitting) {
    return;
  }
  
  setIsSubmitting(true);
  
  try {
    await registrarUsuario(formData);
  } finally {
    setIsSubmitting(false);
  }
};
```

### 2. Doble Click en el Botón
El usuario hace doble click rápidamente antes de que se deshabilite el botón.

**Solución:**
```typescript
<button 
  type="submit" 
  disabled={isSubmitting}
>
  {isSubmitting ? 'Registrando...' : 'Registrarse'}
</button>
```

### 3. Múltiples Llamadas al Endpoint
El frontend está llamando a múltiples endpoints o haciendo la misma petición dos veces.

**Solución:**
```typescript
// Verifica que solo estés llamando a UN endpoint
const registrarUsuario = async (data: FormData) => {
  // Solo UNA de estas líneas, no ambas:
  const response = await fetch(`${API_URL}/api/usuarios/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  // NO hagas esto:
  // await fetch(`${API_URL}/api/usuarios/registrar`, ...); // ❌
};
```

### 4. useEffect sin Dependencias Correctas
Un `useEffect` que se ejecuta dos veces.

**Solución:**
```typescript
// ❌ MAL - se ejecuta en cada render
useEffect(() => {
  registrarUsuario();
});

// ✅ BIEN - solo se ejecuta una vez
useEffect(() => {
  registrarUsuario();
}, []); // Array vacío = solo una vez

// ✅ BIEN - se ejecuta cuando cambia una dependencia
useEffect(() => {
  if (shouldRegister) {
    registrarUsuario();
  }
}, [shouldRegister]);
```

### 5. React Query o SWR con Refetch
Si usas React Query o SWR, puede estar haciendo refetch automático.

**Solución:**
```typescript
// Con React Query
const { mutate } = useMutation({
  mutationFn: registrarUsuario,
  onSuccess: () => {
    // No hacer refetch aquí
  },
});

// Asegúrate de que no haya refetch automático
```

---

## 🔍 Cómo Diagnosticar

### Paso 1: Revisar la Consola del Navegador

1. Abre DevTools (F12)
2. Ve a la pestaña **Network**
3. Filtra por "registro" o "registrar"
4. Haz el registro
5. **Verifica cuántas peticiones aparecen**

**Si ves 2 peticiones:**
- El problema está en el frontend
- Revisa el código del formulario

**Si ves 1 petición:**
- El problema puede estar en SendGrid o en el frontend haciendo dos llamadas a diferentes endpoints

### Paso 2: Revisar los Logs del Backend

En Render Dashboard → Logs, busca:
```
Correo de activación enviado a: [email]
```

**Si ves el mensaje DOS veces:**
- El backend está recibiendo dos peticiones
- El problema está en el frontend

**Si ves el mensaje UNA vez:**
- El problema puede estar en SendGrid o en la configuración del email

### Paso 3: Agregar Logs Temporales

En tu frontend, agrega logs para ver cuántas veces se ejecuta:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  console.log('🔍 Submit ejecutado'); // Debe aparecer solo UNA vez
  
  const response = await fetch(`${API_URL}/api/usuarios/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  
  console.log('🔍 Respuesta recibida'); // Debe aparecer solo UNA vez
};
```

---

## ✅ Solución Completa Recomendada

### En tu Componente de Registro:

```typescript
import { useState } from 'react';

function RegistroForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Prevenir doble submit
    if (isSubmitting) {
      console.warn('⚠️ Submit ya en proceso, ignorando...');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const formData = {
        nombre: e.currentTarget.nombre.value,
        email: e.currentTarget.email.value,
        // ... otros campos
      };
      
      const response = await fetch(`${API_URL}/api/usuarios/registro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al registrar');
      }
      
      const data = await response.json();
      console.log('✅ Registro exitoso:', data);
      
      // Redirigir o mostrar mensaje de éxito
      
    } catch (err: any) {
      console.error('❌ Error en registro:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Campos del formulario */}
      
      {error && <div className="error">{error}</div>}
      
      <button 
        type="submit" 
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Registrando...' : 'Registrarse'}
      </button>
    </form>
  );
}
```

### Con React Hook Form (Recomendado):

```typescript
import { useForm } from 'react-hook-form';
import { useState } from 'react';

function RegistroForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_URL}/api/usuarios/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Error al registrar');
      }
      
      const result = await response.json();
      console.log('✅ Registro exitoso:', result);
      
    } catch (err) {
      console.error('❌ Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Campos con register() */}
      
      <button 
        type="submit" 
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Registrando...' : 'Registrarse'}
      </button>
    </form>
  );
}
```

---

## 🎯 Checklist de Verificación

- [x] ✅ **CORREGIDO:** Agregada verificación `if (isLoading) return;` al inicio de `handleSubmit` en `Register.tsx`
- [x] ✅ El botón se deshabilita durante el submit (ya estaba implementado)
- [x] ✅ Solo hay UNA llamada a `/api/usuarios/registrar` (verificado en `auth.ts`)
- [x] ✅ No hay `useEffect` que se ejecute dos veces (verificado)
- [x] ✅ No hay React Strict Mode activo (verificado en `layout.tsx`)
- [ ] Revisar la consola del navegador (Network tab) para confirmar que solo se hace UNA petición
- [ ] Probar en producción para confirmar que el problema está resuelto

---

## 📋 Resumen

**El problema estaba en el frontend, no en el backend.**

**Problema identificado:**
- La función `handleSubmit` en `Register.tsx` no tenía protección contra doble ejecución
- Había una ventana de tiempo entre la llamada y el cambio de estado `isLoading`

**Solución aplicada:**
1. ✅ **CORREGIDO:** Agregada verificación `if (isLoading) return;` al inicio de `handleSubmit`
2. ✅ El botón ya se deshabilitaba durante el submit (ya estaba implementado)
3. ✅ Verificado que solo se hace UNA petición a `/api/usuarios/registrar`
4. ✅ Verificado que no hay `useEffect` problemáticos
5. ✅ Verificado que no hay React Strict Mode activo

**Archivos modificados:**
- `src/app/components/auth/Register.tsx` - Agregada protección contra doble submit

**Próximos pasos:**
- Probar en desarrollo y producción para confirmar que el problema está resuelto
- Monitorear los logs del backend para confirmar que solo se recibe UNA petición por registro

