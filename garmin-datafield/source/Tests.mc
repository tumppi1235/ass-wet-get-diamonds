import Toybox.Test;
import Toybox.Lang;
(:test)
function testFieldSession(logger){
    var s=new FieldSession(false);Test.assertEqual(s.tileFor(62.2415d,25.7472d),"0,0");Test.assertEqual(s.tileFor(62.24149d,25.74719d),"-1,-1");
    Test.assertEqual(s.begin(null,"p",100),false);Test.assert(s.begin(100,"p",100));var id=(s.data["current"] as Dictionary)["id"];
    s.sample(62.2415d,25.7472d,true,101,true,0,1000,0);Test.assertEqual(s.tile,"0,0");Test.assertEqual(s.data["events"].size(),2);
    s.sample(62.2415d,25.7472d,true,102,true,0,2000,0);Test.assertEqual(s.data["events"].size(),2);Test.assert(s.intent(102));Test.assertEqual(s.intent(103),false);
    s.sample(62.245d,25.7472d,true,103,true,300,3000,0);Test.assert(s.intent(103));s.sample(62.2415d,25.7472d,true,104,true,600,4000,0);Test.assertEqual(s.intent(104),false);
    s.pause(104);Test.assertEqual(s.intent(104),false);s.begin(100,"p",105);Test.assertEqual((s.data["current"] as Dictionary)["id"],id);
    s.sample(62.2415d,25.7472d,false,106,true,0,3000,0);Test.assertEqual(s.intent(106),false);
    s.sample(62.2415d,25.7472d,true,107,true,0,4000,0);Test.assertEqual(s.intent(113),false);
    s.end(114);Test.assertEqual(s.data["current"],null);Test.assertEqual((s.data["last"] as Dictionary)["status"],"ended-unverified");Test.assert(s.begin(200,"p",200));Test.assert((s.data["current"] as Dictionary)["id"]!=id);
    for(var i=0;i<70;i++){s.append("test",201+i,null);}Test.assertEqual(s.data["events"].size(),64);Test.assertEqual(s.append("test",300,null),false);return true;
}
