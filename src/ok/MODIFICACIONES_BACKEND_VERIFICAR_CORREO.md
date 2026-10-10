# Modificaciones para el Backend - Verificación de Correo en Tiempo Real

## 📋 Resumen
Se agregó un endpoint para verificar si un correo ya está registrado, permitiendo validación en tiempo real durante el registro y minimizando tiempos de espera.

## 🔧 Cambios Requeridos

### 1. Modificar `controllers/authController.js`

Agregar la siguiente función al final del archivo:

```javascript
// 🔹 Verificar si un correo ya está registrado (para validación en tiempo real)
export const verificarCorreoExistente = async (req, res) => {
  const { correo } = req.body;

  if (!correo) {
    return res.status(400).json({ 
      existe: false,
      message: "Correo no proporcionado" 
    });
  }

  try {
    const usuario = await Usuario.findOne({ correo });
    
    if (usuario) {
      return res.status(200).json({ 
        existe: true,
        message: "Este correo ya está registrado" 
      });
    }

    return res.status(200).json({ 
      existe: false,
      message: "Correo disponible" 
    });
  } catch (error) {
    console.error("Error al verificar correo:", error);
    return res.status(500).json({ 
      existe: false,
      message: "Error al verificar el correo" 
    });
  }
};
```

### 2. Modificar `routes/auth.js`

#### 2.1. Agregar el import

En la sección de imports, agregar `verificarCorreoExistente`:

```javascript
import {
  registerUser, 
  verificarOTP, 
  login,  
  reenviarCodigo,
  googleRegister,
  recuperarContraseña,
  verificarCodigoRecuperacion,
  actualizarContraseña,
  obtenerPreguntaSecreta,
  verificarRespuestaSecreta,
  verificarCorreoExistente,  // ← AGREGAR ESTA LÍNEA
} from "../controllers/authController.js";
```

#### 2.2. Agregar la ruta

Agregar la siguiente ruta (puede ir después de las otras rutas):

```javascript
// 🔹 Verificar si un correo ya está registrado (validación en tiempo real)
router.post("/verificar-correo", verificarCorreoExistente);
```

## 📍 Ubicación de los Archivos

- **Controlador**: `controllers/authController.js`
- **Rutas**: `routes/auth.js`

## 🔌 Endpoint Creado

**Ruta:** `POST /api/auth/verificar-correo`

**Body (JSON):**
```json
{
  "correo": "usuario@ejemplo.com"
}
```

**Respuesta si el correo EXISTE:**
```json
{
  "existe": true,
  "message": "Este correo ya está registrado"
}
```

**Respuesta si el correo NO EXISTE:**
```json
{
  "existe": false,
  "message": "Correo disponible"
}
```

**Respuesta de error:**
```json
{
  "existe": false,
  "message": "Error al verificar el correo"
}
```

## ✅ Checklist de Implementación

- [ ] Agregar función `verificarCorreoExistente` en `controllers/authController.js`
- [ ] Agregar import de `verificarCorreoExistente` en `routes/auth.js`
- [ ] Agregar ruta `POST /verificar-correo` en `routes/auth.js`
- [ ] Probar el endpoint con Postman o similar
- [ ] Verificar que el frontend pueda conectarse correctamente

## 🧪 Prueba del Endpoint

Puedes probar el endpoint con curl:

```bash
curl -X POST https://api.mirufranco.com/api/auth/verificar-correo \
  -H "Content-Type: application/json" \
  -d '{"correo": "test@ejemplo.com"}'
```

O con Postman:
- Método: POST
- URL: `https://api.mirufranco.com/api/auth/verificar-correo`
- Headers: `Content-Type: application/json`
- Body (raw JSON): `{"correo": "test@ejemplo.com"}`

## 📝 Notas

- El endpoint es ligero y rápido, solo hace una consulta a la base de datos
- No requiere autenticación (es público para validación durante registro)
- Retorna siempre status 200, pero con `existe: true/false` para indicar el resultado
- El frontend usa este endpoint con debounce de 500ms para evitar llamadas excesivas

