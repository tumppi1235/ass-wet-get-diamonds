// Initial compatibility only. A reviewed restored world must use a new external generation.
export const INITIAL_GENERATION='dev-initial-1';
export function initialGeneration(environment:'development'|'production'){return environment==='production'?'prod-initial-1':INITIAL_GENERATION;}
