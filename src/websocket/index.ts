import http from '../main';
import WebSocket, { Server } from 'ws';

export const wss = new Server({ server: http, path: "/ws" });

wss.on('connection', (ws: WebSocket) => {
	console.log('connected');

	ws.on('message', (data) => {
		console.log(data);
	});
});