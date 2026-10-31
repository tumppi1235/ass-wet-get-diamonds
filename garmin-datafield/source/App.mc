import Toybox.Application;
import Toybox.Activity;
import Toybox.Graphics;
import Toybox.Position;
import Toybox.Time;
import Toybox.WatchUi;

class TrailFieldApp extends Application.AppBase {
    var state;
    function initialize(){AppBase.initialize();state=new FieldSession(true);}
    function getInitialView(){return [new TrailFieldView(state)];}
    // Unloading a field is not the end of the recorded activity.
    function onStop(info){state.save();}
}
class TrailFieldView extends WatchUi.DataField {
    var state as FieldSession;var running=false;var message="UNLINKED DEV";var until=0;
    function initialize(session){DataField.initialize();state=session;}
    function compute(info){
        var now=Time.now().value();
        running=info.timerState==Activity.TIMER_STATE_ON;
        if(running){
            var profile=Activity.getProfileInfo();
            if(info.startTime==null || profile==null || profile.uniqueIdentifier==null){state.quality=false;message="PROFILE UNAVAILABLE";return;}
            state.begin(info.startTime.value(),profile.uniqueIdentifier.toString(),now,profile.sport,profile.subSport);
        }
        var loc=info.currentLocation==null?null:info.currentLocation.toDegrees();
        state.sample(loc==null?null:loc[0],loc==null?null:loc[1],info.currentLocationAccuracy==Position.QUALITY_GOOD,now,running,info.elapsedDistance,info.timerTime,info.totalAscent);
        if(now>=until){message=state.storageError?"STORAGE ERROR":state.full()?"QUEUE FULL":running?(state.quality?"UNLINKED DEV":"WAIT FOR GPS"):"ACTIVITY PAUSED";}
    }
    function onTimerStart(){running=true;}
    function onTimerResume(){running=true;}
    function onTimerPause(){running=false;state.pause(Time.now().value());}
    function onTimerStop(){running=false;state.pause(Time.now().value());}
    function onTimerReset(){running=false;state.end(Time.now().value());message="ENDED / UNVERIFIED";}
    function onTimerLap2(trigger){
        // Auto/workout laps never queue a collection request. Normal Garmin lap recording still happens.
        if(trigger[:lapTrigger]==WatchUi.DataField.LAP_TRIGGER_MANUAL){var queued=state.intent(Time.now().value());message=state.storageError?"UNSAVED / ERROR":queued?"REQUEST QUEUED":"NO REQUEST / GPS";until=Time.now().value()+5;}
        return true;
    }
    function onUpdate(dc){
        var background=getBackgroundColor(),foreground=background==Graphics.COLOR_BLACK?Graphics.COLOR_WHITE:Graphics.COLOR_BLACK;
        dc.setColor(foreground,background);dc.clear();var w=dc.getWidth(),h=dc.getHeight();
        if(h<65){dc.drawText(w/2,h/2-12,Graphics.FONT_XTINY,state.quality?state.tile:"GPS --",Graphics.TEXT_JUSTIFY_CENTER);return;}
        dc.drawText(w/2,h/2-43,Graphics.FONT_XTINY,"TRAIL RELICS DEV",Graphics.TEXT_JUSTIFY_CENTER);
        dc.drawText(w/2,h/2-20,Graphics.FONT_SMALL,state.quality?state.tile:"GPS --",Graphics.TEXT_JUSTIFY_CENTER);
        dc.drawText(w/2,h/2+10,Graphics.FONT_XTINY,message,Graphics.TEXT_JUSTIFY_CENTER);
        if(h>130){dc.drawText(w/2,h/2+32,Graphics.FONT_XTINY,"Queued "+state.data["events"].size().toString()+" / 64",Graphics.TEXT_JUSTIFY_CENTER);}
    }
}
