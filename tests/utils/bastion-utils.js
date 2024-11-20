import filesync from 'fs';
import {createTunnel} from 'tunnel-ssh';

const postgresPort = 5432;

const tunnelOptions = {
  autoClose: false
};

const sshOptions = {
  host: '127.0.0.1',
  username: 'bastion',
  port: 22222,
  privateKey: filesync.readFileSync(
    './tests/utils/bastion-ssh-key-private'
  )
};

const serverOptions = {
  host: '127.0.0.1',
  port: postgresPort
};

const forwardOptions = {
  srcPort: postgresPort,
  dstAddr: 'cht-sync-postgres-1',
  dstPort: postgresPort
};

export const setupTunnel = async () => createTunnel(
  tunnelOptions, serverOptions, sshOptions, forwardOptions
);
