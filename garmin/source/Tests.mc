import Toybox.Test;
(:test)
function testGame(logger){
    var g=new RelicGame();g.tiles={};g.x=0.0d;g.y=0.0d;g.meters=0;g.energy=0;g.lastCell=null;g.outing=1;
    Test.assertEqual(g.ci(),0);g.x=-1;Test.assertEqual(g.ci(),-1);g.x=0;
    g.enter();Test.assertEqual(g.tiles.size(),9);Test.assertEqual(g.tiles["0,0"][2],1);
    g.enter();Test.assertEqual(g.tiles["0,0"][2],1);
    Test.assert(Math.abs(g.hash(0,0,1)-0.39141975506208837d)<0.000001d);
    var tile=[0,0,1,false,0,0];Test.assertEqual(g.available(tile),true);
    tile[4]=1;Test.assertEqual(g.available(tile),false);tile[4]=0;tile[3]=true;Test.assertEqual(g.available(tile),false);
    tile[3]=false;g.energy=100000;g.weather=3;g.meters=100000;Test.assert(g.odds(tile)<=0.900001);
    g.newOuting();Test.assertEqual(g.energy,0);Test.assertEqual(g.outing,2);return true;
}
