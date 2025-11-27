# 🔧 Guía: Corregir Error "Cannot GET /api/auth/google" en Backend

## 🔍 Problema Identificado

El error `{"success":false,"statusCode":404,"path":"/api/auth/google","message":"Cannot GET /api/auth/google"}` indica que la ruta `/api/auth/google` no está siendo registrada por NestJS en el backend.

## ✅ Solución Paso a Paso

### Paso 1: Verificar que AuthModule esté importado en AppModule

**Archivo: `src/app.module.ts`**

Abre este archivo y verifica que tenga:

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';  // ✅ IMPORTAR AuthModule
// ... otros imports

@Module({
  imports: [
    // ... otros módulos (PrismaModule, UsuariosModule, etc.)
    AuthModule,  // ✅ DEBE estar en el array de imports
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

**❌ Si NO está importado:**
1. Agrega `import { AuthModule } from './auth/auth.module';` al inicio
2. Agrega `AuthModule` al array de `imports`

**✅ Verificación:**
- El archivo `src/auth/auth.module.ts` debe existir
- `AuthModule` debe estar en el array `imports` de `AppModule`

---

### Paso 2: Verificar que AuthController esté registrado en AuthModule

**Archivo: `src/auth/auth.module.ts`**

Abre este archivo y verifica que tenga:

```typescript
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';  // ✅ IMPORTAR
import { AuthService } from './auth.service';  // ✅ IMPORTAR
import { GoogleStrategy } from './strategies/google.strategy';  // ✅ IMPORTAR
import { JwtStrategy } from './strategies/jwt.strategy';  // Si lo usas
// ... otros imports necesarios

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      // ... configuración JWT
    }),
    // ... otros módulos necesarios (UsuariosModule, etc.)
  ],
  controllers: [AuthController],  // ✅ DEBE estar aquí
  providers: [
    AuthService,  // ✅ DEBE estar aquí
    GoogleStrategy,  // ✅ DEBE estar aquí
    JwtStrategy,  // Si lo usas
    // ... otros providers
  ],
  exports: [AuthService],  // Si otros módulos lo necesitan
})
export class AuthModule {}
```

**❌ Si AuthController NO está en controllers:**
1. Agrega `import { AuthController } from './auth.controller';`
2. Agrega `AuthController` al array `controllers`

**❌ Si GoogleStrategy NO está en providers:**
1. Agrega `import { GoogleStrategy } from './strategies/google.strategy';`
2. Agrega `GoogleStrategy` al array `providers`

**✅ Verificación:**
- `AuthController` debe estar en el array `controllers`
- `GoogleStrategy` debe estar en el array `providers`
- Todos los imports deben estar correctos

---

### Paso 3: Verificar que AuthController tenga la ruta correcta

**Archivo: `src/auth/auth.controller.ts`**

Abre este archivo y verifica que tenga:

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,  // ✅ Necesario para redirección
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';  // ✅ Necesario para redirección
import { AuthService } from './auth.service';
// ... otros imports

@Controller('auth')  // ✅ Esto se convierte en /api/auth con el prefijo global
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')  // ✅ Esto se convierte en /api/auth/google
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Inicia la autenticación con Google
    // No necesita retornar nada, Passport maneja la redirección
  }

  @Get('google/callback')  // ✅ Esto se convierte en /api/auth/google/callback
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const result = await this.authService.googleLogin(req.user);
    // ✅ Redirigir al frontend con una redirección HTTP real
    res.redirect(result.redirect);
  }

  // ... otros métodos
}
```

**❌ Si falta el método `googleAuth`:**
1. Agrega el método `@Get('google')` con el guard `AuthGuard('google')`

**❌ Si el callback no usa `res.redirect()`:**
1. Agrega `@Res() res: Response` al método
2. Cambia `return { url: result.redirect }` por `res.redirect(result.redirect)`

**✅ Verificación:**
- `@Controller('auth')` debe estar presente
- `@Get('google')` debe estar presente
- `@UseGuards(AuthGuard('google'))` debe estar en ambos métodos

---

### Paso 4: Verificar el prefijo global en main.ts

**Archivo: `src/main.ts`**

Abre este archivo y verifica que tenga:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ✅ Prefijo global para todas las rutas
  app.setGlobalPrefix('api', {
    exclude: ['/salud', '/'],  // Rutas excluidas del prefijo
  });
  
  // ... resto de la configuración (CORS, validación, etc.)
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
}
```

**✅ Verificación:**
- `app.setGlobalPrefix('api')` debe estar presente
- Esto hace que `@Controller('auth')` se convierta en `/api/auth`
- Y `@Get('google')` se convierta en `/api/auth/google`

---

### Paso 5: Verificar que GoogleStrategy esté correctamente configurado

**Archivo: `src/auth/strategies/google.strategy.ts`**

Abre este archivo y verifica que tenga:

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const backendUrl = configService.get<string>('BACKEND_URL') || 'http://localhost:3001';
    const cleanBackendUrl = backendUrl.replace(/\/+$/, '');
    const callbackURL = `${cleanBackendUrl}/api/auth/google/callback`;
    
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: callbackURL,  // ✅ URL de callback correcta
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    // ... lógica de validación
    done(null, usuario);
  }
}
```

**✅ Verificación:**
- `GoogleStrategy` debe extender `PassportStrategy(Strategy, 'google')`
- El `callbackURL` debe ser: `${BACKEND_URL}/api/auth/google/callback`
- Debe tener `clientID` y `clientSecret` configurados

---

### Paso 6: Verificar variables de entorno en Render

Ve al dashboard de Render y verifica que tengas estas variables:

```
BACKEND_URL=https://miru-franco.onrender.com
FRONTEND_URL=https://miru-franco.vercel.app
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
```

**✅ Verificación:**
- `BACKEND_URL` debe ser la URL completa de tu backend (sin barra final)
- `FRONTEND_URL` debe ser la URL completa de tu frontend (sin barra final)
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` deben estar configurados

---

### Paso 7: Compilar y Probar Localmente (Opcional)

Si quieres probar localmente antes de desplegar:

```bash
# Instalar dependencias
npm install

# Compilar
npm run build

# Ejecutar en desarrollo
npm run start:dev
```

Luego prueba:
```
http://localhost:3001/api/auth/google
```

Deberías ser redirigido a Google.

---

### Paso 8: Hacer Commit y Push

Una vez que hayas corregido todos los archivos:

```bash
# Verificar cambios
git status

# Agregar archivos modificados
git add src/app.module.ts
git add src/auth/auth.module.ts
git add src/auth/auth.controller.ts
git add src/auth/strategies/google.strategy.ts
# ... otros archivos que hayas modificado

# Hacer commit
git commit -m "fix: configurar AuthModule y rutas de Google OAuth correctamente"

# Push
git push
```

Render desplegará automáticamente si tienes auto-deploy configurado.

---

### Paso 9: Verificar el Deployment

1. Ve al dashboard de Render
2. Verifica que el último deployment haya sido exitoso
3. Revisa los logs para asegurarte de que no hay errores
4. Espera 2-5 minutos para que el servicio esté completamente desplegado

---

### Paso 10: Probar la Ruta

Después del deployment, prueba:

```
https://miru-franco.onrender.com/api/auth/google
```

**✅ Resultado esperado:**
- Deberías ser redirigido a Google para autenticarte
- Si ves el error 404, revisa los logs de Render

**❌ Si aún ves el error:**
- Revisa los logs de Render para ver errores de compilación
- Verifica que todos los módulos estén correctamente importados
- Asegúrate de que el código esté desplegado

---

## 🔍 Checklist de Verificación Final

Antes de probar, verifica que:

- [ ] `AuthModule` está importado en `AppModule`
- [ ] `AuthController` está en el array `controllers` de `AuthModule`
- [ ] `GoogleStrategy` está en el array `providers` de `AuthModule`
- [ ] `AuthController` tiene el método `@Get('google')`
- [ ] `AuthController` tiene el método `@Get('google/callback')` con `res.redirect()`
- [ ] El prefijo global `api` está configurado en `main.ts`
- [ ] Las variables de entorno están configuradas en Render
- [ ] El código está compilado y desplegado en Render
- [ ] No hay errores en los logs de Render

---

## 🐛 Errores Comunes y Soluciones

### Error 1: "AuthModule is not a module"

**Causa:** El archivo `auth.module.ts` no exporta correctamente el módulo.

**Solución:** Verifica que `auth.module.ts` tenga:
```typescript
@Module({ ... })
export class AuthModule {}  // ✅ Debe exportar la clase
```

### Error 2: "Cannot find module './auth/auth.module'"

**Causa:** La ruta de importación es incorrecta o el archivo no existe.

**Solución:** Verifica que:
- El archivo `src/auth/auth.module.ts` exista
- La ruta de importación sea correcta desde `app.module.ts`

### Error 3: "GoogleStrategy is not a provider"

**Causa:** `GoogleStrategy` no está en el array `providers` de `AuthModule`.

**Solución:** Agrega `GoogleStrategy` al array `providers` en `auth.module.ts`.

### Error 4: La ruta existe pero no redirige a Google

**Causa:** `GoogleStrategy` no está correctamente configurado o faltan credenciales.

**Solución:** Verifica que:
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén configurados
- El `callbackURL` sea correcto
- Las credenciales de Google sean válidas

---

## 📝 Estructura de Archivos Esperada

Tu proyecto backend debería tener esta estructura:

```
backend/
├── src/
│   ├── main.ts                    # ✅ Configuración del servidor
│   ├── app.module.ts              # ✅ Debe importar AuthModule
│   ├── auth/
│   │   ├── auth.module.ts         # ✅ Debe tener AuthController y GoogleStrategy
│   │   ├── auth.controller.ts     # ✅ Debe tener @Get('google') y @Get('google/callback')
│   │   ├── auth.service.ts        # ✅ Debe tener googleLogin()
│   │   └── strategies/
│   │       ├── google.strategy.ts # ✅ Debe extender PassportStrategy
│   │       └── jwt.strategy.ts
│   └── ...
└── ...
```

---

## 🚀 Listo!

Una vez que hayas seguido todos los pasos y verificado el checklist, el backend debería funcionar correctamente. La ruta `/api/auth/google` debería estar disponible y redirigir a Google para autenticación.

Si después de seguir todos los pasos aún tienes problemas, revisa los logs de Render para identificar el error específico.

