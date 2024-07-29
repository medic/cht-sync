import { execSync } from 'child_process';

const composeFiles = [
  'docker-compose.yml',
  'docker-compose.couchdb.yml',
  'docker-compose.postgres.yml'
].join(' -f ');

const execDockerCommand = (command) => {
  try {
    return execSync(command).toString().trim();
  } catch (error) {
    console.error(`Failed to execute command "${command}":`, error);
    return '';
  }
};

export const stopService = (serviceName) => {
  //execSync(`docker compose --env-file ./tests/.e2e-env -f ${composeFiles} stop ${serviceName}`, { stdio: [] });
  execDockerCommand(`docker compose --env-file ./tests/.e2e-env -f ${composeFiles} stop ${serviceName}`);
};

export const isServiceRunning = (serviceName) => {
  const result = execDockerCommand(`docker ps -q --filter "name=${serviceName}"`);
  return result !== '';
};

export const startService = (serviceName) => {
  execDockerCommand(`docker compose --env-file ./tests/.e2e-env -f ${composeFiles} start ${serviceName}`);
  //execSync(`docker compose --env-file ./tests/.e2e-env -f ${composeFiles} start ${serviceName}`, { stdio: [] });
};
