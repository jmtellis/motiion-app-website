import {name,text,type Row} from './model.ts';
export const directorySorts = ['newest','oldest','name'] as const;
export function sortDirectory(rows: Row[], sort = 'newest') {
  return [...rows].sort((a,b) => {
    const tie = name(a).localeCompare(name(b)) || text(a.user_id).localeCompare(text(b.user_id));
    if (sort === 'name') return tie;
    const at=Date.parse(text(a.created_at)), bt=Date.parse(text(b.created_at));
    if (!Number.isFinite(at)) return Number.isFinite(bt) ? 1 : tie;
    if (!Number.isFinite(bt)) return -1;
    return (sort === 'oldest' ? at-bt : bt-at) || tie;
  });
}
export function directoryState(params: Record<string,string|undefined>) {
  return {query:params.query||'',status:params.status||'',sort:directorySorts.includes(params.sort as typeof directorySorts[number]) ? params.sort! : 'newest',page:params.page||'1'};
}
