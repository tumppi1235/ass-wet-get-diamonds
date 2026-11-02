import Toybox.Communications;
import Toybox.Lang;
import Toybox.Time;

// Transport foundation, NOT account pairing. No production credential, endpoint,
// cookie or bypass token exists here. Inbound messages cannot grant their own link.
// A future authenticated native adapter must obtain explicit local consent and
// call authorizeFromTrustedCompanion; until then no observations leave the watch.
class FieldLink {
    var state as FieldSession;var link as String or Null=null;var lease=0;var feed as Dictionary or Null=null;var revision=0;
    var busy=false;var nextAt=0;var attempt=0;var attempts=0;var status="UNLINKED DEV";
    function initialize(session){state=session;}
    function authorizeFromTrustedCompanion(id,expiresAt,now){
        if(!(id instanceof String) || id.length()<16 || id.length()>64 || !(expiresAt instanceof Number) || expiresAt<=now || expiresAt>now+86400 || state.readFailed){return false;}
        if(state.data["queueLink"]!=null && state.data["queueLink"]!=id){return false;}
        if(link!=id){feed=null;revision=0;}
        link=id;lease=expiresAt;status="LINK LEASE / DEV";return true;
    }
    function revoke(){link=null;lease=0;feed=null;attempt+=1;busy=false;status="UNLINKED DEV";}
    function active(now){return link!=null && now<lease;}
    function start(){Communications.registerForPhoneAppMessages(method(:onPhone));}
    function stop(){Communications.registerForPhoneAppMessages(null);}
    function onPhone(msg as Communications.PhoneAppMessage) as Void {receive(msg.data,Time.now().value());}
    function receive(value,now){
        if(!active(now) || !(value instanceof Dictionary)){return false;}
        var m=value as Dictionary;
        if(m["protocol"]!=1 || m["environment"]!="development" || m["linkId"]!=link){return false;}
        if(m["kind"]=="receipt"){
            if(!state.receipt(m,link)){return false;}
            busy=false;attempt+=1;attempts=0;nextAt=now+30;status="STORED / UNVERIFIED";return true;
        }
        if(m["kind"]!="boss-feed" || !(m["revision"] instanceof Number) || m["revision"]<=revision || !(m["generatedAt"] instanceof Number) || !(m["expiresAt"] instanceof Number) || m["generatedAt"]>now+5 || m["generatedAt"]<now-120 || m["expiresAt"]<=now || m["expiresAt"]<=m["generatedAt"] || m["expiresAt"]-m["generatedAt"]>120 || !(m["activityId"] instanceof String) || !(m["bosses"] instanceof Array) || m["bosses"].size()>8){return false;}
        var current=state.data["current"] as Dictionary or Null;
        if(current==null || m["activityId"]!=current["id"]){return false;}
        var ids={},bosses=m["bosses"] as Array,clean=[] as Array;
        for(var i=0;i<bosses.size();i++){
            if(!(bosses[i] instanceof Dictionary)){return false;}var b=bosses[i] as Dictionary;
            if(!(b["id"] instanceof String) || b["id"].length()<1 || b["id"].length()>80 || ids[b["id"]]!=null || !(b["name"] instanceof String) || b["name"].length()<1 || b["name"].length()>24 || !(b["tile"] instanceof String) || b["tile"].length()>30 || (b["state"]!="nearby" && b["state"]!="fightable")){return false;}
            if(b["state"]=="fightable" && (!(b["receiptId"] instanceof String) || b["receiptId"].length()<16 || b["receiptId"].length()>100)){return false;}
            ids[b["id"]]=true;
            clean.add({"id"=>b["id"],"name"=>b["name"],"tile"=>b["tile"],"state"=>b["state"],"receiptId"=>b["receiptId"]});
        }
        feed={"expiresAt"=>m["expiresAt"],"activityId"=>m["activityId"],"bosses"=>clean};revision=m["revision"];return true;
    }
    function notice(now){
        if(!active(now) || feed==null || feed["expiresAt"]<=now || !state.quality || now-state.lastFix<0 || now-state.lastFix>=5){return null;}
        var current=state.data["current"] as Dictionary or Null;
        if(current==null || current["status"]!="running" || feed["activityId"]!=current["id"]){return null;}
        var found=null;
        var bosses=feed["bosses"] as Array;for(var i=0;i<bosses.size();i++){var b=bosses[i] as Dictionary;if(b["tile"]==state.tile){if(b["state"]=="fightable"){return "BOSS FIGHTABLE";}found="BOSS TILE / SYNC NEEDED";}}
        return found;
    }
    function alert(now){
        if(!active(now) || feed==null || feed["expiresAt"]<=now || !state.quality || now-state.lastFix<0 || now-state.lastFix>=5){return null;}
        var current=state.data["current"] as Dictionary or Null;
        if(current==null || current["status"]!="running" || feed["activityId"]!=current["id"]){return null;}
        var alerts=state.data["bossAlerts"] as Dictionary or Null;
        if(alerts==null || state.data["bossAlertActivity"]!=current["id"]){alerts={};state.data["bossAlerts"]=alerts;state.data["bossAlertActivity"]=current["id"];}
        var bosses=feed["bosses"] as Array;for(var i=0;i<bosses.size();i++){
            var boss=bosses[i] as Dictionary,key=boss["id"]+":"+boss["state"];
            if(boss["tile"]!=state.tile || alerts[key]!=null){continue;}
            // Bounded notification history. Full history never resets and spams.
            if(alerts.size()>=16){return null;}
            if(boss["state"]=="nearby" && !state.append("boss-tile-intent",now,{"bossId"=>boss["id"],"tile"=>state.tile})){return null;}
            alerts[key]=true;state.save();if(state.storageError){return null;}
            return boss["state"]=="fightable"?"BOSS FIGHTABLE":"BOSS TILE / SYNC NEEDED";
        }
        return null;
    }
    function tick(now){
        if(!active(now)){status="UNLINKED DEV";return;}
        if(now<nextAt){return;}
        // A lost callback does not wedge the queue. Late callbacks cannot finish
        // a newer attempt. Delivery success never deletes unacknowledged events.
        busy=false;var packet=state.batch(link);if(packet==null){return;}
        attempt+=1;busy=true;nextAt=now+30;status="SENDING / DEV";
        try{Communications.transmit(packet,{},new FieldTransfer(self,attempt));}catch(e){finished(attempt,false,now);}
    }
    function finished(id,ok,now){
        if(id!=attempt){return;}busy=false;
        if(ok){status="SENT / WAIT RECEIPT";return;}
        attempts+=1;var delay=30;for(var i=1;i<attempts && delay<300;i++){delay*=2;}if(delay>300){delay=300;}
        nextAt=now+delay;status="OFFLINE / QUEUED";
    }
}
class FieldTransfer extends Communications.ConnectionListener {
    var link;var attempt;
    function initialize(owner,id){ConnectionListener.initialize();link=owner;attempt=id;}
    function onComplete() as Void {link.finished(attempt,true,Time.now().value());}
    function onError() as Void {link.finished(attempt,false,Time.now().value());}
}
