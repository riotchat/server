import http from '../main';
import WebSocket, { Server } from 'ws';
import { Packets, ClientPackets } from '../api/ws/v1';
import { User } from '../database/entity/imports';
import { dbConn } from '../database';

const wss = new Server({ server: http, path: "/ws" });

interface RiotSocket extends WebSocket {
	user: User
	send: (data: Packets) => void
};

export function SendPacket(obj: Packets, filter?: (ws: RiotSocket) => boolean) {
	let clients: WebSocket[] = [];
	wss.clients.forEach(c => clients.push(c));

	if (filter) {
		clients = clients.filter(filter);
	}

	clients.forEach(client =>
		client.send(JSON.stringify(obj))
	);
}

wss.on('connection', (ws: RiotSocket) => {
	let authenticated = false;

	ws.on('message', async (data: ClientPackets) => {
		if (authenticated) return;
		
		switch (data.type) {
			case 'authenticate':
				{
					let user = await dbConn.manager.findOne(User, {
						where: {
							accessToken: data.token
						}
					});

					if (user) {
						ws.send({
							type: 'authenticated'
						});

						authenticated = true;
					} else {
						ws.send({
							type: 'error',
							error: 'Unauthorised token!'
						});
					}
				}
				break;
		}
	});
});