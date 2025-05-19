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
      const createUserDoc = await db.createDocument('db', 'users', userId, { userA: req.body.name, userB: null, match: false }, [ Permission.read(Role.user(userId)) ]);
      log(user);
    }
  }
  else if(req.path === "/like")
  {
      /*
      if(req.body.userB)
      {
        const getMyUserDoc = await db.getDocument('db', 'users', userId);
        if(getMyUserDoc.match)
        {
            //You have to unmatch with who you've matched with...
            //The person you've matched with has to unmatch with you
            try
            {

            }
            catch(err)
            {
                //user that you've matched with previously no longer exists so you don't have to unmatch with them
            }
        }
        
        try
        {
          const getTheirUserDoc = await db.getDocument('db', 'users', req.body.userB);
          if(getTheirUserDoc.userB)
          {
              if(getTheirUserDoc.userB === getMyUserDoc.userA)
              {
                  //It's a match!
                  const updateUserDoc = await db.updateDocument('db', 'users', userId, { userA: getMyUserDoc.userA, userB: req.body.userB, match: true }, [ Permission.read(Role.user(userId)) ]);
                  const updateTheirDoc = await db.updateDocument('db', 'users', userId, { userA: getTheirDoc.userA, userB: getTheirDoc.userB, match: true }, [ Permission.read(Role.user(getTheirDoc.$id)) ]);
              }
              else
              {
                  const updateUserDoc = await db.updateDocument('db', 'users', userId, { userA: getMyUserDoc.userA, userB: req.body.userB, match: false }, [ Permission.read(Role.user(userId)) ]);
                
              }
          }
          else
          {
              const updateUserDoc = await db.updateDocument('db', 'users', userId, { userA: getMyUserDoc.userA, userB: req.body.userB, match: false }, [ Permission.read(Role.user(userId)) ]);
          }
          
        }
        catch(err)
        {
            return res.json({ status: "User specified isn't registered" });            
        }
        
      }
      else
      {
        return res.json({ status: "User not specified" });
      }
      */
  }
  else if(req.path === "/delete")
  {
      try {
        await db.deleteDocument('db', 'users', userId);
      } catch (err) {
        error('Error deleting user document:', err);
      }
    
      try {
        await users.delete(userId);
      } catch (err) {
        error('Error deleting user account:', err);
      }
  }
  return res.json({ status: "complete" });
};
