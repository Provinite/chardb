/**
 * Utility functions for seed script
 */

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

export const log = {
  phase(message: string): void {
    console.log(`\n${colors.cyan}[${message}]${colors.reset}`);
  },

  success(message: string): void {
    console.log(`  ${colors.green}\u2713${colors.reset} ${message}`);
  },

  skip(message: string): void {
    console.log(`  ${colors.yellow}\u25CB${colors.reset} ${message}`);
  },

  error(message: string): void {
    console.log(`  ${colors.red}\u2717${colors.reset} ${message}`);
  },

  info(message: string): void {
    console.log(`  ${colors.dim}${message}${colors.reset}`);
  },

  done(message: string): void {
    console.log(`\n${colors.green}${message}${colors.reset}\n`);
  },
};

/**
 * Check if a GraphQL error indicates the entity already exists
 */
export function isAlreadyExistsError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("already exists") ||
    message.includes("unique constraint") ||
    message.includes("duplicate")
  );
}
