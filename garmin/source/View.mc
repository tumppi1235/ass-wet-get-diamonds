import Toybox.Graphics;
import Toybox.WatchUi;
import Toybox.Math;
import Toybox.System;

class RelicView extends WatchUi.View {
    var app;var page=0;var w=280;var h=280;
    function initialize(a){View.initialize();app=a;}
    function onHide(){app.game.save();}
    function text(dc,y,string,font,color){dc.setColor(color,Graphics.COLOR_TRANSPARENT);dc.drawText(w/2,y,font,string,Graphics.TEXT_JUSTIFY_CENTER);}
    function color(rarity){return rarity==2?0xFFCC33:(rarity==1?0x55CCFF:0xCCDDAA);}
    function glyph(dc,cx,cy,r,t){
        dc.setColor(color(t[0]),Graphics.COLOR_TRANSPARENT);dc.setPenWidth(t[0]+1);
        if(t[0]>0){dc.drawCircle(cx,cy,r+5);if(t[0]==2){dc.drawCircle(cx,cy,r+9);}}
        var k=t[1];
        if(k==3){dc.drawLine(cx-r,cy+r/2,cx-r,cy-r/2);dc.drawLine(cx-r,cy-r/2,cx-r/2,cy);dc.drawLine(cx-r/2,cy,cx,cy-r);dc.drawLine(cx,cy-r,cx+r/2,cy);dc.drawLine(cx+r/2,cy,cx+r,cy-r/2);dc.drawLine(cx+r,cy-r/2,cx+r,cy+r/2);dc.drawLine(cx-r,cy+r/2,cx+r,cy+r/2);}
        else if(k==5){dc.drawCircle(cx-r/3,cy-r/3,r/2);dc.drawLine(cx,cy,cx+r,cy+r);dc.drawLine(cx+r/2,cy+r/2,cx+r/3,cy+r*0.8);}
        else if(k==2){dc.drawRectangle(cx-r/2,cy-r/2,r,r*1.3);dc.drawCircle(cx,cy-r/2,r/3);dc.drawLine(cx,cy-r/3,cx,cy+r/3);}
        else{dc.drawLine(cx,cy-r,cx+r,cy);dc.drawLine(cx+r,cy,cx,cy+r);dc.drawLine(cx,cy+r,cx-r,cy);dc.drawLine(cx-r,cy,cx,cy-r);if(k==0){dc.drawLine(cx,cy-r,cx,cy+r);dc.drawLine(cx-r,cy,cx+r,cy);}else if(k==1){dc.drawLine(cx,cy-r/2,cx,cy+r/2);dc.drawLine(cx,cy-r/2,cx+r/2,cy);}}
        dc.setPenWidth(1);
    }
    function onUpdate(dc){
        w=dc.getWidth();h=dc.getHeight();var g=app.game;dc.setColor(Graphics.COLOR_WHITE,0x10251A);dc.clear();
        text(dc,20,"TRAIL RELICS",Graphics.FONT_XTINY,0xD5DDAA);
        text(dc,h-48,(g.meters/1000.0).format("%.2f")+" km  |  "+g.total+" finds",Graphics.FONT_XTINY,Graphics.COLOR_WHITE);
        text(dc,h-29,page==0?"1 GUIDANCE / UP-DOWN":"2 NEARBY / NORTH UP",Graphics.FONT_XTINY,0xAABBAA);
        if(!app.ready()){
            text(dc,72,app.tracking?"FINDING GPS":"READY TO EXPLORE",Graphics.FONT_SMALL,0xD5DDAA);
            text(dc,112,app.tracking?"Go outdoors":"Press START",Graphics.FONT_MEDIUM,Graphics.COLOR_WHITE);
            text(dc,151,"Location stays on watch",Graphics.FONT_XTINY,0xAABBAA);return;
        }
        if(page==1){drawMap(dc);return;}
        var t=g.current();
        if(g.available(t)){
            text(dc,52,"READY TO CAPTURE",Graphics.FONT_XTINY,color(t[0]));
            var radius=17+t[0]*8;glyph(dc,w/2,111,radius,t);
            text(dc,154,g.forms[g.weather]+" "+g.names[t[1]],Graphics.FONT_SMALL,color(t[0]));
            text(dc,180,g.rarities[t[0]]+" / "+(g.odds(t)*100).toNumber()+"%",Graphics.FONT_XTINY,Graphics.COLOR_WHITE);
        }else{
            var next=g.nearest();if(next==null){text(dc,82,"KEEP EXPLORING",Graphics.FONT_SMALL,Graphics.COLOR_WHITE);text(dc,130,"No nearby signals",Graphics.FONT_XTINY,0xAABBAA);}
            else{var angle=Math.atan2(next[3],next[4]);var dx=Math.sin(angle);var dy=-Math.cos(angle);var cx=w/2;var cy=116;var tx=cx+dx*33;var ty=cy+dy*33;
                text(dc,52,"NEXT ARTEFACT",Graphics.FONT_XTINY,color(next[2][0]));dc.setColor(color(next[2][0]),Graphics.COLOR_TRANSPARENT);dc.setPenWidth(4);dc.drawLine(cx-dx*27,cy-dy*27,tx,ty);dc.drawLine(tx,ty,tx-dx*16-dy*13,ty-dy*16+dx*13);dc.drawLine(tx,ty,tx-dx*16+dy*13,ty-dy*16-dx*13);dc.setPenWidth(1);
                text(dc,156,g.names[next[2][1]]+" / "+next[5].toNumber()+" m",Graphics.FONT_SMALL,Graphics.COLOR_WHITE);
                text(dc,182,"North-up bearing to tile",Graphics.FONT_XTINY,0xAABBAA);
            }
        }
        text(dc,210,g.message,Graphics.FONT_XTINY,0xD5DDAA);
    }
    function drawMap(dc){var g=app.game;var size=45;var left=(w-size*3)/2;var top=62;
        for(var row=0;row<3;row++){for(var col=0;col<3;col++){var i=g.ci()+col-1;var j=g.cj()+1-row;var x=left+col*size;var y=top+row*size;dc.setColor(row==1&&col==1?0x334C22:0x183426,Graphics.COLOR_TRANSPARENT);dc.fillRectangle(x+1,y+1,size-2,size-2);dc.setColor(0x779966,Graphics.COLOR_TRANSPARENT);dc.drawRectangle(x,y,size,size);var t=g.tiles[g.key(i,j)];if(t!=null&&t[0]>=0){if(t[3]){dc.setColor(0xAACC88,Graphics.COLOR_TRANSPARENT);dc.drawText(x+size/2,y+10,Graphics.FONT_SMALL,"+",Graphics.TEXT_JUSTIFY_CENTER);}else{glyph(dc,x+size/2,y+size/2,6+t[0]*3,t);}}if(row==1&&col==1){dc.setColor(Graphics.COLOR_WHITE,Graphics.COLOR_TRANSPARENT);dc.fillCircle(x+size-7,y+size-7,3);}}}
        text(dc,207,"N ^   dot: YOU   +: FOUND",Graphics.FONT_XTINY,0xD5DDAA);
    }
}
