import Toybox.Application;
import Toybox.Math;
import Toybox.Lang;

// Device-local evidence prototype only. Nothing here grants gold, XP, inventory or shared claims.
class FieldSession {
    var data as Dictionary or Null;var persist;var tile="--";var quality=false;var lastFix=0;var storageError=false;var readFailed=false;
    function initialize(writeStorage){
        persist=writeStorage;data=null;
        if(persist){try{data=Application.Storage.getValue("trail-field-dev-v1");}catch(e){storageError=true;readFailed=true;}}
        if(data!=null && (!(data instanceof Dictionary) || data["version"]!=1)){storageError=true;readFailed=true;data=null;}
        if(data==null){data={"version"=>1,"sequence"=>0,"counter"=>0,"current"=>null,"events"=>[],"last"=>null};}
    }
    function save(){if(readFailed){return;}if(persist){try{Application.Storage.setValue("trail-field-dev-v1",data);storageError=false;}catch(e){storageError=true;}}}
    function full(){return data["events"].size()>=64;}
    function append(kind,at,payload){
        if(readFailed || full()){return false;}
        data["sequence"]+=1;
        data["events"].add({"sequence"=>data["sequence"],"kind"=>kind,"observedAt"=>at,"activity"=>data["current"]==null?null:(data["current"] as Dictionary)["id"],"payload"=>payload});save();return true;
    }
    function begin(start,profile,at,sport,subSport){
        if(readFailed || start==null || profile==null){return false;}
        var current=data["current"] as Dictionary or Null;
        if(current!=null && current["startedAt"]==start && current["profile"]==profile){current["status"]="running";return true;}
        if(full()){return false;}
        // A new SDK activity never silently becomes the previous activity after a reload.
        if(current!=null){data["last"]=current;current["status"]="interrupted-unverified";}
        data["counter"]+=1;
        data["current"]={"id"=>"watch-dev:"+start.toString()+":"+data["counter"].toString(),"startedAt"=>start,"profile"=>profile,"sport"=>sport,"subSport"=>subSport,"status"=>"running","tile"=>null,"distance"=>null,"timerMs"=>null,"ascent"=>null,"lastIntentTile"=>null};
        tile="--";quality=false;lastFix=0;return append("start",at,{"profile"=>profile,"source"=>"garmin-connect-iq","sport"=>sport,"subSport"=>subSport});
    }
    function pause(at){quality=false;lastFix=0;var current=data["current"] as Dictionary or Null;if(current!=null && current["status"]=="running"){current["status"]="paused";append("pause",at,null);save();}}
    function end(at){
        quality=false;lastFix=0;var current=data["current"] as Dictionary or Null;if(current==null){return;}
        current["status"]="ended-unverified";append("ended-unverified",at,null);data["last"]=current;data["current"]=null;save();
    }
    function sample(lat,lon,good,at,running,distance,timerMs,ascent){
        quality=false;var current=data["current"] as Dictionary or Null;if(current==null){return;}
        current["distance"]=distance;current["timerMs"]=timerMs;current["ascent"]=ascent;
        if(!running){return;}
        current["status"]="running";
        if(!good || lat==null || lon==null || lat< -90 || lat>90 || lon< -180 || lon>180){return;}
        var cell=tileFor(lat,lon);tile=cell;quality=true;lastFix=at;
        if(current["tile"]!=cell){if(append("tile",at,{"tile"=>cell,"latitude"=>lat,"longitude"=>lon,"quality"=>"good"})){current["tile"]=cell;save();}}
    }
    function intent(at){
        var current=data["current"] as Dictionary or Null;
        if(!quality || current==null || current["status"]!="running" || at-lastFix<0 || at-lastFix>=5 || current["lastIntentTile"]==tile){return false;}
        var events=data["events"] as Array;for(var i=0;i<events.size();i++){var e=events[i] as Dictionary;if(e["kind"]=="collect-intent" && e["activity"]==current["id"] && (e["payload"] as Dictionary)["tile"]==tile){return false;}}
        if(!append("collect-intent",at,{"tile"=>tile})){return false;}
        current["lastIntentTile"]=tile;save();return true;
    }
    function tileFor(lat,lon){
        var x=(lon.toDouble()-25.7472d)*111320.0d*Math.cos(62.2415d*Math.PI/180.0d),y=(lat.toDouble()-62.2415d)*111320.0d;
        return Math.floor(x/250).toNumber().toString()+","+Math.floor(y/250).toNumber().toString();
    }
}
