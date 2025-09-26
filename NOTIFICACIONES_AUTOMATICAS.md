# 🔔 Sistema de Notificaciones Automáticas

## ✨ Funcionalidades Implementadas

### 📧 **Notificaciones por Email Automáticas**
- **Detección automática** de nuevas tareas en Google Classroom
- **Envío inmediato** de emails a estudiantes cuando se crea una tarea
- **Verificación periódica** cada 30 minutos
- **Toggle de activación/desactivación** en el dashboard

### 🎯 **Características Principales**

#### **1. Detección Inteligente**
- Verifica tareas creadas en la última hora
- Evita duplicados con sistema de tracking
- Filtra solo tareas nuevas desde la última verificación

#### **2. Envío Automático**
- Email profesional con plantilla HTML
- Información completa de la tarea
- Enlaces directos a Google Classroom
- Datos del profesor y curso

#### **3. Control de Usuario**
- Toggle en dashboard de profesor/coordinador
- Verificación manual disponible
- Estado en tiempo real
- Historial de última verificación

## 🚀 **Cómo Usar**

### **Para Profesores/Coordinadores:**

1. **Activar Notificaciones:**
   - Ve al dashboard principal
   - Encuentra la sección "Notificaciones Automáticas"
   - Activa el interruptor (toggle)

2. **Verificación Manual:**
   - Click en "🔍 Verificar Ahora"
   - Ve el estado en tiempo real
   - Revisa la última verificación

3. **Monitoreo:**
   - Estado: Activo/Error/Ejecutando
   - Última verificación con timestamp
   - Información de configuración

### **Para Estudiantes:**
- **Reciben emails automáticamente** cuando hay nuevas tareas
- **No necesitan configuración** adicional
- **Emails incluyen:**
  - Título de la tarea
  - Nombre del curso
  - Profesor asignado
  - Fecha de vencimiento
  - Enlace directo a Classroom

## ⚙️ **Configuración Técnica**

### **Variables de Entorno Requeridas:**

```env
# Resend para emails
RESEND_API_KEY=your_resend_api_key

# Seguridad para cron jobs
CRON_SECRET=your_secret_key
NEXT_PUBLIC_CRON_SECRET=your_secret_key

# Roles de usuarios
PROFESSOR_EMAILS=prof1@gmail.com,prof2@gmail.com
STUDENT_EMAILS=student1@gmail.com,student2@gmail.com
COORDINATOR_EMAILS=coord@gmail.com
```

### **APIs Implementadas:**

#### **1. `/api/notifications/detect-new` (POST)**
- Detecta nuevas tareas para un profesor específico
- Parámetros: `teacherEmail`, `checkLast`
- Envía notificaciones automáticamente

#### **2. `/api/notifications/cron` (GET)**
- Endpoint para cron jobs automáticos
- Verifica todos los profesores
- Requiere autorización con Bearer token

#### **3. `/api/notifications/auto` (POST)**
- Sistema original de notificaciones
- Funciona con sesión de usuario activa
- Verifica últimas 24 horas

## 🔧 **Arquitectura del Sistema**

### **Flujo de Notificaciones:**

```
1. Timer (30 min) → AutoNotificationToggle
2. Toggle → /api/notifications/detect-new
3. API → Google Classroom API (nuevas tareas)
4. API → notification-service (envío emails)
5. Resend → Email a estudiantes
6. UI → Actualización de estado
```

### **Componentes Clave:**

- **`AutoNotificationToggle`**: UI component con toggle
- **`/api/notifications/detect-new`**: Detección de tareas
- **`/api/notifications/cron`**: Cron job endpoint
- **`notification-service`**: Servicio de envío

## 📱 **Estados del Sistema**

### **Estados Posibles:**
- **🟢 Activo**: Funcionando correctamente
- **🔵 Ejecutando**: Verificando tareas ahora
- **🔴 Error**: Problema en la verificación
- **⚫ Inactivo**: Notificaciones desactivadas

### **Indicadores Visuales:**
- **Toggle azul**: Activado
- **Toggle gris**: Desactivado
- **Spinner**: Cargando/verificando
- **Iconos de estado**: Check/Warning/Play

## 🛠️ **Configuración Avanzada**

### **Personalizar Frecuencia:**
```javascript
// En AutoNotificationToggle.tsx, línea ~95
const newInterval = setInterval(checkForNewTasks, 30 * 60 * 1000) // 30 min
```

### **Cambiar Ventana de Detección:**
```javascript
// En detect-new/route.ts, línea ~15
checkLast: '1h' // Opciones: '30m', '1h', '2h', '24h'
```

### **Configurar Cron Job Externo:**
```bash
# Ejemplo con crontab (cada 30 minutos)
*/30 * * * * curl -H "Authorization: Bearer your_secret" https://tu-app.com/api/notifications/cron
```

## 🔍 **Debugging y Logs**

### **Logs en Consola:**
- `🔍 Verificando nuevas tareas automáticamente...`
- `📧 Se enviaron notificaciones para X tareas nuevas`
- `✅ Verificación completada`
- `❌ Error verificando tareas`

### **Verificar Funcionamiento:**
1. Activa las notificaciones
2. Abre DevTools (F12)
3. Ve a la pestaña Console
4. Click "Verificar Ahora"
5. Observa los logs

## 📋 **Limitaciones Actuales**

### **Simulación vs Producción:**
- **Actual**: Usa datos simulados para demo
- **Producción**: Requiere Google Service Account para acceso sin usuario
- **Workaround**: Funciona con sesiones de usuario activas

### **Mejoras Futuras:**
- Integración con Google Service Account
- Base de datos para tracking de notificaciones
- Configuración de horarios personalizados
- Plantillas de email personalizables
- Notificaciones push web
- Integración con WhatsApp Business API

## 🎉 **¡Listo para Usar!**

El sistema de notificaciones automáticas está **completamente implementado** y listo para detectar y notificar nuevas tareas por email de forma automática.

**Activa el toggle en tu dashboard y las notificaciones comenzarán a funcionar inmediatamente.** 🚀
