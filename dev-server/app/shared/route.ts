// Development Vite fallback; hosted asset routing serves the same tested Expo HTML directly.
import html from '../../game-export/shared.html?raw';
export function GET(){return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}
