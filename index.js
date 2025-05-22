import { Client, Account, Databases, Users, Permission, Role, Query, ID } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  
  const userId = req.headers['x-appwrite-user-id'];
  
  const client = new Client()
     .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
     .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
     .setKey(req.headers['x-appwrite-key'] ?? '');
  
  const account = new Account(client);
  const users = new Users(client);
  const db = new Databases(client);

  const user = await users.get(userId);

  if (req.path === "/") 
  { 
    const event = req.headers['x-appwrite-event'];
    if(event === "users." + userId + ".create")
    {
      try
      {
        const createLastMessageSentDoc = await db.createDocument('db', 'lastMessageSent', userId, {discordUsername: userId }, [ Permission.read(Role.user(userId)) ]);
      }
      catch(err)
      {
        error(err);
      }
    }
    else if(event === "users." + req.body.userId + ".sessions." + req.body.$id + ".create")
    {
      let userData = null;
      try {
        const response = await fetch('https://discord.com/api/users/@me', {
          headers: {
            'Authorization': `Bearer ${req.body.providerAccessToken}`,
            'Content-Type': 'application/json'
          }
        });
    
        if (!response.ok) {
          throw new Error(`Error fetching user: ${response.statusText}`);
        }
    
        userData = await response.json();

        log(userData);
        
      } catch (err) {
        error('Failed to get Discord user:', err.message);
      }

      if(userData)
      {
        try
        {
            const getDiscordUserDoc = await db.getDocument('db', 'discordUsers', userId);
            if(!getDiscordUserDoc.discordUserId || !getDiscordUserDoc.discordUsername)
            {
              const updateDiscordUserDoc = await db.updateDocument('db', 'discordUsers', userId, { discordUserId: req.body.providerUid, discordUsername: userData.username }, [ Permission.read(Role.user(userId)) ]);
            }
        }
        catch(err)
        {
            const createDiscordUserDoc = await db.createDocument('db', 'discordUsers', userId, { discordUserId: req.body.providerUid, discordUsername: userData.username }, [ Permission.read(Role.user(userId)) ]);
        }
      }
    }
  }
  else if(req.path === "/like")
  {
    //can't be done client side
  }
  else if(req.path === "/unlike")
  {
    //can't be done client side
  }
  else if(req.path === "/crushes")
  {
    //can't be done client side
  }
  else if(req.path === "/delete")
  {
      try {
        const getDiscordUserDoc = await db.getDocument('db', 'discordUsers', userId);

        let done = false;

        while(!done) 
        {
          const response = await db.listDocuments('db', 'matches', [ Query.limit(25), Query.equal('userA', [getDiscordUserDoc.discordUsername]), Query.equal('match', true) ]);
          const documents = response.documents;
    
          for(const document of documents) {
            await db.deleteDocument('db', 'matches', document.$id);
          }
    
          if(documents.length === 0) {
            done = true;
          }
        }
      } catch (err) {
         error('Error deleting all matches documents:', err);
      }

      try {
        await db.deleteDocument('db', 'users', userId);
      } catch (err) {
        //If documents doesn't exist, continue..., else halt by return a response
        error('Error deleting user document:', err);
      }

      try {
        await db.deleteDocument('db', 'lastMessageSent', userId);
      } catch (err) {
        error('Error deleting lastMessageSent document:', err);
      }
    
      try {
        await users.delete(userId);
      } catch (err) {
        error('Error deleting user account:', err);
      }
  }
  return res.json({ status: "complete" });
};
