const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

const serverDescription = process.env.APP_BASE_URL
  ? "Configured application server"
  : "Local development server";

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "User Management Service API",
      version: "1.0.0",
      description:
        "OpenAPI documentation for authentication, password management and user management routes.",
    },
    servers: [
      {
        url: appBaseUrl,
        description: serverDescription,
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwagger(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = setupSwagger;