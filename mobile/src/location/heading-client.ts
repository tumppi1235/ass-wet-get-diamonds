import type {HeadingWatch} from './compass';
// This iteration targets the current browser playtest; native heading is a later device gate.
export const watchHeading:HeadingWatch=async()=>{throw new Error('Live compass is currently available in the web development playtest only.');};
