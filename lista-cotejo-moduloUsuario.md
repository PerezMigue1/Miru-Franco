✅ Lista de Cotejo de Seguridad para Módulo de Usuario

1. Registro de Uusuario
⚠️ -Validación de datos de entrada
    -Intentar enviar datos malformados (ej. <script>, SQL injection). El sistema debe rechazarlos y sanitizarlos.
    -NOTA: Frontend sanitiza antes de enviar. El BACKEND debe validar y sanitizar TODOS los campos recibidos para prevenir XSS por peticiones directas.

✅ -Verificación de correo electrónico
    -No debería poder iniciar sesión sin validar el correo.

✅ -Hash seguro de contraseñas
    -Revisar base de datos y confirmar que no existan contraseñas en texto plano. Validar uso de bcrypt/Argon2.

✅ -Requisitos de complejidad de contraseña
    -Probar crear contraseñas simples ("123456"). El sistema debe rechazarlas e indicar los requisitos.

2. Recuperación de Contraseña

✅ -Enlace de recuperación con expiración
    -Solicitar enlace. El enlace debe expirar.

✅ -Validación de usuario
    -Intentar recuperación con correo inexistente. El sistema no debe revelar si el usuario existe.

✅ -Limitación de intentos de recuperación
    -Repetir solicitudes de recuperación (>3 veces). El sistema debe limitar o retrasar los intentos.

3. Inicio de Sesión

✅ -Bloqueo tras intentos fallidos (fuerza bruta)
    -Intentar iniciar sesión con 3 contraseñas erróneas. La cuenta debe bloquearse temporalmente.

✅ -Uso de HTTPS
    -Revisar que todas las URLs de autenticación usen HTTPS y que el certificado sea válido.

✅ -Sesiones expiradas
    -Iniciar sesión y esperar periodo inactivo (>15 min). El sistema debe cerrar sesión automáticamente.

✅ -Revocación de sesiones activas
    -Iniciar sesión en varios dispositivos. Cerrar sesión en uno y comprobar que el token se invalida en el otro.

❌ -Autenticación multifactor (MFA)
    -Activar MFA y probar login sin segundo factor. El acceso debe ser denegado.

✅ Tokens JWT seguros
    -Revisar estructura del token (header.payload.signature). Confirmar uso de RS256 o HS256 y expiración definida.

✅ -OAuth2.0 seguro
    -Revisar flujos OAuth (Authorization Code Flow). El token no debe exponerse en URLs ni en logs.

4.Contraseñas
⚠️ -Pregunta secreta segura
    -Intentar adivinar respuestas comunes. Verificar uso de preguntas personalizadas o MFA como refuerzo.

✅ -Uso de salts en el hash
    -Revisar implementación. Cada contraseña debe tener un salt único almacenado.

✅ -Política de longitud mínima
    -Probar contraseña <8 caracteres. El sistema debe rechazarla.

✅ -Contraseñas en tránsito cifradas
    -Usar herramienta de sniffing (Wireshark). Contraseña no debe viajar en texto claro.

5. Desarrollo Seguro

✅ -Protección contra XSS (Frontend)
    -Ingresar <script>alert(1)</script> en campos de texto. No debe ejecutarse.
    -✅ VERIFICADO: Frontend sanitiza correctamente todos los campos antes de enviar (nombre, referencia, tratamientos, etc.)
    -⚠️ PENDIENTE: El BACKEND también debe sanitizar todos los campos de texto recibidos para prevenir inyecciones directas (peticiones HTTP bypass del frontend).

⚠️ -Protección contra CSRF
    -Revisar peticiones POST sensibles y confirmar presencia de token CSRF.

✅ -Protección contra inyecciones SQL
    -Intentar ' OR '1'='1 en campos de login. El sistema debe rechazarlo sin error del servidor.

✅ -Uso de cabeceras de seguridad HTTP
    -Revisar con SecurityHeaders.com. Deben estar presentes CSP, HSTS, X-Frame-Options.

🟢 -Revisión de dependencias seguras
    -Ejecutar herramienta como OWASP Dependency-Check o Snyk. No deben existir CVEs críticas.

✅ -Logging seguro
    -Revisar registros. No deben contener contraseñas ni datos sensibles.

⚠️ -Control de acceso (RBAC)
    -Intentar acceder a recurso admin con usuario estándar. Acceso debe ser denegado.

6. Evaluación de Vulnerabilidades
✅ -Pruebas de inyección SQL / NoSQL
    -Usar Burp Suite o OWASP ZAP para buscar parámetros vulnerables. Ninguno debe permitir ejecución de código.

✅ -Pruebas de XSS (Frontend)
    -Escanear con OWASP ZAP o introducir scripts en formularios. No deben ejecutarse en la interfaz.
    -✅ VERIFICADO: Frontend sanitiza scripts antes de enviar. Payload muestra caracteres escapados (&lt;script&gt; → &lt;script&gt;)
    -⚠️ PENDIENTE: Verificar que el backend también sanitiza. Enviar petición POST directa al backend con <script>alert(1)</script> en campos de registro. El backend debe sanitizar antes de guardar.

✅ -Validación de tokens de sesión
    -Revisar que los JWT expiren al cerrar sesión. Verificar invalidación inmediata.

🟢 -Análisis de dependencias vulnerables
    -Escanear con npm audit, pip-audit o Snyk. Sin vulnerabilidades críticas.

🟢 -Pruebas de configuración HTTPS/TLS
    -Escanear con SSL Labs. Calificación mínima A-. TLS 1.2 o superior habilitado.

🟢 -Evaluación de cookies
    -Revisar cookies con DevTools. Deben tener atributos HttpOnly, Secure, SameSite.

---

## Leyenda de Estado

- ✅ **Implementado**: Funcionalidad completamente implementada y funcionando
- ⚠️ **Parcialmente Implementado**: Código existe pero necesita activación o integración
- ❌ **No Implementado**: Falta desarrollar completamente
- 🟢 **Solo Verificar**: Requiere verificación manual o pruebas externas (no requiere código)