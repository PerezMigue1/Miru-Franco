# Guía de Configuración: SendGrid para Verificación de Correo

Esta guía te ayudará a configurar SendGrid paso a paso para enviar correos de verificación OTP.

## 📋 Tabla de Contenidos

1. [Crear Cuenta en SendGrid](#1-crear-cuenta-en-sendgrid)
2. [Obtener API Key](#2-obtener-api-key)
3. [Verificar Dominio (Opcional pero Recomendado)](#3-verificar-dominio-opcional-pero-recomendado)
4. [Variables de Entorno Necesarias](#4-variables-de-entorno-necesarias)
5. [Configurar Variables en tu Backend](#5-configurar-variables-en-tu-backend)
6. [Probar el Envío de Correos](#6-probar-el-envío-de-correos)

---

## 1. Crear Cuenta en SendGrid

### Paso 1: Registrarse
1. Ve a [https://sendgrid.com/](https://sendgrid.com/)
2. Haz clic en **"Start for free"** o **"Sign Up"**
3. Completa el formulario de registro:
   - Nombre
   - Email
   - Contraseña
   - Nombre de la empresa (opcional)

### Paso 2: Verificar Email
1. Revisa tu correo electrónico
2. Haz clic en el enlace de verificación que SendGrid te envió
3. Completa el proceso de verificación

### Paso 3: Completar Perfil
1. SendGrid te pedirá información adicional:
   - Tipo de uso (selecciona "Transactional Email")
   - Lenguaje preferido
   - Zona horaria

---

## 2. Obtener API Key

### Paso 1: Ir a Settings
1. Una vez dentro de SendGrid, ve al menú lateral izquierdo
2. Haz clic en **Settings** (Configuración)
3. Selecciona **API Keys**

### Paso 2: Crear API Key
1. Haz clic en **"Create API Key"** (Crear API Key)
2. Asigna un nombre a tu API Key (ej: "Miru Franco OTP")
3. Selecciona los permisos:
   - **Full Access** (Acceso completo) - Para desarrollo
   - O **Restricted Access** (Acceso restringido) - Solo "Mail Send" para producción
4. Haz clic en **"Create & View"**
5. **⚠️ IMPORTANTE:** Copia la API Key inmediatamente. Solo se muestra una vez.
   - Ejemplo: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Paso 3: Guardar la API Key
Guarda esta API Key en un lugar seguro. La necesitarás para la variable de entorno.

---

## 3. Verificar Dominio (Opcional pero Recomendado)

Para enviar correos desde tu propio dominio (ej: `noreply@mirufranco.com`), necesitas verificar tu dominio.

### Opción A: Usar Email de SendGrid (Para Pruebas)
- Puedes usar el email por defecto de SendGrid sin verificar dominio
- Ejemplo: `noreply@sendgrid.net`
- **Limitación:** Solo puedes enviar a direcciones verificadas manualmente

### Opción B: Verificar Dominio (Recomendado para Producción)

1. Ve a **Settings** → **Sender Authentication**
2. Selecciona **Domain Authentication**
3. Haz clic en **"Authenticate Your Domain"**
4. Sigue las instrucciones para agregar registros DNS:
   - CNAME records
   - TXT records
5. Una vez verificado, podrás usar emails como: `noreply@tudominio.com`

---

## 4. Variables de Entorno Necesarias

Necesitas **3 variables de entorno** para SendGrid:

### Variables Requeridas:

```env
# API Key de SendGrid (OBLIGATORIA)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Email desde el cual se enviarán los correos (OBLIGATORIA)
SENDGRID_FROM_EMAIL=noreply@sendgrid.net
# O si verificaste tu dominio:
# SENDGRID_FROM_EMAIL=noreply@mirufranco.com

# Nombre que aparecerá como remitente (OPCIONAL pero recomendado)
SENDGRID_FROM_NAME=Miru Franco Salón Beauty
```

### Explicación de cada Variable:

1. **SENDGRID_API_KEY**
   - **Qué es:** La clave API que obtuviste en el paso 2
   - **Dónde obtenerla:** Settings → API Keys → Create API Key
   - **Formato:** `SG.` seguido de una cadena larga de caracteres
   - **Ejemplo:** `SG.abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`

2. **SENDGRID_FROM_EMAIL**
   - **Qué es:** El email desde el cual se enviarán los correos
   - **Opciones:**
     - Para pruebas: `noreply@sendgrid.net` (o el que SendGrid te asigne)
     - Para producción: `noreply@tudominio.com` (requiere verificar dominio)
   - **Dónde obtenerla:**
     - SendGrid te asigna una por defecto
     - O verifica tu dominio para usar tu propio email

3. **SENDGRID_FROM_NAME** (Opcional)
   - **Qué es:** El nombre que aparecerá como remitente
   - **Ejemplo:** "Miru Franco Salón Beauty"
   - **Si no la defines:** SendGrid usará el email como nombre

---

## 5. Configurar Variables en tu Backend

### Opción A: Archivo `.env` (Desarrollo Local)

Crea o edita el archivo `.env` en la raíz de tu proyecto backend:

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.tu_api_key_aqui
SENDGRID_FROM_EMAIL=noreply@sendgrid.net
SENDGRID_FROM_NAME=Miru Franco Salón Beauty
```

**⚠️ IMPORTANTE:**
- Agrega `.env` a tu `.gitignore` para no subirlo a GitHub
- Nunca compartas tu API Key públicamente

### Opción B: Variables de Entorno en Vercel/Railway/Heroku (Producción)

#### En Vercel:
1. Ve a tu proyecto en [vercel.com](https://vercel.com)
2. Settings → Environment Variables
3. Agrega cada variable:
   - `SENDGRID_API_KEY` = `SG.tu_api_key`
   - `SENDGRID_FROM_EMAIL` = `noreply@sendgrid.net`
   - `SENDGRID_FROM_NAME` = `Miru Franco Salón Beauty`
4. Selecciona los ambientes (Production, Preview, Development)
5. Guarda los cambios

#### En Railway:
1. Ve a tu proyecto en [railway.app](https://railway.app)
2. Settings → Variables
3. Agrega cada variable con el botón **"+ New Variable"**
4. Guarda los cambios

#### En Heroku:
1. Ve a tu proyecto en [heroku.com](https://heroku.com)
2. Settings → Config Vars
3. Haz clic en **"Reveal Config Vars"**
4. Agrega cada variable
5. Guarda los cambios

---

## 6. Probar el Envío de Correos

### Paso 1: Instalar Dependencia

En tu proyecto backend, instala SendGrid:

```bash
npm install @sendgrid/mail
```

### Paso 2: Crear Archivo de Prueba

Crea un archivo `test-email.js` en tu backend:

```javascript
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const testEmail = async () => {
  const msg = {
    to: 'tu-email@ejemplo.com', // Cambia por tu email
    from: {
      name: process.env.SENDGRID_FROM_NAME || 'Miru Franco',
      email: process.env.SENDGRID_FROM_EMAIL,
    },
    subject: 'Prueba de Email - SendGrid',
    html: '<h1>¡Funciona!</h1><p>Si recibes este correo, SendGrid está configurado correctamente.</p>',
  };

  try {
    await sgMail.send(msg);
    console.log('✅ Email enviado correctamente');
  } catch (error) {
    console.error('❌ Error enviando email:', error.response?.body || error.message);
  }
};

testEmail();
```

### Paso 3: Ejecutar Prueba

```bash
node test-email.js
```

Si recibes el correo, ¡todo está configurado correctamente!

---

## 📝 Checklist de Configuración

- [ ] Crear cuenta en SendGrid
- [ ] Verificar email de registro
- [ ] Crear API Key en SendGrid
- [ ] Copiar y guardar la API Key de forma segura
- [ ] Configurar `SENDGRID_API_KEY` en variables de entorno
- [ ] Configurar `SENDGRID_FROM_EMAIL` en variables de entorno
- [ ] Configurar `SENDGRID_FROM_NAME` en variables de entorno (opcional)
- [ ] Instalar `@sendgrid/mail` en el backend
- [ ] Probar envío de correo con script de prueba
- [ ] Verificar que los correos lleguen correctamente

---

## 🔒 Seguridad

### Buenas Prácticas:

1. **Nunca subas tu API Key a GitHub:**
   - Agrega `.env` a `.gitignore`
   - Usa variables de entorno en producción

2. **Rota tu API Key periódicamente:**
   - Si sospechas que fue comprometida, créala de nuevo en SendGrid
   - Actualiza la variable de entorno

3. **Usa permisos restringidos en producción:**
   - En lugar de "Full Access", usa "Restricted Access"
   - Solo habilita "Mail Send"

4. **Monitorea el uso:**
   - Revisa el dashboard de SendGrid regularmente
   - Detecta actividad sospechosa

---

## 💰 Planes y Límites de SendGrid

### Plan Gratuito (Free):
- **100 emails/día** gratis
- Perfecto para desarrollo y pruebas
- Sin tarjeta de crédito requerida

### Plan Essentials ($19.95/mes):
- **50,000 emails/mes**
- Para producción pequeña/mediana

### Plan Pro ($89.95/mes):
- **100,000 emails/mes**
- Para producción grande

**Nota:** El plan gratuito es suficiente para empezar. Puedes actualizar cuando lo necesites.

---

## 🆘 Solución de Problemas

### Error: "Unauthorized"
- **Causa:** API Key incorrecta o sin permisos
- **Solución:** Verifica que la API Key sea correcta y tenga permisos de "Mail Send"

### Error: "Forbidden"
- **Causa:** Email remitente no verificado
- **Solución:** Verifica el dominio o usa el email por defecto de SendGrid

### Los correos no llegan
- **Causa:** Pueden estar en spam
- **Solución:** 
  - Revisa la carpeta de spam
  - Verifica que el email remitente esté verificado
  - Considera verificar tu dominio para mejor deliverability

### Error: "Rate limit exceeded"
- **Causa:** Excediste el límite de emails del plan
- **Solución:** Espera o actualiza tu plan

---

## 📞 Recursos Adicionales

- [Documentación oficial de SendGrid](https://docs.sendgrid.com/)
- [Guía de API Keys](https://docs.sendgrid.com/ui/account-and-settings/api-keys)
- [Verificación de Dominio](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication)
- [Soporte de SendGrid](https://support.sendgrid.com/)

---

## ✅ Siguiente Paso

Una vez que tengas SendGrid configurado, continúa con la implementación del backend siguiendo la guía:
**`GUIA_VERIFICACION_OTP_BACKEND.md`**

