import SendIcon from '@mui/icons-material/Send';
import { Avatar, AvatarGroup, Box, Button, CircularProgress, Divider, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import * as React from 'react';
import { subscribeToAutoSwitchRoom } from '../utils/socket_helpers';
import { Message, MessageGroup, Room, User } from '../utils/types';
import { ButtonCreateChannels } from './ButtonCreateChannels';
import { RoomSettings } from './RoomSettings';
import { ChatMsg } from './ChatMsg';
import LockIcon from '@mui/icons-material/Lock';
import { PasswordDialog } from './PasswordDialog';

interface ITabPanelProps {
	title: string;
	children?: React.ReactNode;
	message: string;
	index: number;
	value: number;
	messageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	messageSend: () => void;
	roomUsers: User[];
	currentUser: User | undefined;
	isProtected: boolean;
}

const TabPanel = (props: ITabPanelProps) => {
	const { title, message, children, value, index, messageChange, messageSend, roomUsers, currentUser, isProtected } = props;
	const divRef = React.useRef<HTMLDivElement>(null);
	const [passAuthenticated, setPassAuthenticated] = React.useState(false);

	const handleInput = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			event.preventDefault();
			messageSend();
		}
	};

	React.useEffect(() => {
		if (divRef && divRef.current) {
			divRef.current.scrollTo(0, divRef.current.scrollHeight);
		}
	}, [children])

	const getFirstFourNonSelfUsers = () => {
		if (roomUsers.length) {
			const tmp = roomUsers.filter(user => user && currentUser && user.id !== currentUser.id).slice(0, 3);

			return tmp.map((user, i) => {
				return (
					<Tooltip title={user.username} key={i}>
						<Avatar alt={user.username} src={user.photoURL} key={i}/>
					</Tooltip>
				)
			})
		}
	}

	const getChatAndInput = () => {
		if (isProtected && !passAuthenticated) {
			return <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }} ><CircularProgress /></Box>
		} else {
			return (
				<>
					<div style={{ flexGrow: 1, maxHeight: '80vh', overflowY: 'auto' }} ref={divRef}>
						{children}
					</div>
					<form style={{ flexGrow: 0, display: 'flex', flexDirection: 'row' }}>
							<TextField sx={{ flexGrow: 1 }} onChange={messageChange} value={message} onKeyDown={handleInput} autoComplete="off"/>
							<Button variant="outlined" onClick={messageSend}>
								<SendIcon />
							</Button>
					</form>
				</>
			)
		}
	}

	return (
		<>
			<div
				role="tabpanel"
				hidden={value !== index}
				id={`vertical-tabpanel-${index}`}
				aria-labelledby={`vertical-tab-${index}`}
				style={{ flexGrow: 1 }}
			>
				{value === index && (
					<Box sx={{ p: 3, minWidth: '80vw', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
						<Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
							<Box sx={{ display: 'flex', flexDirection: 'row'}}>
								<Typography sx={{ flexGrow: 0 }} variant="h4">{title}</Typography>
								<RoomSettings room={title}/>
							</Box>
							<AvatarGroup total={roomUsers.length}>
								{getFirstFourNonSelfUsers()}
							</AvatarGroup>
						</Box>
						<Divider />
						{getChatAndInput()}
					</Box>
				)}
			</div>
			{ (isProtected && !passAuthenticated && (value === index)) && (
				<PasswordDialog title={title} setPassAuthenticated={setPassAuthenticated} />
			)}
		</>
	);
}

const a11yProps = (index: number) => {
	return {
		id: `vertical-tab-${index}`,
		'aria-controls': `vertical-tabpanel-${index}`,
	};
}

export interface IVerticalTabsProps {
	rooms: Room[];
	message: string;
	messages: Message[];
	currentUser: User | undefined;
	switchRooms: (room: Room) => void;
	messagesLoading: boolean;
	messageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	messageSend: () => void;
	roomUsers: User[];
};

export const VerticalTabs = (props: IVerticalTabsProps) => {
	const { rooms, message, messages, currentUser, switchRooms, messageChange, messageSend, roomUsers } = props;
	const [value, setValue] = React.useState(0);
	const [formattedMessages, setFormattedMessages] = React.useState<MessageGroup[]>([]);

	React.useEffect(() => {
		const msgGrp: MessageGroup[] = [];
		for (let i = 0; i < messages.length; i++) {
			if (i === 0 || messages[i - 1].user.id !== messages[i].user.id) {
				msgGrp.push({
					side: (messages[i].user.id === currentUser?.id) ? 'right' : 'left', 
					messages: [messages[i].body], 
					user: messages[i].user
				});
			} else {
				msgGrp[msgGrp.length - 1].messages.push(messages[i].body);
			}
		}

		setFormattedMessages([]);
		setFormattedMessages(msgGrp);
	}, [messages, currentUser?.id]);

	React.useEffect(() => {
		subscribeToAutoSwitchRoom((data) => {
			setValue(data);
		})
	}, [])

	const mapChatBubbles = () => {
		return formattedMessages.map((msg, i) => {
			return (
				<ChatMsg
					user={msg.side === 'left' ? msg.user : undefined}
					messages={msg.messages}
					side={msg.side}
					key={i}
				/>
			)
		});
	}

	const handleChange = (event: React.SyntheticEvent, newValue: number) => {
		switchRooms(rooms[newValue]);
		setValue(newValue);
	};

	return (
		<Box
			sx={{
				bgColor: 'background.paper',
				flexGrow: 1,
				maxHeight: 'calc(100vh - 64px)',
				display: 'flex',
				overflow: 'hidden',
			}}
		>
			<Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
				<ButtonCreateChannels currentUser={currentUser} switchRooms={switchRooms}/>
				<Tabs
					orientation='vertical'
					variant="scrollable"
					value={value}
					onChange={handleChange}
					aria-label="Chat channels"
					sx={{ borderRight: 1, borderColor: 'divider', maxWidth: '20vw', flexGrow: 1 }}
				>
					{rooms.map((room, i) => {
						if (room.type === 'protected') {
							return (
								<Tab label={room.name} key={i} iconPosition='start' icon={<LockIcon />} {...a11yProps(i)} />
							)
						} else {
							return (
								<Tab label={room.name} key={i} {...a11yProps(i)} />
							)
						}
					})}
				</Tabs>
			</Box>
			{rooms.map((room, i) => {
				return (
					<TabPanel
						title={room.name}
						value={value}
						index={i}
						key={i}
						messageChange={messageChange}
						messageSend={messageSend}
						message={message}
						roomUsers={roomUsers}
						currentUser={currentUser}
						isProtected={room.type === 'protected'}
					>
						{mapChatBubbles()}
					</TabPanel>
				)
			})}
		</Box>
	)
}


