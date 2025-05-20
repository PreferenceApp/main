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

  //log(user);

  if (req.path === "/") 
  { 
    const event = req.headers['x-appwrite-event'];
    if(event === "users." + userId + ".create")
    {
      const createUserDoc = await db.createDocument('db', 'users', userId, { userA: req.body.name, userB: null, match: false }, [ Permission.read(Role.user(userId)) ]);    
    }
    log(event);
    log(req.body);
  }
  else if(req.path === "/totals")
  {
      const listAllDocs = await db.listDocuments('db', 'users', [
        Query.equal('userB', [user.name]),
        Query.limit(5000)
      ]);

      if(user.labels.length > 0)
      {
        const unixTime = Math.floor(Date.now() / 1000);
        log(unixTime);
          if(parseInt(user.labels[0]) >= unixTime)
          {
              return res.json({ status: listAllDocs.documents });
          }
          else
          {
            return res.json({ status: listAllDocs.total });
          }
      }
      else
      {
          return res.json({ status: listAllDocs.total });
      }
     // log(listAllDocs);
  }
  else if(req.path === "/like")
  {
      const body = JSON.parse(req.body);
      const userB = body.userB;
      if(!userB)
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
        
        return res.json({ status: `Successfully unliked everyone` });
      }

      const listTheirDoc = await db.listDocuments('db', 'users', 
      [
        Query.equal('userA', [userB]),
      ]);

      if(listTheirDoc.documents.length === 0)
      {
        return res.json({ status: `${userB} isn't registered.` });
      }

      const getMyUserDoc = await db.getDocument('db', 'users', userId);
      const getTheirUserDoc = listTheirDoc.documents[0];

      if(getMyUserDoc.match)
      {
          return res.json({ status: `You can't like ${userB} this week because you've already matched with ${getMyUserDoc.userB}. Try again next week!` });
      }

      if(getTheirUserDoc.match)
      {
          return res.json({ status: `You can't like ${userB} this week because they've already matched with someone else. Try again next week!` });
      }
    
      if(getTheirUserDoc.userB)
      {
          if(getTheirUserDoc.userB === getMyUserDoc.userA)
          {
              //It's a match!
              const updateUserDoc = await db.updateDocument('db', 'users', userId, { userA: getMyUserDoc.userA, userB: userB, match: true }, [ Permission.read(Role.user(userId)) ]);
              const updateTheirDoc = await db.updateDocument('db', 'users', getTheirUserDoc.$id, { userA: getTheirUserDoc.userA, userB: getTheirUserDoc.userB, match: true }, [ Permission.read(Role.user(getTheirUserDoc.$id)) ]);
          }
          else
          {
              const updateUserDoc = await db.updateDocument('db', 'users', userId, { userA: getMyUserDoc.userA, userB: userB, match: false }, [ Permission.read(Role.user(userId)) ]);
          }
      }
      else
      {
          const updateUserDoc = await db.updateDocument('db', 'users', userId, { userA: getMyUserDoc.userA, userB: userB, match: false }, [ Permission.read(Role.user(userId)) ]);
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
