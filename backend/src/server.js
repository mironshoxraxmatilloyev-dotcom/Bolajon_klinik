import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

// Load environment variables FIRST
dotenv.config();

// MongoDB connection
import { connectMongoDB } from './config/mongodb.js';

// Import configurations
import { isRedisAvailable } from './config/redis.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';

// Import routes - MongoDB versions ONLY
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import patientRoutes from './routes/patient.routes.js';
import queueRoutes from './routes/queue.routes.js';
import billingRoutes from './routes/billing.routes.js';
import ambulatorRoutes from './routes/ambulator.routes.js';
import ambulatorInpatientRoutes from './routes/ambulator-inpatient.routes.js';
import inpatientRoutes from './routes/inpatient.routes.js';
import pharmacyRoutes from './routes/pharmacy.routes.js';
import staffRoutes from './routes/staff.routes.js';
import laboratoryRoutes from './routes/laboratory.routes.js';
import labPharmacyRoutes from './routes/lab-pharmacy.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import payrollRoutes from './routes/payroll.routes.js';
import communicationRoutes from './routes/communication.routes.js';
import taskRoutes from './routes/task.routes.js';
import doctorNurseRoutes from './routes/doctor-nurse.routes.js';
import prescriptionRoutes from './routes/prescription.routes.js';
import treatmentRoutes from './routes/treatment.routes.js';
import nurseRoutes from './routes/nurse.routes.js';
import sanitarRoutes from './routes/sanitar.routes.js';
import staffSalaryRoutes from './routes/staff-salary.routes.js';
import patientPortalRoutes from './routes/patient-portal.routes.js';
import botRoutes from './routes/bot.routes.js';
import aiChatbotRoutes from './routes/ai-chatbot.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import reportRoutes from './routes/report.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import labReagentRoutes from './routes/lab-reagent.routes.js';
import chiefDoctorRoutes from './routes/chief-doctor.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import cashierReportRoutes from './routes/cashier-report.routes.js';

// Import services
import { startTreatmentNotificationService } from './services/treatmentNotificationService.js';
import { startDailyReportScheduler } from './services/doctorDailyReportService.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      process.env.CORS_ORIGIN
    ].filter(Boolean),
    credentials: true
  }
});

// Middleware
app.use(compression());
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true
}));

// Apply rate limiting before other middleware
app.use(rateLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Clinic Management System API - MongoDB',
      version: '2.0.0',
      description: 'MongoDB-based API for Clinic Management System',
      contact: {
        name: 'API Support',
        email: 'support@clinic.uz'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Development server (MongoDB)'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/routes/*.js', './src/models/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'MongoDB',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes - MongoDB only
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/dashboard`, dashboardRoutes);
app.use(`/api/${API_VERSION}/patients`, patientRoutes);
app.use(`/api/${API_VERSION}/queue`, queueRoutes);
app.use(`/api/${API_VERSION}/billing`, billingRoutes);
app.use(`/api/${API_VERSION}/ambulator`, ambulatorRoutes);
app.use(`/api/${API_VERSION}/ambulator-inpatient`, ambulatorInpatientRoutes);
app.use(`/api/${API_VERSION}/inpatient`, inpatientRoutes);
app.use(`/api/${API_VERSION}/pharmacy`, pharmacyRoutes);
app.use(`/api/${API_VERSION}/staff`, staffRoutes);
app.use(`/api/${API_VERSION}/laboratory`, laboratoryRoutes);
app.use(`/api/${API_VERSION}/lab-pharmacy`, labPharmacyRoutes);
app.use(`/api/${API_VERSION}/reports`, reportsRoutes);
app.use(`/api/${API_VERSION}/payroll`, payrollRoutes);
app.use(`/api/${API_VERSION}/communications`, communicationRoutes);
app.use(`/api/${API_VERSION}/tasks`, taskRoutes);
app.use(`/api/${API_VERSION}/doctor-nurse`, doctorNurseRoutes);
app.use(`/api/${API_VERSION}/prescriptions`, prescriptionRoutes);
app.use(`/api/${API_VERSION}/treatments`, treatmentRoutes);
app.use(`/api/${API_VERSION}/nurse`, nurseRoutes);
app.use(`/api/${API_VERSION}/sanitar`, sanitarRoutes);
app.use(`/api/${API_VERSION}/staff-salary`, staffSalaryRoutes);
app.use(`/api/${API_VERSION}/patient-portal`, patientPortalRoutes);
app.use(`/api/${API_VERSION}/bot`, botRoutes);
app.use(`/api/${API_VERSION}/ai-chatbot`, aiChatbotRoutes);
app.use(`/api/${API_VERSION}/appointments`, appointmentRoutes);
app.use(`/api/${API_VERSION}/expenses`, expenseRoutes);
app.use(`/api/${API_VERSION}/attendance`, attendanceRoutes);
app.use(`/api/${API_VERSION}/lab-reagents`, labReagentRoutes);
app.use(`/api/${API_VERSION}/chief-doctor`, chiefDoctorRoutes);
app.use(`/api/${API_VERSION}/settings`, settingsRoutes);
app.use(`/api/${API_VERSION}/cashier-reports`, cashierReportRoutes);

// WebSocket for real-time updates
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-room', (room) => {
    socket.join(room);
    logger.info(`Socket ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);
global.io = io;

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectMongoDB().then(() => {
  httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📦 Database: MongoDB`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    if (isRedisAvailable) {
      logger.info('✅ Redis caching enabled');
    } else {
      logger.warn('⚠️  Running without Redis cache');
    }
    
    // Start treatment notification service
    startTreatmentNotificationService();
    logger.info('🔔 Treatment notification service started');
    
    // Start daily report scheduler for doctors
    startDailyReportScheduler();
    logger.info('📊 Daily report scheduler started (19:00 daily)');
  });
}).catch(error => {
  logger.error('Failed to connect to MongoDB:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export { io };

