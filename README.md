<h1>FT_TRANSCENDENCE</h1>

<h6>Done in collaboration with the amazing goffauxs, mdeclerf, 2BDia and Viforget</h6>

<h4>Summary</h4>
Ft_transcendence is a website where users can play real-time multiplayer Pong. They connect with the OAuth system of 42 intranet and have access to a chat, a leaderboard, a profile page etc...

The website is written in TypeScript and is using NestJs framework for the backend and React for the front. The database used for this project is PostgreSQL.

<h4>Installation</h4>

The first thing to do is adding a .env file with the following :
<code>
POSTGRES_HOST=...
POSTGRES_PORT=...
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_DB=...
NESTJS_PORT=...
COOKIE_SECRET=...
INTRA_CLIENT_ID=...
INTRA_CLIENT_SECRET=...
INTRA_CALLBACK_URL=...
SALT=...
REACT_APP_IP=...
</code>

Run the containers : 
<code>docker-compose up --build</code>

Inspect the database : 
<code>docker exec -it srcs_mariadb_1 bash</code>

<h4>Features</h4>

![Screenshot](screenshots_Readme/welcome.png)

<h6>User account</h6>

* The user can log in using the OAuth System of 42 Intranet.

* In his user page, he can change his name and his picture, set by default to those of 42 Intranet.

* He is able to enable two-factor authentication (Google Authenticator).

* On his profile page, he can add other users as friend, block other users (this way, he will no longer see the messages from the accounts he blocked), and send direct messages to them in a private chat room.

* He can access stats concerning his match history.

* And finally, his current status is displayed (online, offline, in a game).

![Screenshot](screenshots_Readme/profile_user.png)

<br></br>

<h6>Chat</h6>

* The users arriving to the chat page land in the general room. From that point, they can create channels, that can be public or protected by a password.

* The user who created a new channel is automatically set as the channel owner until he leaves it (in this case, the channel will be deleted). The channel owner can set a password required to access the channel, change it, and also remove it. He can set other users as administrators. Channel owners and administrators can ban or mute users for a limited time.

* The users are able to access other players profiles through the chat interface and they can also invite another player to a Pong match (the invitation can be accepted or declined).

![Screenshot](screenshots_Readme/chat.png)
![Screenshot](screenshots_Readme/chat_bis.png)

<h6>Game</h6>

* Users can play a live Pong game against each other. There is a matchmaking system, where the users can join a queue until they get matched with another player.

* The users can also watch live games thanks to the spectator mode.
![Screenshot](screenshots_Readme/game.png)

<h6>Leaderboard</h6>

* The leaderboard displays the current ranking of all the players.
![Screenshot](screenshots_Readme/leaderboard.png)


