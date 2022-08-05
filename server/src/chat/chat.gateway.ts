import { Inject, UseGuards } from '@nestjs/common';
import {
	WebSocketGateway,
	OnGatewayInit,
	WebSocketServer,
	OnGatewayConnection,
	SubscribeMessage,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { dataType } from 'src/utils/types';
import { CreateChatDto } from '../typeorm/chat/chat.dto';
import { ChatService } from '../typeorm/chat/chat.service';
import { CreateRoomDto } from 'src/typeorm/room/room.dto';
import { RoomService } from '../typeorm/room/room.service'

@WebSocketGateway({
	cors: {
		origin: "http://localhost:3000",
		methods: ["GET", "POST"],
	},
})

// @UseGuards(JwtAuthGuard)
@WebSocketGateway({ cors: true })
export class ChatGateway
implements OnGatewayConnection
{
	constructor(
		@Inject(ChatService) private readonly chatService: ChatService,
		@Inject(RoomService) private readonly roomService: RoomService
	) {}
		
	@WebSocketServer() server: Server;

	handleConnection(client: Socket) {
		// this.server.setMaxListeners(0); // Is it really fixing the bug ? I don't know...
		this.chatService.getActiveRooms()
		.then(function(result){
			client.emit("chat_connected", result);
		});
	}

	@SubscribeMessage("chat_join_room")
	chatJoinRoom(client: Socket, room: string) {
		this.roomService.getRoomOrCreate(room)
		.then(function(result) {
			if (result)
			{
				console.log(result.name);
				client.emit("chat_joined_room", result);
			}
		})
	}

	@SubscribeMessage("chat_send_message")
	chatSendMessage(client: Socket, data: dataType) {
		const { message, room, user } = data;
		let msg : CreateChatDto = new CreateChatDto();
		msg.body = message;
		msg.room_number = room ? room : 0;
		msg.user = user;
		this.chatService.createMessage(msg);
		client.to(room.toString()).emit("chat_receive_message", msg);
	}

	@SubscribeMessage("chat_get_room")
	handleChannels(client: Socket) : void {
		this.chatService.getActiveRooms()
		.then(function(result){
			client.emit("chat_set_rooms", result);
		});
	}
}