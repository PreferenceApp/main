import { Client, TablesDB, Users, Permission, Role, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const userId = req.headers['x-appwrite-user-id'] || '';

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');

  const users = new Users(client);
  const tablesDB = new TablesDB(client);

  async function getDiscordUser(accessToken) {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Error fetching Discord user: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  const body = typeof req.body === 'string'
    ? JSON.parse(req.body)
    : req.body;

  log(body);

  if (req.path === "/") {
    const event = req.headers["x-appwrite-event"];

    if (
      event === `users.${userId}.sessions.${body.$id}.create`
    ) {
      try {
        let playerExists = true;

        try {
          const playersWithId = await tablesDB.listRows({
            databaseId: "db",
            tableId: "players",
            queries: [ Query.equal("userId", userId), Query.limit(1) ]
          });

          // Fetch Discord user information
          const discordUser = await getDiscordUser(
            body.providerAccessToken
          );
  
          log(discordUser);
          
          let _playerName = "";
          if(playersWithId.total === 0)
          {
            _playerName = discordUser.username;
          }
          else
          {
            _playerName = playersWithId.rows[0].playerName;
          }
          
          await tablesDB.upsertRow({
            databaseId: "db",
            tableId: "players",
            rowId: discordUser.id,
            data: {
              playerName: _playerName,
              userId: userId,
            },
            permissions: [
              Permission.read(Role.user(userId)),
              Permission.update(Role.user(userId)),
            ],
          });
        } catch (err) {
          error(err);
        }
      } catch (err) {
        error(err);
      }
    }
  }

  return res.json({ status: "complete" });
};
