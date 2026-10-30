import Toybox.Application;
import Toybox.WatchUi;
import Toybox.Position;
import Toybox.Timer;
import Toybox.System;
import Toybox.Math;
import Toybox.Time;

class TrailRelicsApp extends Application.AppBase {
    var game;var view;var timer;var tracking=false;var fresh=0;var anchor=null;var previous=null;var previousTime=0;var messageUntil=0;
    function initialize(){AppBase.initialize();}
    function onStart(state){game=new RelicGame();}
    function getInitialView(){view=new RelicView(self);return [view,new RelicDelegate(self)];}
    function onStop(state){pause();game.save();}
    function start(){
        anchor=null;previous=null;fresh=0;tracking=true;game.message="Finding GPS - go outdoors";
        Position.enableLocationEvents(Position.LOCATION_CONTINUOUS,method(:onPosition));
        if(timer==null){timer=new Timer.Timer();}timer.start(method(:tick),1000,true);WatchUi.requestUpdate();
    }
    function pause(){tracking=false;fresh=0;anchor=null;previous=null;Position.enableLocationEvents(Position.LOCATION_DISABLE,null);if(timer!=null){timer.stop();}game.save();}
    function tick(){WatchUi.requestUpdate();}
    function ready(){return tracking && fresh>0 && Time.now().value()-fresh<15;}
    function onPosition(info){
        if(!tracking){return;}
        if(info.position==null || info.accuracy<Position.QUALITY_USABLE || info.when==null || Math.abs(Time.now().value()-info.when.value())>10){game.message="Waiting for steady GPS";WatchUi.requestUpdate();return;}
        var now=Time.now().value();var loc=info.position.toDegrees();
        var px=(loc[1].toDouble()-25.7472d)*111320.0d*Math.cos(62.2415d*Math.PI/180.0d);
        var py=(loc[0].toDouble()-62.2415d)*111320.0d;
        var distance=0.0;
        if(previous!=null){var elapsed=now-previousTime;if(elapsed<=0){return;}var dx=px-previous[0];var dy=py-previous[1];var jump=Math.sqrt(dx*dx+dy*dy);
            if(elapsed>30 || (info.speed!=null && info.speed>7) || jump>Math.max(35,elapsed*7)){anchor=[px,py];previous=[px,py];previousTime=now;fresh=0;game.message="Waiting for walking GPS";WatchUi.requestUpdate();return;}
        }
        if(anchor!=null){var ax=px-anchor[0];var ay=py-anchor[1];var d=Math.sqrt(ax*ax+ay*ay);if(d>=8){distance=d;anchor=[px,py];}}else{anchor=[px,py];}
        previous=[px,py];previousTime=now;fresh=now;game.x=px;game.y=py;game.meters+=distance;game.energy+=distance;game.enter();if(now>messageUntil){game.message=game.full?"Alpha world storage full":"START: capture  UP/DOWN: page";}WatchUi.requestUpdate();
    }
    function action(){if(!tracking){start();}else if(ready()){game.collect();messageUntil=Time.now().value()+5;WatchUi.requestUpdate();}else{game.message="Wait for a steady GPS fix";WatchUi.requestUpdate();}}
    function menu(){var menu=new WatchUi.Menu2({:title=>"Trail Relics"});menu.addItem(new WatchUi.MenuItem(tracking?"Pause GPS":"Start GPS",null,:gps,{}));menu.addItem(new WatchUi.MenuItem("Field collection",game.total.toString()+" artefacts",:collection,{}));for(var i=0;i<4;i++){menu.addItem(new WatchUi.MenuItem(game.weatherNames[i],"Manual weather",i,{}));}menu.addItem(new WatchUi.MenuItem("New outing","Keep collection",:newOuting,{}));WatchUi.pushView(menu,new RelicMenu(self),WatchUi.SLIDE_UP);}
}
class RelicDelegate extends WatchUi.BehaviorDelegate {
    var app;
    function initialize(a){BehaviorDelegate.initialize();app=a;}
    function onSelect(){app.action();return true;}
    function onTap(event){app.action();return true;}
    function onNextPage(){app.view.page=1-app.view.page;WatchUi.requestUpdate();return true;}
    function onPreviousPage(){return onNextPage();}
    function onMenu(){app.menu();return true;}
    function onBack(){app.pause();WatchUi.popView(WatchUi.SLIDE_DOWN);return true;}
}
class RelicMenu extends WatchUi.Menu2InputDelegate {
    var app;
    function initialize(a){Menu2InputDelegate.initialize();app=a;}
    function onSelect(item){var id=item.getId();WatchUi.popView(WatchUi.SLIDE_DOWN);if(id==:gps){if(app.tracking){app.pause();app.game.message="GPS paused - START resumes";}else{app.start();}}else if(id==:newOuting){app.game.newOuting();app.anchor=null;app.previous=null;}else if(id==:collection){var menu=new WatchUi.Menu2({:title=>"Collection: "+app.game.total});var keys=app.game.tiles.keys();for(var i=0;i<keys.size();i++){var t=app.game.tiles[keys[i]];if(t[3]){menu.addItem(new WatchUi.MenuItem(app.game.names[t[1]],app.game.rarities[t[0]]+" / "+app.game.forms[t[5]],keys[i],{}));}}if(app.game.total==0){menu.addItem(new WatchUi.MenuItem("No finds yet","Head outdoors",:empty,{}));}WatchUi.pushView(menu,new WatchUi.Menu2InputDelegate(),WatchUi.SLIDE_UP);}else{app.game.weather=id;app.game.save();}WatchUi.requestUpdate();}
}
