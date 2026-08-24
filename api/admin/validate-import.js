import { validateQuestionImport } from "../../lib/question-import.js";

async function requireAdmin(request){
 const token=request.headers.authorization?.replace(/^Bearer\s+/i,"");
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!token||!url||!key)throw Object.assign(new Error("Admin import is not configured."),{status:503});
 const userResponse=await fetch(`${url}/auth/v1/user`,{headers:{Authorization:`Bearer ${token}`,apikey:key}});
 if(!userResponse.ok)throw Object.assign(new Error("Authentication required."),{status:401});
 const user=await userResponse.json();
 const roleResponse=await fetch(`${url}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(user.id)}&role=in.(admin,content_reviewer)&select=role`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
 const roles=await roleResponse.json();
 if(!roleResponse.ok||!roles.length)throw Object.assign(new Error("Admin or reviewer access required."),{status:403});
 return user;
}

export default async function handler(request,response){
 if(request.method!=="POST")return response.status(405).json({error:"Method not allowed."});
 try{await requireAdmin(request);const result=validateQuestionImport(request.body?.records);return response.status(result.valid?200:422).json(result)}catch(error){return response.status(error.status||500).json({error:error.message||"Import validation failed."})}
}
