import { Client, TablesDB, Users, Permission, Role } from 'node-appwrite';

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
        // Check if the player already exists
        let playerExists = true;

        try {
          await tablesDB.getRow({
            databaseId: "db",
            tableId: "players",
            rowId: userId,
          });
        } catch (err) {
          if (err.code === 404) {
            playerExists = false;
          } else {
            throw err;
          }
        }

        // If the player already exists, do nothing
        if (playerExists) {
          log(`Player ${userId} already exists.`);
          return res.json({ status: "complete" });
        }

        // Fetch Discord user information
        const discordUser = await getDiscordUser(
          body.providerAccessToken
        );

        // Create player row
        await tablesDB.createRow({
          databaseId: "db",
          tableId: "players",
          rowId: userId,
          data: {
            playerName: discordUser.username,
          },
          permissions: [
            Permission.read(Role.user(userId)),
            Permission.update(Role.user(userId))
          ],
        });

        // Create leaderboard row
        await tablesDB.createRow({
          databaseId: "db",
          tableId: "playerleaderboard",
          rowId: userId,
          data: {
            players: userId, // relationship
            totalPlayerPlacementPoints: 0,
            totalPlayerKOPoints: 0,
            totalPlayerDamagePoints: 0,
            totalPlayerDamageRaw: 0,
            gamesPlayed: 0,
          },
        });

        // Update Appwrite user's display name
        await users.updateName({
          userId,
          name: discordUser.username,
        });

        log(`Created player ${discordUser.username} (${userId})`);
      } catch (err) {
        error(err);
      }
    }
  }

  return res.json({ status: "complete" });
};
