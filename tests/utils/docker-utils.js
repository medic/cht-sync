import { execSync } from 'child_process';

const execDockerCommand = (command) => {
  try {
    return execSync(command).toString().trim();
  } catch (error) {
    console.error(`Failed to execute command "${command}":`, error);
    return '';
  }
};

export const stopService = (serviceName) => {
  execSync(`docker compose --env-file ./tests/.e2e-env -f docker-compose.yml -f docker-compose.couchdb.yml -f docker-compose.postgres.yml stop ${serviceName}`, { stdio: [] });
};

export const isServiceRunning = (serviceName) => {
  const result = execDockerCommand(`docker ps -q --filter "name=${serviceName}"`);
  return result !== '';
};

export const startService = (serviceName) => {
  execSync(`docker compose --env-file ./tests/.e2e-env -f docker-compose.yml -f docker-compose.couchdb.yml -f docker-compose.postgres.yml start ${serviceName}`, { stdio: [] });
};
