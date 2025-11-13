# Guía: Verificación de Dos Pasos (2FA) con Google Authenticator

## 📋 ¿Qué es Google Authenticator?

Google Authenticator es un sistema de **verificación de dos pasos (2FA)** que genera códigos de 6 dígitos que cambian cada 30 segundos. Se usa **después** de que el usuario ingresa su contraseña correctamente.

## 🔄 Flujo de Autenticación con 2FA

```
1. Usuario ingresa email + contraseña → Login exitoso
2. Si el usuario tiene 2FA activado:
   - Backend responde: { success: true, requires2FA: true, tempToken: "..." }
   - Frontend muestra campo para código de 2FA
3. Usuario ingresa código de 6 dígitos de Google Authenticator
4. Frontend envía código al backend para verificar
5. Si es correcto → Backend devuelve token JWT final
6. Usuario accede a la aplicación
```

## 🛠️ Implementación

### Backend (Node.js/Express)

#### 1. Instalar dependencias

```bash
npm install speakeasy qrcode
```

#### 2. Modelo de Usuario - Agregar campos 2FA

```javascript
// En tu modelo de Usuario
{
  email: String,
  password: String,
  // ... otros campos ...
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, default: null }, // Se guarda cuando activa 2FA
  tempToken: { type: String, default: null }, // Token temporal para verificar 2FA
  tempTokenExpires: { type: Date, default: null }
}
```

#### 3. Backend - Generar Secret y QR Code

```javascript
// routes/authRoutes.js o controllers/userController.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Endpoint para activar 2FA (generar QR)
router.post('/api/usuarios/:id/activar-2fa', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    
    // Generar secret único para el usuario
    const secret = speakeasy.generateSecret({
      name: `Miru Franco (${usuario.email})`,
      issuer: 'Miru Franco Beauty Salón'
    });
    
    // Guardar el secret (encriptado)
    usuario.twoFactorSecret = secret.base32;
    await usuario.save();
    
    // Generar QR Code como imagen
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    
    res.json({
      success: true,
      secret: secret.base32, // Para que el usuario lo guarde manualmente si quiere
      qrCode: qrCodeUrl, // Imagen base64 del QR
      manualEntryKey: secret.base32 // Para ingresar manualmente en la app
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### 4. Backend - Modificar Login para verificar 2FA

```javascript
// POST /api/usuarios/login
router.post('/api/usuarios/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 1. Verificar email y contraseña (como siempre)
    const usuario = await Usuario.findOne({ email });
    if (!usuario || !await bcrypt.compare(password, usuario.password)) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }
    
    // 2. Si tiene 2FA activado, NO dar token todavía
    if (usuario.twoFactorEnabled && usuario.twoFactorSecret) {
      // Generar token temporal válido por 5 minutos
      const tempToken = crypto.randomBytes(32).toString('hex');
      usuario.tempToken = tempToken;
      usuario.tempTokenExpires = Date.now() + 5 * 60 * 1000; // 5 minutos
      await usuario.save();
      
      return res.json({
        success: true,
        requires2FA: true,
        tempToken: tempToken, // Token temporal para verificar 2FA
        message: 'Ingresa el código de verificación de dos pasos'
      });
    }
    
    // 3. Si NO tiene 2FA, dar token JWT normal
    const token = jwt.sign(
      { id: usuario._id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        _id: usuario._id,
        email: usuario.email,
        name: usuario.nombre
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### 5. Backend - Verificar código 2FA

```javascript
// POST /api/usuarios/verificar-2fa
router.post('/api/usuarios/verificar-2fa', async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    
    // Buscar usuario por token temporal
    const usuario = await Usuario.findOne({
      tempToken: tempToken,
      tempTokenExpires: { $gt: Date.now() }
    });
    
    if (!usuario) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token temporal inválido o expirado' 
      });
    }
    
    // Verificar código de 2FA
    const verified = speakeasy.totp.verify({
      secret: usuario.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2 // Acepta códigos con ±1 periodo de tiempo (30 segundos)
    });
    
    if (!verified) {
      return res.status(401).json({ 
        success: false, 
        message: 'Código de verificación incorrecto' 
      });
    }
    
    // Código correcto → generar token JWT final
    const token = jwt.sign(
      { id: usuario._id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Limpiar token temporal
    usuario.tempToken = null;
    usuario.tempTokenExpires = null;
    await usuario.save();
    
    res.json({
      success: true,
      token,
      user: {
        _id: usuario._id,
        email: usuario.email,
        name: usuario.nombre
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### 6. Backend - Desactivar 2FA

```javascript
// POST /api/usuarios/:id/desactivar-2fa
router.post('/api/usuarios/:id/desactivar-2fa', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    usuario.twoFactorEnabled = false;
    usuario.twoFactorSecret = null;
    await usuario.save();
    
    res.json({ success: true, message: '2FA desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

### Frontend (Next.js/React)

#### 1. Actualizar auth.ts - Agregar métodos 2FA

```typescript
// src/app/services/auth.ts

export interface LoginResponse {
  success: boolean;
  requires2FA?: boolean; // Nuevo campo
  tempToken?: string; // Token temporal para verificar 2FA
  user?: {
    _id: string;
    email: string;
    name: string;
  };
  token?: string;
  error?: string;
}

export interface TwoFactorResponse {
  success: boolean;
  token?: string;
  user?: {
    _id: string;
    email: string;
    name: string;
  };
  error?: string;
}

export interface Enable2FAResponse {
  success: boolean;
  qrCode?: string; // Imagen base64 del QR
  secret?: string; // Secret para ingreso manual
  error?: string;
}

export const api = {
  // ... otros métodos ...
  
  async login(email: string, password: string): Promise<LoginResponse> {
    const BACKEND_BASE = getBackendBaseUrl();
    const data = await apiClient.post<LoginResponse>(
      '/api/usuarios/login', 
      { email, password }, 
      BACKEND_BASE
    );
    
    // Si no requiere 2FA, guardar token directamente
    if (data.success && data.token && !data.requires2FA) {
      saveAuthData(data);
    }
    
    return data;
  },
  
  // Verificar código 2FA
  async verify2FA(tempToken: string, code: string): Promise<TwoFactorResponse> {
    const BACKEND_BASE = getBackendBaseUrl();
    const data = await apiClient.post<TwoFactorResponse>(
      '/api/usuarios/verificar-2fa',
      { tempToken, code },
      BACKEND_BASE
    );
    
    if (data.success && data.token) {
      saveAuthData(data);
    }
    
    return data;
  },
  
  // Activar 2FA (generar QR)
  async enable2FA(userId: string): Promise<Enable2FAResponse> {
    const BACKEND_BASE = getBackendBaseUrl();
    return apiClient.post<Enable2FAResponse>(
      `/api/usuarios/${userId}/activar-2fa`,
      {},
      BACKEND_BASE
    );
  },
  
  // Desactivar 2FA
  async disable2FA(userId: string): Promise<{ success: boolean; error?: string }> {
    const BACKEND_BASE = getBackendBaseUrl();
    return apiClient.post(
      `/api/usuarios/${userId}/desactivar-2fa`,
      {},
      BACKEND_BASE
    );
  },
};
```

#### 2. Crear componente para verificar 2FA

```typescript
// src/app/components/auth/Verify2FA.tsx

'use client';

import { useState } from 'react';
import { colors, colorsWithOpacity } from '../../utils/colors';

interface Verify2FAProps {
  tempToken: string;
  email: string;
  onVerifySuccess: () => void;
  onCancel: () => void;
}

export default function Verify2FA({ 
  tempToken, 
  email, 
  onVerifySuccess,
  onCancel 
}: Verify2FAProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const { api } = await import('../../services');
      const result = await api.verify2FA(tempToken, code);
      
      if (result.success) {
        onVerifySuccess();
      } else {
        setError(result.error || 'Código incorrecto');
      }
    } catch (err) {
      console.error('Error verificando 2FA:', err);
      setError(err instanceof Error ? err.message : 'Error al verificar código');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-lg shadow-lg p-8 border bg-header-footer" style={{ borderColor: colorsWithOpacity.bordeSutil }}>
        <h2 className="text-page-title text-center mb-2 text-texto-fondo-oscuro">
          Verificación de Dos Pasos
        </h2>
        <p className="text-center mb-6 text-sm" style={{ color: colorsWithOpacity.textoFondoOscuro70 }}>
          Ingresa el código de 6 dígitos de tu aplicación Google Authenticator
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label 
              htmlFor="code" 
              className="block text-sm font-medium mb-2"
              style={{ color: '#F2F1ED' }}
            >
              Código de Verificación
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(value);
                setError('');
              }}
              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-colors text-center text-2xl tracking-widest"
              style={{ 
                backgroundColor: '#f2f1ed', 
                color: '#161616',
                borderColor: error ? '#590C0C' : 'rgba(255,255,255,0.2)'
              }}
              placeholder="000000"
              maxLength={6}
              disabled={isLoading}
              autoFocus
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="w-full py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#710014' }}
          >
            {isLoading ? 'Verificando...' : 'Verificar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onCancel}
            className="text-sm transition-colors"
            style={{ color: '#F2F1ED' }}
            disabled={isLoading}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 3. Actualizar Login.tsx para manejar 2FA

```typescript
// En src/app/components/auth/Login.tsx

const [requires2FA, setRequires2FA] = useState(false);
const [tempToken, setTempToken] = useState<string | null>(null);

const handleSubmit = async (e: React.FormEvent) => {
  // ... código de login ...
  
  const result = await api.login(email, password);
  
  if (result.success) {
    // Si requiere 2FA, mostrar componente de verificación
    if (result.requires2FA && result.tempToken) {
      setRequires2FA(true);
      setTempToken(result.tempToken);
      return;
    }
    
    // Si no requiere 2FA, login exitoso normal
    onLoginSuccess?.();
  }
};

// En el return, agregar:
{requires2FA && tempToken ? (
  <Verify2FA
    tempToken={tempToken}
    email={email}
    onVerifySuccess={() => {
      setRequires2FA(false);
      setTempToken(null);
      onLoginSuccess?.();
    }}
    onCancel={() => {
      setRequires2FA(false);
      setTempToken(null);
    }}
  />
) : (
  // ... formulario de login normal ...
)}
```

#### 4. Crear componente para activar 2FA (en perfil de usuario)

```typescript
// src/app/components/auth/Enable2FA.tsx

'use client';

import { useState } from 'react';
import { colors, colorsWithOpacity } from '../../utils/colors';

interface Enable2FAProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function Enable2FA({ userId, onSuccess, onCancel }: Enable2FAProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnable = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const { api } = await import('../../services');
      const result = await api.enable2FA(userId);
      
      if (result.success && result.qrCode) {
        setQrCode(result.qrCode);
        setSecret(result.secret || null);
      } else {
        setError(result.error || 'Error al activar 2FA');
      }
    } catch (err) {
      console.error('Error activando 2FA:', err);
      setError(err instanceof Error ? err.message : 'Error al activar 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-lg shadow-lg p-8 border bg-header-footer" style={{ borderColor: colorsWithOpacity.bordeSutil }}>
        <h2 className="text-page-title text-center mb-4 text-texto-fondo-oscuro">
          Activar Verificación de Dos Pasos
        </h2>
        
        {!qrCode ? (
          <>
            <p className="text-center mb-6 text-sm" style={{ color: colorsWithOpacity.textoFondoOscuro70 }}>
              1. Escanea el código QR con Google Authenticator<br/>
              2. Ingresa el código de 6 dígitos para confirmar
            </p>
            
            <button
              onClick={handleEnable}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#710014' }}
            >
              {isLoading ? 'Generando...' : 'Generar Código QR'}
            </button>
            
            {error && (
              <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
            )}
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <img 
                src={qrCode} 
                alt="QR Code para 2FA" 
                className="mx-auto mb-4"
                style={{ maxWidth: '200px' }}
              />
              {secret && (
                <p className="text-xs" style={{ color: colorsWithOpacity.textoFondoOscuro70 }}>
                  Si no puedes escanear, ingresa este código manualmente:<br/>
                  <code className="bg-gray-800 px-2 py-1 rounded">{secret}</code>
                </p>
              )}
            </div>
            
            <p className="text-center text-sm mb-4" style={{ color: colorsWithOpacity.textoFondoOscuro70 }}>
              Escanea el código QR con Google Authenticator y luego confirma ingresando un código de verificación.
            </p>
            
            <button
              onClick={onSuccess}
              className="w-full py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-colors mb-2"
              style={{ backgroundColor: '#6E7D57' }}
            >
              Ya lo escaneé, continuar
            </button>
            
            <button
              onClick={onCancel}
              className="w-full py-2 px-4 rounded-lg border font-medium hover:opacity-80 transition-colors text-sm"
              style={{ borderColor: colorsWithOpacity.bordeVisible, color: '#F2F1ED' }}
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## 📱 Instalación de Google Authenticator

Los usuarios necesitan instalar la app en sus teléfonos:
- **Android**: [Google Authenticator en Play Store](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2)
- **iOS**: [Google Authenticator en App Store](https://apps.apple.com/app/google-authenticator/id388497605)

---

## ✅ Resumen de Endpoints del Backend

1. **POST `/api/usuarios/login`** - Login normal (retorna `requires2FA: true` si está activado)
2. **POST `/api/usuarios/verificar-2fa`** - Verificar código de 6 dígitos
3. **POST `/api/usuarios/:id/activar-2fa`** - Activar 2FA (generar QR)
4. **POST `/api/usuarios/:id/desactivar-2fa`** - Desactivar 2FA

---

## 🔒 Seguridad

- El `twoFactorSecret` debe guardarse encriptado en la base de datos
- El `tempToken` expira en 5 minutos
- Los códigos TOTP son válidos por 30 segundos
- Se acepta un margen de ±1 periodo (window: 2) para problemas de sincronización

---

¿Quieres que implemente esto en tu código ahora?


