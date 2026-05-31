"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-zinc-900 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Knnect360 API Documentation
            </h1>
            <p className="text-zinc-400 text-sm mt-0.5">
              REST API v1 for mobile and third-party integrations
            </p>
          </div>
          <span className="text-xs font-mono bg-zinc-800 px-3 py-1 rounded-full text-zinc-300">
            v1.0.0
          </span>
        </div>
      </header>

      {/* Swagger UI */}
      <main className="max-w-7xl mx-auto">
        <SwaggerUI
          url="/api/docs"
          docExpansion="list"
          defaultModelsExpandDepth={-1}
          persistAuthorization
        />
      </main>
    </div>
  );
}
