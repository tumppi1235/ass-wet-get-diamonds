import Toybox.Test;
import Toybox.Lang;
(:test)
function testFieldSession(logger){
    var s=new FieldSession(false);Test.assertEqual(s.tileFor(62.2415d,25.7472d),"0,0");Test.assertEqual(s.tileFor(62.24149d,25.74719d),"-1,-1");
    Test.assertEqual(s.begin(null,"p",100,1,3),false);Test.assert(s.begin(100,"p",100,1,3));var id=(s.data["current"] as Dictionary)["id"];
    Test.assertEqual((s.data["current"] as Dictionary)["sport"],1);Test.assertEqual((s.data["current"] as Dictionary)["subSport"],3);
    var startPayload=((s.data["events"] as Array)[0] as Dictionary)["payload"] as Dictionary;Test.assertEqual(startPayload["source"],"garmin-connect-iq");Test.assertEqual(startPayload["sport"],1);Test.assertEqual(startPayload["subSport"],3);
    s.sample(62.2415d,25.7472d,true,101,true,0,1000,0);Test.assertEqual(s.tile,"0,0");Test.assertEqual(s.data["events"].size(),2);
    s.sample(62.2415d,25.7472d,true,102,true,0,2000,0);Test.assertEqual(s.data["events"].size(),2);Test.assert(s.intent(102));Test.assertEqual(s.intent(103),false);
    s.sample(62.245d,25.7472d,true,103,true,300,3000,0);Test.assert(s.intent(103));s.sample(62.2415d,25.7472d,true,104,true,600,4000,0);Test.assertEqual(s.intent(104),false);
    s.pause(104);Test.assertEqual(s.intent(104),false);s.begin(100,"p",105,1,3);Test.assertEqual((s.data["current"] as Dictionary)["id"],id);
    s.sample(62.2415d,25.7472d,false,106,true,0,3000,0);Test.assertEqual(s.intent(106),false);
    s.sample(62.2415d,25.7472d,true,107,true,0,4000,0);Test.assertEqual(s.intent(113),false);
    s.end(114);Test.assertEqual(s.data["current"],null);Test.assertEqual((s.data["last"] as Dictionary)["status"],"ended-unverified");Test.assert(s.begin(200,"p",200,1,3));Test.assert((s.data["current"] as Dictionary)["id"]!=id);
    for(var i=0;i<70;i++){s.append("test",201+i,null);}Test.assertEqual(s.data["events"].size(),64);Test.assertEqual(s.append("test",300,null),false);return true;
}

(:test)
function testFieldReceipts(logger){
    var s=new FieldSession(false),id="synthetic-dev-link-0001";s.begin(100,"p",100,1,3);s.sample(62.2415d,25.7472d,true,101,true,0,1000,0);
    var packet=s.batch(id) as Dictionary;Test.assertEqual(packet["environment"],"development");Test.assertEqual((packet["events"] as Array).size(),2);
    s.intent(101);Test.assertEqual(s.data["events"].size(),3);var again=s.batch(id) as Dictionary;Test.assertEqual(again["batchId"],packet["batchId"]);Test.assertEqual(s.batch("other-link"),null);
    var r={"protocol"=>1,"environment"=>"development","kind"=>"receipt","linkId"=>id,"batchId"=>packet["batchId"],"status"=>"stored-unverified","receiptId"=>"synthetic-receipt-0001","sequences"=>[1,2]};
    r["sequences"]=[1,3];Test.assertEqual(s.receipt(r,id),false);Test.assertEqual(s.data["events"].size(),3);
    r["sequences"]=[1,2];r["status"]="delivered";Test.assertEqual(s.receipt(r,id),false);r["status"]="stored-unverified";
    Test.assert(s.receipt(r,id));Test.assertEqual(s.data["events"].size(),1);var remaining=s.data["events"] as Array;Test.assertEqual((remaining[0] as Dictionary)["sequence"],3);Test.assertEqual(s.receipt(r,id),false);
    var second=s.batch(id) as Dictionary;r["batchId"]=second["batchId"];r["sequences"]=[3];Test.assert(s.receipt(r,id));
    s.sample(62.245d,25.7472d,true,102,true,300,2000,0);Test.assert(s.intent(102));s.sample(62.2415d,25.7472d,true,103,true,600,3000,0);Test.assertEqual(s.intent(103),false);
    return true;
}

(:test)
function testFieldBossMessages(logger){
    var s=new FieldSession(false),id="synthetic-dev-link-0001",bridge=new FieldLink(s);s.begin(100,"p",100,1,3);s.sample(62.2415d,25.7472d,true,101,true,0,1000,0);
    var current=s.data["current"] as Dictionary;
    var feed={"protocol"=>1,"environment"=>"development","kind"=>"boss-feed","linkId"=>id,"revision"=>1,"generatedAt"=>101,"expiresAt"=>161,"activityId"=>current["id"],"bosses"=>[{"id"=>"fixture-boss","name"=>"Fixture","tile"=>"0,0","state"=>"nearby"}]};
    Test.assertEqual(bridge.receive(feed,101),false);Test.assert(bridge.authorizeFromTrustedCompanion(id,1000,101));
    Test.assert(bridge.receive(feed,101));Test.assertEqual(bridge.notice(101),"BOSS TILE / SYNC NEEDED");Test.assertEqual(bridge.alert(101),"BOSS TILE / SYNC NEEDED");Test.assertEqual(bridge.alert(102),null);
    Test.assertEqual(bridge.receive(feed,102),false);Test.assertEqual(bridge.notice(106),null);s.pause(102);Test.assertEqual(bridge.notice(102),null);
    s.begin(100,"p",103,1,3);s.sample(62.2415d,25.7472d,true,103,true,0,1000,0);
    feed["revision"]=2;feed["bosses"][0]["state"]="fightable";Test.assertEqual(bridge.receive(feed,103),false);feed["bosses"][0]["receiptId"]="synthetic-server-receipt";
    Test.assert(bridge.receive(feed,103));Test.assertEqual(bridge.alert(103),"BOSS FIGHTABLE");Test.assertEqual(bridge.alert(104),null);Test.assertEqual(bridge.notice(162),null);
    bridge.revoke();Test.assertEqual(bridge.notice(104),null);Test.assertEqual(bridge.receive(feed,104),false);return true;
}

(:test)
function testFieldDeliveryIsNotReceipt(logger){
    var s=new FieldSession(false),bridge=new FieldLink(s);s.begin(100,"p",100,1,3);
    bridge.attempt=1;bridge.finished(1,true,101);Test.assertEqual(s.data["events"].size(),1);
    bridge.finished(1,false,101);Test.assertEqual(bridge.nextAt,131);
    for(var i=0;i<10;i++){bridge.finished(1,false,101);}Test.assertEqual(bridge.nextAt,401);
    bridge.attempt=2;bridge.finished(1,false,999);Test.assertEqual(bridge.nextAt,401);
    s.readFailed=true;Test.assertEqual(s.batch("synthetic-dev-link-0001"),null);Test.assertEqual(s.data["events"].size(),1);return true;
}

(:test)
function testHttpProbeDoesNotBindQueue(logger){
    var s=new FieldSession(false);s.begin(100,"p",100,1,3);
    var key="11111111111111111111111111111111"+"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",http=new FieldHttpLink(s,key);
    Test.assertEqual(s.data["queueLink"],null);Test.assertEqual(s.data["pendingBatch"],null);
    http.attempt=1;http.onHttp(401,null,1);Test.assertEqual(http.denied,true);Test.assertEqual(s.data["queueLink"],null);Test.assertEqual(s.data["events"].size(),1);
    http.configure(key);http.attempt=2;http.probing=true;http.onHttp(200,{"protocol"=>1,"environment"=>"development","kind"=>"sync-response","linkId"=>key.substring(0,32),"receipt"=>null,"bossFeed"=>null},2);
    Test.assertEqual(http.status,"HTTP KEY VERIFIED");Test.assertEqual(s.data["queueLink"],null);Test.assertEqual(s.data["events"].size(),1);return true;
}
