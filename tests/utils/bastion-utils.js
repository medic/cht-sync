// todo - ;)

import dotenv from 'dotenv';
import path from 'path';
import 'tunnel-ssh';
import filesync from 'fs';
import {createTunnel} from "tunnel-ssh";

dotenv.config({ path: path.join(import.meta.dirname, '..', '.e2e-env') });


const tunnelOptions = {
  autoClose:true
};
const sshOptions = {
  host: '127.0.0.1',
  port: 22222,
  privateKey: filesync.readFileSync(
    './tests/utils/bastion-ssh-key-private'
  )
};

// Here is where the magic happens...
const serverOptions = null; // automatic assign port by OS

// Note that the forwarding options does not define the srcAddr and srcPort here.
// to use the server configuration.
// const forwardOptions = {
//   dstAddr: '127.0.0.1',
//   dstPort: 27017
// };


// let [server, client] = await createTunnel(tunnelOptions, serverOptions, sshOptions, forwardOptions);
export const setupTunnel = async () => createTunnel(
  tunnelOptions, serverOptions, sshOptions
);

// const { readFileSync } = require('fs');
//
// const { Client } = require('ssh2');
//
// const conn = new Client();
// conn.on('ready', () => {
//     console.log('Client :: ready');
//     conn.exec('uptime', (err, stream) => {
//         if (err) throw err;
//         stream.on('close', (code, signal) => {
//             console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
//             conn.end();
//         }).on('data', (data) => {
//             console.log('STDOUT: ' + data);
//         }).stderr.on('data', (data) => {
//             console.log('STDERR: ' + data);
//         });
//     });
// }).connect({
//     host: '192.168.100.100',
//     port: 22,
//     username: 'frylock',
//     privateKey: readFileSync('/path/to/my/key')
// });

// example output:
// Client :: ready
// STDOUT:  17:41:15 up 22 days, 18:09,  1 user,  load average: 0.00, 0.01, 0.05
//
// Stream :: exit :: code: 0, signal: undefined
// Stream :: close



