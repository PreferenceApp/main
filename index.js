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

  const body = typeof req.body === 'string' ? JSON.parse(req.body): req.body;

  if (req.path === "/") {
    const event = req.headers["x-appwrite-event"];
  
    if (event === `users.${userId}.sessions.${body.$id}.create`) {
      try {
        // 1. Fetch Discord details first to get the correct rowId (discordUser.id)
        const discordUser = await getDiscordUser(body.providerAccessToken);
        
        // 2. Fetch by rowId directly instead of an attribute query for maximum speed
        let existingRow = null;
        try {
          existingRow = await tablesDB.getRow({
            databaseId: "db",
            tableId: "players",
            rowId: discordUser.id
          });
        } catch (e) {
          // Row doesn't exist yet, which is expected for new users
        }
  
        let newData = {};
  
        if (!existingRow) {
          // New User Initialization
          newData = {
            playerName: discordUser.global_name,
          };
        } else {
          // Returning User: Map existing data to prevent losing other columns
          newData = {
            ...existingRow, // Keeps all other database columns intact
          };
        }
        
        // 3. Save or update the record
        await tablesDB.upsertRow({
          databaseId: "db",
          tableId: "players",
          rowId: discordUser.id,
          data: newData,
          permissions: [
            Permission.read(Role.user(userId)),
            Permission.update(Role.user(userId)),
          ],
        });

        //could upload discordUser.avatar to avatars
      } catch (err) {
        error(err);
      }
    }
  }

  return res.json({ status: "complete" });
};
