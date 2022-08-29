import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Blocklist, Chat, ChatUser, CreateChatDto, CreateChatUserDto, CreateRoomDto, Room, User } from '../typeorm/';
import { Repository } from 'typeorm';
import { PasswordDto } from 'src/utils/password.dto';
import { v4 as uuidv4 } from 'uuid';
import { ChannelOwner } from 'src/utils/channelOwner.dto';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {

	constructor(
		@InjectRepository(Chat) private readonly chatRepo: Repository<Chat>,
		@InjectRepository(Room) private readonly roomRepo: Repository<Room>,
		@InjectRepository(User) private readonly userRepo: Repository<User>,
		@InjectRepository(Blocklist) private readonly blockRepo: Repository<Blocklist>,
		@InjectRepository(ChatUser) private readonly chatUserRepo: Repository<ChatUser>
	) {
		this.roomRepo.upsert({ name: 'general', type: 'public' }, ["name"]);
	}

	//get all the table
	getChat() : Promise<Chat[]> {
		return this.chatRepo.find();
	}

	//Return every message of a room
	public async getRoomMessages(room_id: number, user: User) : Promise<Chat[]> {
		const blocklist = await this.userRepo.createQueryBuilder('users')
			.leftJoinAndSelect('users.blocking', 'blocker')
			.where('blocker.blocker = :id', { id: user.id })
			.getMany()

		if (Object.keys(blocklist).length !== 0)
			return this.getRoomMessagesBlocks(room_id, blocklist);
		else
			return this.getRoomMessagesNoBlocks(room_id);
	}

	public async getRoomMessagesBlocks(room_id: number, blocklist: User[])
	{
		return await this.chatRepo.createQueryBuilder('chat')
			.leftJoinAndSelect('chat.user', 'user')
			.where('chat.room_id = :id', { id: room_id })
			.where("chat.user_id NOT IN (:...ids)", {ids: blocklist.map(user => { return ( user.id )})})
			.orderBy('chat.createdat', 'ASC')
			.getMany();
	}

	public async getRoomMessagesNoBlocks(room_id: number)
	{
		return await this.chatRepo.createQueryBuilder('chat')
			.leftJoinAndSelect('chat.user', 'user')
			.where('chat.room_id = :id', { id: room_id })
			.orderBy('chat.createdat', 'ASC')
			.getMany();
	}

	getMessage(id: number): Promise<Chat> {
		return this.chatRepo.findOneBy({ message_id : id, });
	}

	//Add a message to the database from the DTO
	async createMessage(body: CreateChatDto) : Promise<Chat> {
		body.room = await this.getRoomByName(body.room.name);
		return this.chatRepo.save(body);
	}

	//Return the last message of a given room
	getLastMessage(room: Room): Promise<Chat> {

		return this.chatRepo.findOne({
			where: [{room : room}],
			order : {createdAt: 'DESC'}
			});
	}

	getUserByName(name: string): Promise<User> {
		return this.userRepo.findOneBy({ username: name });
	}

	getUserById(num: number): Promise<User> {
		return this.userRepo.findOneBy({ id: num });
	}

	getRoomByName(name: string): Promise<Room> {
		return this.roomRepo.findOneBy({ name: name });
	}

	getRoomById(id: number): Promise<Room> {
		return this.roomRepo.findOneBy({ id: id });
	}

	async getActiveRooms(userId: number) {
		return await this.roomRepo.createQueryBuilder('room')
			.leftJoinAndSelect('room.chat_user', 'chat_user')
			.where('chat_user.user_id = :id', { id: userId })
			.orderBy('chat_user.join_date', 'ASC')
			.getMany();
	}

	async getRoomOrCreate(name: string): Promise<Room> {
		await this.roomRepo.createQueryBuilder()
		.insert()
		.orIgnore()
		.into(Room)
		.values({name, type: 'public'})
		.execute();
		return this.roomRepo.findOneBy({ name: name });
	}

	createRoom(room: CreateRoomDto): Promise<Room> {
		return this.roomRepo.save(room);
	}

	async getChatUserStatus(chatUser: User, currentRoom: Room): Promise<string> {
		if (!chatUser || !currentRoom) return;
		const chatU = await this.chatUserRepo.findOne({
			where: {
				room: { id: currentRoom.id },
				user: { id: chatUser.id}
			},
		});
		if (!chatU)
			return;
		return chatU.status;
	}

	async createChatUserIfNotExists(chatUser: CreateChatUserDto) {
		const entry = this.chatUserRepo.create({
			room: await this.roomRepo.findOneBy({ id: chatUser.room_id }),
			user: await this.userRepo.findOneBy({ id: chatUser.user_id}),
			status: chatUser.status,
		});
		// console.log(entry.room);
		this.chatUserRepo.createQueryBuilder()
			.insert()
			.orIgnore()
			.into(ChatUser)
			.values(entry)
			.execute();
	}

	// select * from room left join chat_user on room.id=chat_user.room_id where chat_user.user_id = 2 and room.id IN 
	// (select chat_user.room_id from chat_user left join room on chat_user.room_id=room.id where user_id = 1 and room.type='private');

	async checkIfDmRoomExists(user1 : User, user2 : User) { /// HERE
		const room = await this.roomRepo.createQueryBuilder('room')
			.leftJoin('room.chat_user', 'chat_user')
			.where('chat_user.user_id = :id', {id: user1.id})
			.andWhere((qb) => {
				const subQuery = qb
					.subQuery()
					.select('chat_user.room_id')
					.from(ChatUser, 'chat_user')
					.where('chat_user.user_id = :user2id')
					.getQuery();
				return ("room.id IN " + subQuery);
			})
			.setParameter('user2id', user2.id)
			.andWhere("room.type = :type", { type: "private" })
			.getOne();
		if (!room) {
			const createdRoom = await this.createRoom({ name: uuidv4(), type: 'private', hash: '' });
			this.createChatUserIfNotExists({ user_id: user1.id, room_id: createdRoom.id, status: 'user' });
			this.createChatUserIfNotExists({ user_id: user2.id, room_id: createdRoom.id, status: 'user' });
			return { created: true, name: createdRoom.name};
		} else {
			return { created: false, name: room.name };
		}
	}

	async updateRoom(data: PasswordDto) {
		const room = await this.roomRepo.findOneBy({ name: data.name });
		return this.roomRepo.update(room.id, { hash: data.password, type: 'protected' });
	}

	async complete(query: string) {
		const result = await this.roomRepo.createQueryBuilder()
			.where('name like :name', { name: `%${query}%` })
			.getMany();

		return result.map(({ name, type }) => {
			return ({ name, type })
		});
	}
}
