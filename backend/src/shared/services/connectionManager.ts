import { WASocket } from "@whiskeysockets/baileys";

const connections = new Map<number, WASocket>();

export function setConnection(whatsappId: number, sock: WASocket) {
  connections.set(whatsappId, sock);
}

export function getConnection(whatsappId: number): WASocket | undefined {
  return connections.get(whatsappId);
}

export function deleteConnection(whatsappId: number) {
  connections.delete(whatsappId);
}
