import { execSync } from 'child_process';

const composeFiles = [
  'docker-compose.yml',
].map(file => `-f ${file}`).join(' ');

const execDockerCommand = (command) => {
  try {
    return execSync(command).toString().trim();
  } catch (error) {
    console.error(`Failed to execute command "${command}":`, error);
    return '';
  }
};

export const stopService = (serviceName) => {
  execDockerCommand(`docker compose --env-file ./tests/.e2e-env ${composeFiles} stop ${serviceName}`);
};

export const isServiceRunning = (serviceName) => {
  const result = execDockerCommand(`docker ps -q --filter "name=${serviceName}"`);
  return result !== '';
};

export const startService = (serviceName) => {
  execDockerCommand(`docker compose --env-file ./tests/.e2e-env ${composeFiles} start ${serviceName}`);
};
