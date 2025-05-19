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
    }
  }
  else if(req.path === "/like")
  {
      log(req.body);
      log(req.body.userB);
      if(!req.body.userB)
      {
         const getMyUserDoc = await db.getDocument('db', 'users', userId);

        try 
        {
          if(getMyUserDoc.match)
          {
              const listTheirDoc = await db.listDocuments('db', 'users', 
              [
                Query.equal('userA', [getMyUserDoc.userB]),
              ]);

              if(listTheirDoc.documents.length > 0)
              {
                const getTheirUserDoc = listTheirDoc.documents[0];
                const updateTheirDoc = await db.updateDocument('db', 'users', getTheirUserDoc.$id, { userA: getTheirUserDoc.userA, userB: getTheirUserDoc.userB, match: false }, [ Permission.read(Role.user(getTheirUserDoc.$id)) ]);
              }
  
          }
        }
        catch (err)
        {
            error('Error unmatching with user:', err);
        }
        finally
        {
            const updateUserDoc = await db.updateDocument('db', 'users', userId, { userA: getMyUserDoc.userA, userB: null, match: false }, [ Permission.read(Role.user(userId)) ]);
        }
        
        //return res.json({ status: "User not specified." });
      }

      const listTheirDoc = await db.listDocuments('db', 'users', 
      [
        Query.equal('userA', [req.body.userB]),
      ]);

      if(listTheirDoc.documents.length === 0)
      {
        return res.json({ status: `${req.body.userB} isn't registered.` });
      }

      const getMyUserDoc = await db.getDocument('db', 'users', userId);
      const getTheirUserDoc = listTheirDoc.documents[0];

      if(getMyUserDoc.match)
      {
          return res.json({ status: `You can't like ${req.body.userB} this week because you've already matched with ${getMyUserDoc.userB}. Try again next week!` });
      }

      if(getTheirUserDoc.match)
      {
          return res.json({ status: `You can't like ${req.body.userB} this week because they've already matched with someone else. Try again next week!` });
      }
    
      if(getTheirUserDoc.userB)
      {
          if(getTheirUserDoc.userB === getMyUserDoc.userA)
          {
              //It's a match!
              const updateUserDoc = await db.updateDocument('db', 'users', userId, { userA: getMyUserDoc.userA, userB: req.body.userB, match: true }, [ Permission.read(Role.user(userId)) ]);
              const updateTheirDoc = await db.updateDocument('db', 'users', getTheirUserDoc.$id, { userA: getTheirUserDoc.userA, userB: getTheirUserDoc.userB, match: true }, [ Permission.read(Role.user(getTheirUserDoc.$id)) ]);
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
  else if(req.path === "/delete")
  {
      try {
        const getMyUserDoc = await db.getDocument('db', 'users', userId);
        if(getMyUserDoc.match)
        {
            const listTheirDoc = await db.listDocuments('db', 'users', 
            [
              Query.equal('userA', [getMyUserDoc.userB]),
            ]);

            if(listTheirDoc.documents.length > 0)
            {
                const getTheirUserDoc = listTheirDoc.documents[0];
                const updateTheirDoc = await db.updateDocument('db', 'users', getTheirUserDoc.$id, { userA: getTheirUserDoc.userA, userB: getTheirUserDoc.userB, match: false }, [ Permission.read(Role.user(getTheirUserDoc.$id)) ]);
            }
        }
      }
      catch (err)
      {
          error('Error unmatching with user:', err);
      }

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
