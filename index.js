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
    log(req);
    
    if(event === "users." + userId + ".create")
    {
      const myUsername = req.body.name;
      const createUserDoc = await db.createDocument('db', 'users', userId, { userA: myUsername, userB: null }, [ Permission.read(Role.user(userId)) ]);
    }
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
