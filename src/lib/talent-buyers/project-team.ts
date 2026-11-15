export type TeamRole = "owner" | "admin" | "coordinator";
export type TeamWorkspace = {
 id:string; title:string; role:TeamRole;
 capacity: {limit:number;used:number;pending:number;pass:boolean}|null;
 members: {user_id:string;name:string;role:TeamRole;job_title:string}[];
 invitations: {id:string;email:string;role:"admin"|"coordinator";job_title:string;enabled:boolean;accepted:boolean;expires_at:string;delivery:string}[];
 schedule: {id:string;category_id?:string;original_day?:string;title:string;date:string|null;start_time:string|null;end_time:string|null;location:string|null}[];
};
