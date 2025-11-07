import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // External packages for server-side rendering
  // Required for Better Auth + Turso/LibSQL integration
  serverExternalPackages: [
    '@libsql/kysely-libsql',
    '@libsql/isomorphic-ws',
    '@libsql/client',
  ],

  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize libSQL packages on server
      config.externals = config.externals || [];
      config.externals.push(
        '@libsql/kysely-libsql',
        '@libsql/isomorphic-ws',
        '@libsql/client'
      );
    }

    // Handle LICENSE and README files in node_modules
    // Prevents webpack errors when bundling packages
    config.module.rules.push({
      test: /\.(md|txt|LICENSE)$/,
      type: 'asset/source',
    });

    return config;
  },
};

export default nextConfig;
