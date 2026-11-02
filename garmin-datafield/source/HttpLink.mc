import Toybox.Communications;
import Toybox.Lang;
import Toybox.Time;

// Garmin Connect can relay these HTTPS requests from an iPhone. This is a scoped
// dev watch key, never a browser session or Sites bypass credential.
class FieldHttpLink extends FieldLink {
    var credential as String or Null=null;var denied=false;var probing=false;
    function initialize(session,token){
        FieldLink.initialize(session);configure(token);
    }
    function configure(token){
        revoke();credential=null;denied=false;nextAt=0;
        if(!(token instanceof String) || token.length()!=96){status="NO HTTP WATCH KEY";return;}
        var hex="0123456789abcdef";for(var i=0;i<token.length();i++){if(hex.find(token.substring(i,i+1))==null){status="INVALID WATCH KEY";return;}}
        credential=token;link=token.substring(0,32);status="HTTP NOT VERIFIED";
    }
    // HTTP mode never accepts a BLE message as backend authority.
    function start(){}
    function stop(){attempt+=1;busy=false;}
    function tick(now){
        if(credential==null || denied || now<nextAt){return;}
        if(state.data["queueLink"]!=null && state.data["queueLink"]!=link){status="ACCOUNT QUEUE LOCKED";return;}
        probing=!active(now);var packet=probing?null:state.batch(link),current=state.data["current"] as Dictionary or Null;
        if(packet==null && (state.storageError || state.readFailed)){status="STORAGE ERROR";return;}
        if(!probing && packet==null && current==null){status="HTTP / IDLE";return;}
        attempt+=1;busy=true;nextAt=now+30;status="HTTP SYNC / DEV";
        var body={"protocol"=>1,"environment"=>"development","kind"=>"sync","linkId"=>link,"activityId"=>probing || current==null?null:current["id"],"batch"=>packet};
        var options={:method=>Communications.HTTP_REQUEST_METHOD_POST,:headers=>{"Content-Type"=>Communications.REQUEST_CONTENT_TYPE_JSON,"Authorization"=>"Bearer "+credential},:responseType=>Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON,:context=>attempt};
        try{Communications.makeWebRequest("https://trail-relics-dev.tuomasl.chatgpt.site/api/trail/garmin/sync",body,options,method(:onHttp));}catch(e){finished(attempt,false,now);}
    }
    function onHttp(code as Number,data as Communications.ContentType or Null,context as Object) as Void {
        if(context!=attempt){return;}var now=Time.now().value();busy=false;
        if(code==401 || code==403){denied=true;revoke();status="HTTP AUTH REQUIRED";return;}
        if(code!=200 || !(data instanceof Dictionary)){finished(attempt,false,now);return;}
        var response=data as Dictionary;
        if(response["protocol"]!=1 || response["environment"]!="development" || response["kind"]!="sync-response" || response["linkId"]!=link){finished(attempt,false,now);return;}
        // Only a successful pinned-HTTPS response grants a short receive lease.
        lease=now+600;
        if(probing){status="HTTP KEY VERIFIED";nextAt=now+1;return;}
        if(state.data["pendingBatch"]!=null){
            if(!receive(response["receipt"],now)){status="RECEIPT / REVIEW";nextAt=now+60;return;}
        }else if(response["receipt"]!=null){status="UNEXPECTED RECEIPT";nextAt=now+60;return;}
        if(response["bossFeed"]!=null){receive(response["bossFeed"],now);}
        status="HTTP / OBSERVED ONLY";attempts=0;nextAt=now+30;
    }
}
