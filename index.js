import { Client, Databases, TablesDB, Users, Permission, Role, ID } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  
  const userId = req.headers['x-appwrite-user-id'] || '';
  
  const client = new Client()
     .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
     .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
     .setKey(req.headers['x-appwrite-key'] ?? '');
  
  const users = new Users(client);
  const tablesDB = new TablesDB(client);
  const db = new Databases(client);

  async function getDiscordUser(accessToken) {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
  
    if (!response.ok) {
      throw new Error(`Error fetching user: ${response.status} ${response.statusText}`);
    }
  
    return await response.json();
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  log(body);

  if (req.path === "/") 
  { 
    const event = req.headers['x-appwrite-event'];

    if(event === "users." + userId + ".sessions." + req.body.$id + ".create")
    {
      try
      {
        const user = await getDiscordUser(req.body.providerAccessToken);
        
        const upsertPlayerLoaderboard = await tablesDB.upsertRow({
          databaseId: 'db',
          tableId: 'playerleaderboard',
          rowId: userId,
          data: {
            discordUsername: user.username,
            totalPlayerPlacementPoints: 0,
            totalPlayerKOPoints: 0,
            totalPlayerDamagePoints: 0,
            totalPlayerDamageRaw: 0,
            gamesPlayed: 0
          }, 
          permissions: [
            Permission.read(Role.user(userId))
          ]
        });

        const updateName = await users.updateName({
            userId: userId,
            name: user.username
        });
      }
      catch(err)
      {
        error(err);
      }
    }
  }
  
  return res.json({ status: "complete" });
};
