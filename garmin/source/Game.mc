import Toybox.Math;
import Toybox.Application;
import Toybox.System;

class RelicGame {
    var x=0.0d; var y=0.0d; var meters=0.0; var energy=0.0;
    var outing=1; var weather=0; var tiles={}; var lastCell=null;
    var names=["Compass","Rune","Lantern","Crown","Shard","Key"];
    var rarities=["Common","Rare","Legendary"];
    var forms=["Sun","Rain","Ice","Frost"];
    var weatherNames=["Clear","Rain","Cold","Snow"];
    var total=0; var message="Press START for GPS"; var full=false;
    function initialize() {
        try {var d=Application.Storage.getValue("world-v1");if(d!=null && d[0]==1){tiles=d[1];meters=d[2];energy=d[3];outing=d[4];weather=d[5];total=d[6];if(d.size()>7){lastCell=d[7];}}}catch(e){message="Save unavailable";}
    }
    function save() {try {Application.Storage.setValue("world-v1",[1,tiles,meters,energy,outing,weather,total,lastCell]);}catch(e){message="Save full - progress unsaved";}}
    function key(i,j){return i.toString()+","+j.toString();}
    function ci(){return Math.floor(x/250.0d).toNumber();}
    function cj(){return Math.floor(y/250.0d).toNumber();}
    // Unsigned 32-bit hash matching the desktop/Android engine.
    function hash(i,j,salt){
        var n=(((i+7919).toLong()*374761393l)^((j+104729).toLong()*668265263l)^((salt+31).toLong()*1274126177l)) & 0xffffffffl;
        n=((n^(n>>13))*1274126177l)&0xffffffffl;
        return ((n^(n>>16))&0xffffffffl).toDouble()/4294967296.0d;
    }
    function reveal(i,j){
        var id=key(i,j);if(tiles.hasKey(id)){return tiles[id];}
        if(tiles.size()>=180){full=true;return null;}
        var rarity=-1;var name=0;
        if(hash(i,j,1)<=0.64){var visits=0;for(var a=-1;a<=1;a++){for(var b=-1;b<=1;b++){var t=tiles[key(i+a,j+b)];if(t!=null){visits+=Math.min(3,t[2]);}}}
            var novelty=1.0-Math.min(1.0,visits/18.0);var r=hash(i,j,2);
            rarity=r<0.025+novelty*0.075?2:(r<0.12+novelty*0.18?1:0);name=Math.floor(hash(i,j,3)*6).toNumber();
        }
        // rarity, shape, visit count, captured, searched outing, captured form
        tiles[id]=[rarity,name,0,false,0,0];return tiles[id];
    }
    function enter(){var i=ci();var j=cj();var id=key(i,j);for(var a=-1;a<=1;a++){for(var b=-1;b<=1;b++){reveal(i+a,j+b);}}if(id!=lastCell){lastCell=id;var t=tiles[id];if(t!=null){t[2]+=1;}save();}}
    function current(){return tiles[key(ci(),cj())];}
    function available(t){return t!=null && t[0]>=0 && !t[3] && t[4]!=outing;}
    function odds(t){var base=energy<1000?0.20:(energy<3000?0.35:(energy<5000?0.50:(energy<8000?0.65:0.75)));var rarity=t[0]==0?0.25:(t[0]==1?0.10:0.0);var bonus=[0.0,0.08,0.05,0.10];return Math.min(0.90,base+rarity+bonus[weather]+Math.min(0.05,meters/100000.0));}
    function collect(){var t=current();if(!available(t)){message="No capture ready here";return;}t[4]=outing;if((Math.rand()%10000)/10000.0<odds(t)){t[3]=true;t[5]=weather;total++;energy=Math.max(0,energy-2000);message="Collected "+names[t[1]]+"!";}else{message="Missed - energy retained";}save();}
    function nearest(){var best=null;var distance=1e30;for(var i=ci()-1;i<=ci()+1;i++){for(var j=cj()-1;j<=cj()+1;j++){var t=tiles[key(i,j)];if(available(t)){var dx=(i+0.5)*250-x;var dy=(j+0.5)*250-y;var d=dx*dx+dy*dy;if(d<distance){distance=d;best=[i,j,t,dx,dy,Math.sqrt(d)];}}}}return best;}
    function newOuting(){meters=0;energy=0;outing++;message="New outing started";save();}
}
