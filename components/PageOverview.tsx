"use client";

import routesAnalysis from "@/lib/routes-analysis.json";

interface TableSchema {
  tableName: string;
  columns: string[];
  operations: string[];
}

interface ApiSchema {
  apiRoute: string;
  tables: TableSchema[];
}

interface RouteAnalysis {
  page: string;
  filePath: string;
  apiFetches: string[];
  schemas: ApiSchema[];
}

export function PageOverview() {
  const routes = routesAnalysis as RouteAnalysis[];

  const totalApiCalls = routes.reduce(
    (sum, route) => sum + route.apiFetches.length,
    0
  );

  const totalTables = new Set(
    routes.flatMap(r => r.schemas.flatMap(s => s.tables.map(t => t.tableName)))
  ).size;

  const pagesWithSchemas = routes.filter(r => r.schemas.length > 0);

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Total Pages</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {routes.length}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-900">API Routes</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">
                {totalApiCalls}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-900">DB Tables</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">
                {totalTables}
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-500 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* All Pages */}
      <div>
        <div className="flex items-center mb-4">
          <div className="h-8 w-1 bg-blue-500 rounded-full mr-3"></div>
          <h3 className="text-xl font-bold text-gray-900">Pages & Database Schemas</h3>
          <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {routes.length} pages
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {routes.map((route) => (
            <div
              key={route.page}
              className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>

                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-900 mb-1">{route.page}</h4>
                  <p className="text-xs text-gray-500 mb-3">{route.filePath}</p>

                  {route.schemas.length > 0 ? (
                    <div className="space-y-3 mt-4">
                      {route.schemas.map((schema, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center gap-2 mb-3">
                            <svg className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            <code className="text-sm text-gray-900 font-mono font-semibold">{schema.apiRoute}</code>
                          </div>
                          {schema.tables.map((table, tidx) => (
                            <div key={tidx} className="ml-6 mb-2 last:mb-0">
                              <div className="flex items-center gap-2 mb-1">
                                <svg className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                </svg>
                                <span className="font-mono text-sm font-bold text-gray-900">{table.tableName}</span>
                                <span className="text-xs text-gray-500">({table.operations.join(', ')})</span>
                              </div>
                              {table.columns.length > 0 && (
                                <div className="ml-6 text-xs text-gray-600">
                                  Columns: {table.columns.join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No database access</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-blue-900 mb-1">
              Keep this analysis up to date
            </h4>
            <p className="text-sm text-blue-800">
              Run <code className="bg-blue-100 px-2 py-0.5 rounded font-mono text-xs">npm run analyze-routes</code> whenever you add or modify pages to refresh this overview.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
